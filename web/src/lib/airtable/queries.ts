/**
 * Airtable read/write query layer (BUILD_SPEC §3 `lib/airtable/queries.ts`).
 *
 * As of 2026-05-26 the live base columns on the 7 pre-existing tables
 * (Matters, Contacts, Tasks, Notes, Documents, Legal Elements, PM Inbox)
 * use BUILD_SPEC §2 snake_case names. This module reads/writes through
 * `SPEC_FIELDS` exclusively — `LEGACY_FIELDS` was retired in the same
 * migration. See `scripts/airtable-rename-fields.mjs` for the rename
 * runbook and `docs/constitution/BUILD_SPEC-GAP-AUDIT.md` for the
 * Airtable Meta API limitations that shaped the adaptations.
 */

import {
  airtableCreate,
  airtableFetch,
  airtableGetRecord,
  airtableListAll,
  airtablePatch,
  isDemoMode,
} from "./client";
import { buildDocumentCreateFields } from "./document-create";
import { SPEC_FIELDS as F, TABLES } from "./fields";
import { ASSIGNMENT_TRANSITIONS, buildDeliveredHistory, isValidAssignmentTransition } from "../assignment-transitions";
import { emptyCaseAssessment, parseCaseAssessment, serializeCaseAssessment } from "../case-assessment";
import type {
  AssignmentStatus,
  AssignmentTier,
  CalendarEvent,
  CaseAssessment,
  DocumentRow,
  Contact,
  InboxItem,
  LegalElementRow,
  Matter,
  Note,
  Task,
} from "../types";

export type { InboxItem } from "../types";

type RawFields = Record<string, unknown>;

function escapeFormula(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

/** Filter linked-record fields to a matter (record id + exact matter code). */
function matterLinkFilterFormula(
  linkFieldName: string,
  resolved: { recordId: string; matterId: string },
): string {
  const code = escapeFormula(resolved.matterId);
  const rec = escapeFormula(resolved.recordId);
  const byRecordId = `{${linkFieldName}} = '${rec}'`;
  const byExactCode = `FIND(',' & '${code}' & ',', ',' & ARRAYJOIN({${linkFieldName}}) & ',')`;
  return `OR(${byRecordId}, ${byExactCode})`;
}

function linkedIds(field: unknown): string[] {
  if (!field) return [];
  if (Array.isArray(field)) return field.map(String);
  return [String(field)];
}

function firstString(field: unknown): string {
  if (!field) return "";
  if (Array.isArray(field)) return String(field[0] ?? "");
  return String(field);
}

function mapMatter(rec: { id: string; fields: RawFields }): Matter {
  const f = rec.fields;
  const m = F.matters;
  const title = String(f[m.title] ?? "");
  const matterId = String(f[m.matter_id] ?? rec.id);
  return {
    id: rec.id,
    matterId,
    /**
     * BUILD_SPEC §13.4 forbids surfacing client PII (Tier-0). The legacy
     * `Client Name` column was backed up to data/backups/ and tombstoned
     * in Airtable. The UI now prefers the spec-compliant `title` column
     * (short matter description, no PII); falls back to the matter id.
     */
    clientName: title || matterId,
    title,
    caseType: String(f[m.case_type] ?? ""),
    country: String(f[m.country] ?? ""),
    posture: String(f[m.posture] ?? ""),
    court: String(f[m.court] ?? ""),
    judge: String(f[m.judge] ?? ""),
    status: String(f[m.status] ?? ""),
    proceduralPosture: String(f[m.posture] ?? ""),
    fidelityScore: 0,
    nextDeadline: (f[m.next_deadline] as string) ?? null,
    nextHearing: (f[m.next_hearing] as string) ?? null,
    vulnerabilityFlags: [],
    assignedAttorney: String(f[m.assigned_to] ?? ""),
    summary: String(f[m.summary] ?? ""),
    createdAt: (f[m.created_at] as string) ?? null,
    updatedAt: (f[m.updated_at] as string) ?? null,
  };
}

function mapTask(rec: { id: string; fields: RawFields }, matterId: string): Task {
  const f = rec.fields;
  const t = F.tasks;
  return {
    id: rec.id,
    matterId,
    description: String(f[t.description] ?? ""),
    dueDate: (f[t.due_date] as string) ?? null,
    status: String(f[t.status] ?? "To Do"),
    priority: String(f[t.priority] ?? "Medium"),
    isFilingDeadline: Boolean(f["is_filing_deadline"] ?? false),
    assignedTo: String(f[t.assigned_to] ?? ""),
  };
}

function mapNote(rec: { id: string; fields: RawFields }, matterId: string): Note {
  const f = rec.fields;
  const n = F.notes;
  return {
    id: rec.id,
    matterId,
    author: String(f[n.author] ?? "Unknown"),
    content: String(f[n.content] ?? ""),
    createdAt: String(f[n.created_at] ?? new Date().toISOString()),
    type: String(f[n.type] ?? "Attorney"),
  };
}

function mapLegalElement(rec: { id: string; fields: RawFields }, matterId: string): LegalElementRow {
  const f = rec.fields;
  const le = F.legalElements;
  return {
    id: rec.id,
    matterId,
    element: String(f[le.element_name] ?? ""),
    assessment: String(f[le.assessment] ?? ""),
    keyGap: String(f[le.key_gap] ?? "").slice(0, 240),
    nextAction: String(f[le.next_action] ?? ""),
    supportingFacts: String(f[le.supporting_facts] ?? ""),
    supportingCases: String(f[le.supporting_cases] ?? ""),
  };
}

function mapDocument(rec: { id: string; fields: RawFields }, matterId: string): DocumentRow {
  const f = rec.fields;
  const d = F.documents;
  const title = String(f[d.title] ?? "Untitled");
  const fileType = String(f[d.file_type] ?? "");
  return {
    id: rec.id,
    matterId,
    title,
    category: String(f[d.category] ?? ""),
    uploadedAt: String(f[d.created_at] ?? new Date().toISOString()),
    uploadedBy: String(f[d.uploaded_by] ?? ""),
    ocrStatus: String(f[d.ocr_status] ?? ""),
    piiTier: String(f[d.pii_tier] ?? ""),
    fileType: fileType || inferFileTypeFromTitle(title),
  };
}

function inferFileTypeFromTitle(title: string): string {
  const lower = title.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (/\.(png|jpe?g|gif|webp|tif|tiff)$/.test(lower)) return "image/jpeg";
  if (lower.endsWith(".txt")) return "text/plain";
  return "";
}

export async function listMattersFromAirtable(): Promise<Matter[]> {
  const records = await airtableListAll<RawFields>(TABLES.matters);
  return records.map(mapMatter);
}

export async function getMatterFromAirtable(matterCode: string): Promise<Matter | null> {
  const resolved = await resolveMatterRecordId(matterCode);
  if (!resolved) return null;
  try {
    const rec = await airtableGetRecord<RawFields>(TABLES.matters, resolved.recordId);
    return mapMatter(rec);
  } catch {
    return null;
  }
}

function mapContact(rec: { id: string; fields: RawFields }) {
  const f = rec.fields;
  const c = F.contacts;
  return {
    id: rec.id,
    displayName: String(f[c.display_name] ?? ""),
    role: String(f[c.role] ?? ""),
    email: String(f[c.email] ?? ""),
    phone: String(f[c.phone] ?? ""),
    organization: String(f[c.organization] ?? ""),
    notes: String(f[c.notes] ?? ""),
  };
}

export async function listContactsFromAirtable(): Promise<Contact[]> {
  const records = await airtableListAll<RawFields>(TABLES.contacts);
  return records.map(mapContact);
}

export async function createMatterInAirtable(payload: {
  title: string;
  caseType: string;
  country?: string;
  posture?: string;
  status?: string;
  summary?: string;
}): Promise<Matter> {
  const existing = await listMattersFromAirtable();
  let maxNum = 1000;
  for (const m of existing) {
    const match = m.matterId.match(/^AOD-(\d+)$/i);
    if (match) maxNum = Math.max(maxNum, parseInt(match[1], 10));
  }
  const matterId = `AOD-${maxNum + 1}`;
  const m = F.matters;
  const now = new Date().toISOString();
  const fields: RawFields = {
    [m.matter_id]: matterId,
    [m.title]: payload.title,
    [m.case_type]: payload.caseType,
    [m.status]: payload.status ?? "Open",
    [m.created_at]: now,
    [m.updated_at]: now,
  };
  if (payload.country) fields[m.country] = payload.country;
  if (payload.posture) fields[m.posture] = payload.posture;
  if (payload.summary) fields[m.summary] = payload.summary;
  const rec = await airtableCreate(TABLES.matters, fields);
  return mapMatter(rec);
}

export async function resolveMatterRecordId(
  matterCode: string,
): Promise<{ recordId: string; matterId: string } | null> {
  if (matterCode.startsWith("rec")) {
    try {
      const rec = await airtableGetRecord<RawFields>(TABLES.matters, matterCode);
      return { recordId: rec.id, matterId: String(rec.fields[F.matters.matter_id] ?? matterCode) };
    } catch {
      return { recordId: matterCode, matterId: matterCode };
    }
  }
  const formula = `{${F.matters.matter_id}} = '${escapeFormula(matterCode)}'`;
  const payload = await airtableFetch<{ records: Array<{ id: string; fields: RawFields }> }>(
    TABLES.matters,
    { filterByFormula: formula, maxRecords: "1" },
  );
  const rec = payload.records[0];
  if (!rec) return null;
  return { recordId: rec.id, matterId: String(rec.fields[F.matters.matter_id] ?? matterCode) };
}

export async function listDocumentsFromAirtable(matterCode: string): Promise<DocumentRow[]> {
  const resolved = await resolveMatterRecordId(matterCode);
  if (!resolved) return [];
  const formula = matterLinkFilterFormula(F.documents.matter_id, resolved);
  try {
    const records = await airtableListAll<RawFields>(TABLES.documents, { filterByFormula: formula });
    return records.map((r) => mapDocument(r, resolved.matterId));
  } catch {
    // Legacy rows may only match on a plain matter code text field.
    try {
      const legacy = `{${F.documents.matter_id}} = '${escapeFormula(resolved.matterId)}'`;
      const records = await airtableListAll<RawFields>(TABLES.documents, { filterByFormula: legacy });
      return records.map((r) => mapDocument(r, resolved.matterId));
    } catch {
      return [];
    }
  }
}

/**
 * Read the `assessment_data` JSON blob from Matters (BUILD_SPEC §2).
 * Returns an empty assessment for matters that haven't been triaged yet.
 */
export async function getCaseAssessmentFromAirtable(matterCode: string): Promise<CaseAssessment> {
  const resolved = await resolveMatterRecordId(matterCode);
  if (!resolved) return emptyCaseAssessment(matterCode);
  const formula = `{${F.matters.matter_id}} = '${escapeFormula(resolved.matterId)}'`;
  const payload = await airtableFetch<{ records: Array<{ id: string; fields: RawFields }> }>(
    TABLES.matters,
    { filterByFormula: formula, maxRecords: "1" },
  );
  const rec = payload.records[0];
  if (!rec) return emptyCaseAssessment(matterCode);
  const raw = rec.fields[F.matters.assessment_data];
  return parseCaseAssessment(raw, resolved.matterId);
}

export async function saveCaseAssessmentInAirtable(
  matterCode: string,
  assessment: CaseAssessment,
): Promise<CaseAssessment> {
  const resolved = await resolveMatterRecordId(matterCode);
  if (!resolved) throw new Error(`Matter not found: ${matterCode}`);
  const m = F.matters;
  try {
    await airtablePatch(TABLES.matters, resolved.recordId, {
      [m.assessment_data]: serializeCaseAssessment({ ...assessment, matterId: resolved.matterId }),
      [m.updated_at]: new Date().toISOString(),
    });
  } catch {
    // Field may not yet be provisioned in some environments; swallow so
    // the UI keeps working against the demo store.
  }
  return { ...assessment, matterId: resolved.matterId };
}

export async function updateLegalElementInAirtable(
  elementId: string,
  patch: Partial<Pick<LegalElementRow, "assessment" | "keyGap" | "nextAction">>,
): Promise<LegalElementRow | null> {
  const le = F.legalElements;
  const fields: RawFields = {};
  if (patch.assessment !== undefined) fields[le.assessment] = patch.assessment;
  if (patch.keyGap !== undefined) fields[le.key_gap] = patch.keyGap;
  if (patch.nextAction !== undefined) fields[le.next_action] = patch.nextAction;
  const rec = await airtablePatch(TABLES.legalElements, elementId, fields);
  const matterLinks = linkedIds(rec.fields[le.matter_id]);
  const matterId = matterLinks[0] ?? "";
  return mapLegalElement(rec, matterId);
}

export async function listTasksForMatterFromAirtable(matterCode: string): Promise<Task[]> {
  const resolved = await resolveMatterRecordId(matterCode);
  if (!resolved) return [];
  // Tasks.matter_id is a singleLineText column in the live base, so we
  // match on the visible matter code rather than the rec id.
  const formula = `{${F.tasks.matter_id}} = '${escapeFormula(resolved.matterId)}'`;
  const records = await airtableListAll<RawFields>(TABLES.tasks, { filterByFormula: formula });
  return records.map((r) => mapTask(r, resolved.matterId));
}

export async function listAllTasksFromAirtable(): Promise<Task[]> {
  const records = await airtableListAll<RawFields>(TABLES.tasks);
  return records.map((r) => mapTask(r, firstString(r.fields[F.tasks.matter_id])));
}

export async function createTaskInAirtable(
  matterCode: string,
  payload: Pick<Task, "description" | "dueDate" | "priority" | "isFilingDeadline">,
): Promise<Task> {
  const resolved = await resolveMatterRecordId(matterCode);
  if (!resolved) throw new Error(`Matter not found: ${matterCode}`);
  const t = F.tasks;
  const fields: RawFields = {
    [t.description]: payload.description,
    [t.matter_id]: resolved.matterId,
    [t.status]: "To Do",
    [t.priority]: payload.priority,
  };
  if (payload.dueDate) fields[t.due_date] = payload.dueDate;
  if (payload.isFilingDeadline) fields["is_filing_deadline"] = true;
  const rec = await airtableCreate(TABLES.tasks, fields);
  return mapTask(rec, resolved.matterId);
}

export async function completeTaskInAirtable(
  taskId: string,
  options?: { completionDocs?: string; completionNote?: string; completedBy?: string },
): Promise<Task | null> {
  const now = new Date().toISOString();
  const fields: RawFields = {
    [F.tasks.status]: "Done",
    completed_at: now,
  };
  if (options?.completionDocs) fields.completion_docs = options.completionDocs.slice(0, 500);
  if (options?.completionNote) fields.completion_note = options.completionNote.slice(0, 2000);
  if (options?.completedBy) fields.completed_by = options.completedBy.slice(0, 120);
  const rec = await airtablePatch(TABLES.tasks, taskId, fields);
  return mapTask(rec, firstString(rec.fields[F.tasks.matter_id]));
}

export async function listAllNotesFromAirtable(): Promise<Note[]> {
  const matters = await listMattersFromAirtable();
  const codeByRecord = new Map(matters.map((m) => [m.id, m.matterId]));
  const records = await airtableListAll<RawFields>(TABLES.notes);
  return records.map((rec) => {
    const linked = firstString(rec.fields[F.notes.matter_id]);
    const matterId = codeByRecord.get(linked) ?? linked;
    return mapNote(rec, matterId);
  });
}

export async function listNotesForMatterFromAirtable(matterCode: string): Promise<Note[]> {
  const resolved = await resolveMatterRecordId(matterCode);
  if (!resolved) return [];
  const formula = matterLinkFilterFormula(F.notes.matter_id, resolved);
  const records = await airtableListAll<RawFields>(TABLES.notes, { filterByFormula: formula });
  return records.map((r) => mapNote(r, resolved.matterId));
}

export async function createNoteInAirtable(
  matterCode: string,
  content: string,
  author: string,
  type: string = "Attorney",
): Promise<Note> {
  const resolved = await resolveMatterRecordId(matterCode);
  if (!resolved) throw new Error(`Matter not found: ${matterCode}`);
  const n = F.notes;
  const rec = await airtableCreate(TABLES.notes, {
    [n.content]: content,
    [n.author]: author,
    [n.matter_id]: [resolved.recordId],
    [n.created_at]: new Date().toISOString(),
    [n.type]: type,
  });
  return mapNote(rec, resolved.matterId);
}

export async function updateNoteInAirtable(
  noteId: string,
  matterCode: string,
  content: string,
  author?: string,
): Promise<Note> {
  const resolved = await resolveMatterRecordId(matterCode);
  if (!resolved) throw new Error(`Matter not found: ${matterCode}`);
  const n = F.notes;
  const fields: RawFields = { [n.content]: content.slice(0, 8000) };
  if (author) fields[n.author] = author.slice(0, 120);
  const rec = await airtablePatch(TABLES.notes, noteId, fields);
  return mapNote(rec, resolved.matterId);
}

/** Latest agent work-product note for a matter (PM dispatch persists type Agent). */
export async function findLatestAgentNoteForMatter(matterCode: string): Promise<Note | null> {
  const notes = await listNotesForMatterFromAirtable(matterCode);
  const agentNotes = notes
    .filter((note) => note.type === "Agent")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return agentNotes[0] ?? null;
}

/** Latest structured drafting-facts note (type Facts, JSON body). */
export async function findLatestDraftingFactsNoteForMatter(matterCode: string): Promise<Note | null> {
  const notes = await listNotesForMatterFromAirtable(matterCode);
  const factNotes = notes
    .filter((note) => note.type === "Facts")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return factNotes[0] ?? null;
}

export async function listLegalElementsFromAirtable(matterCode: string): Promise<LegalElementRow[]> {
  const resolved = await resolveMatterRecordId(matterCode);
  if (!resolved) return [];
  // Legal Elements.matter_id is singleLineText (carries the matter code).
  const formula = `{${F.legalElements.matter_id}} = '${escapeFormula(resolved.matterId)}'`;
  const records = await airtableListAll<RawFields>(TABLES.legalElements, {
    filterByFormula: formula,
  });
  return records.map((r) => mapLegalElement(r, resolved.matterId));
}

export async function createLegalElementInAirtable(
  matterCode: string,
  elementName: string,
): Promise<LegalElementRow> {
  const resolved = await resolveMatterRecordId(matterCode);
  if (!resolved) throw new Error(`Matter not found: ${matterCode}`);
  const le = F.legalElements;
  const rec = await airtableCreate(TABLES.legalElements, {
    [le.element_name]: elementName.trim(),
    [le.matter_id]: resolved.matterId,
    [le.assessment]: "Not assessed",
  });
  return mapLegalElement(rec, resolved.matterId);
}

export async function updateMatterDeadlineInAirtable(
  matterCode: string,
  nextDeadline: string | null,
): Promise<Matter | null> {
  const resolved = await resolveMatterRecordId(matterCode);
  if (!resolved) return null;
  const rec = await airtablePatch(TABLES.matters, resolved.recordId, {
    [F.matters.next_deadline]: nextDeadline,
    [F.matters.updated_at]: new Date().toISOString(),
  });
  return mapMatter(rec);
}

export async function updateMatterInAirtable(
  matterCode: string,
  patch: Partial<
    Pick<
      Matter,
      | "title"
      | "caseType"
      | "country"
      | "posture"
      | "court"
      | "judge"
      | "status"
      | "summary"
      | "nextDeadline"
      | "nextHearing"
      | "assignedAttorney"
    >
  >,
): Promise<Matter | null> {
  const resolved = await resolveMatterRecordId(matterCode);
  if (!resolved) return null;
  const m = F.matters;
  const fields: RawFields = { [m.updated_at]: new Date().toISOString() };
  if (patch.title !== undefined) fields[m.title] = patch.title;
  if (patch.caseType !== undefined) fields[m.case_type] = patch.caseType;
  if (patch.country !== undefined) fields[m.country] = patch.country;
  if (patch.posture !== undefined) fields[m.posture] = patch.posture;
  if (patch.court !== undefined) fields[m.court] = patch.court;
  if (patch.judge !== undefined) fields[m.judge] = patch.judge;
  if (patch.status !== undefined) fields[m.status] = patch.status;
  if (patch.summary !== undefined) fields[m.summary] = patch.summary;
  if (patch.nextDeadline !== undefined) fields[m.next_deadline] = patch.nextDeadline;
  if (patch.nextHearing !== undefined) fields[m.next_hearing] = patch.nextHearing;
  if (patch.assignedAttorney !== undefined) fields[m.assigned_to] = patch.assignedAttorney;
  const rec = await airtablePatch(TABLES.matters, resolved.recordId, fields);
  return mapMatter(rec);
}

/* ------------------------------------------------------------------ */
/* PM Inbox (BUILD_SPEC §7.5)                                          */
/* ------------------------------------------------------------------ */

const DEFAULT_INBOX_BUTTONS = ["Approve", "Reject", "Modify", "Defer"];

/**
 * PM Inbox `options` is a multilineText column shared by two item kinds:
 *   - agent_flag items store an actions/next_steps JSON blob (legacy shape).
 *   - assignment items additionally carry deliverableType/tier/facts/priority/
 *     dueDate/history so the Airtable schema does not need new columns.
 */
type ParsedInboxOptions = {
  buttons: string[];
  followUpSteps: string[];
  kind: "assignment" | "agent_flag";
  deliverableType?: string;
  tier?: AssignmentTier;
  facts?: string;
  priority?: string;
  dueDate?: string | null;
  sampleDiscountEligible?: boolean;
  discountApplied?: boolean;
  paymentStatus?: "pending" | "paid" | "invoice";
  stripeSessionId?: string;
  amountCents?: number;
  deliverableCatalogId?: string;
  conflictReviewRequired?: boolean;
  opposingParty?: string;
  opposingCounsel?: string;
  deliveredAt?: string;
  history?: Array<{ status: string; note?: string; at: string; by?: string }>;
};

function parsePmInboxOptions(raw: unknown): ParsedInboxOptions {
  function fromDelimited(source: string): string[] {
    return source
      .split(/[\n;|,]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  const fallback: ParsedInboxOptions = {
    buttons: [...DEFAULT_INBOX_BUTTONS],
    followUpSteps: [],
    kind: "agent_flag",
  };

  if (!raw) return fallback;

  if (typeof raw === "object" && raw !== null && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    const nextRaw = o.next_steps ?? o.suggested_next_steps ?? o.nextSteps;
    const followUpSteps = Array.isArray(nextRaw) ? nextRaw.map(String).filter(Boolean) : [];
    let buttons: string[] = [];
    if (Array.isArray(o.actions)) buttons = o.actions.map(String).filter(Boolean);
    else if (Array.isArray(o.buttons)) buttons = o.buttons.map(String).filter(Boolean);
    else if (Array.isArray(o.options)) buttons = o.options.map(String).filter(Boolean);
    const history = Array.isArray(o.history)
      ? (o.history as Array<Record<string, unknown>>)
          .map((h) => ({
            status: String(h.status ?? ""),
            note: h.note ? String(h.note) : undefined,
            at: String(h.at ?? ""),
            by: h.by ? String(h.by) : undefined,
          }))
          .filter((h) => h.status)
      : undefined;
    return {
      buttons: buttons.length ? buttons : [...DEFAULT_INBOX_BUTTONS],
      followUpSteps,
      kind: o.kind === "assignment" ? "assignment" : "agent_flag",
      deliverableType: o.deliverableType ? String(o.deliverableType) : undefined,
      tier: o.tier === "Template" || o.tier === "Custom" || o.tier === "Research" ? o.tier : undefined,
      facts: o.facts ? String(o.facts) : undefined,
      priority: o.priority ? String(o.priority) : undefined,
      dueDate: o.dueDate ? String(o.dueDate) : null,
      sampleDiscountEligible: Boolean(o.sampleDiscountEligible),
      discountApplied: Boolean(o.discountApplied),
      paymentStatus:
        o.paymentStatus === "pending" || o.paymentStatus === "paid" || o.paymentStatus === "invoice"
          ? o.paymentStatus
          : undefined,
      stripeSessionId: o.stripeSessionId ? String(o.stripeSessionId) : undefined,
      amountCents: typeof o.amountCents === "number" ? o.amountCents : undefined,
      deliverableCatalogId: o.deliverableCatalogId ? String(o.deliverableCatalogId) : undefined,
      conflictReviewRequired: Boolean(o.conflictReviewRequired),
      opposingParty: o.opposingParty ? String(o.opposingParty) : undefined,
      opposingCounsel: o.opposingCounsel ? String(o.opposingCounsel) : undefined,
      deliveredAt: o.deliveredAt ? String(o.deliveredAt) : undefined,
      history,
    };
  }

  if (Array.isArray(raw)) {
    const buttons = raw.map(String).filter(Boolean);
    return { ...fallback, buttons: buttons.length ? buttons : [...DEFAULT_INBOX_BUTTONS] };
  }

  const text = String(raw).trim();
  if (!text) return fallback;

  if (text.startsWith("{")) {
    try {
      const o = JSON.parse(text);
      return parsePmInboxOptions(o);
    } catch {
      /* fallthrough */
    }
  }

  if (text.startsWith("[")) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) return parsePmInboxOptions(parsed);
    } catch {
      /* fallthrough */
    }
  }

  const split = fromDelimited(text);
  return { ...fallback, buttons: split.length ? split : [...DEFAULT_INBOX_BUTTONS] };
}

function mapInbox(rec: { id: string; fields: RawFields }): InboxItem {
  const f = rec.fields;
  const i = F.pmInbox;
  const parsed = parsePmInboxOptions(f[i.options]);
  return {
    id: rec.id,
    title: String(f[i.title] ?? ""),
    matterId: firstString(f[i.matter_id]),
    agent: firstString(f[i.agent]),
    whatTried: String(f[i.what_tried] ?? ""),
    whatNeeded: String(f[i.what_needed] ?? ""),
    options: parsed.buttons,
    followUpSteps: parsed.followUpSteps,
    status: String(f[i.status] ?? "Pending"),
    resolution: String(f[i.resolution] ?? ""),
    createdAt: String(f[i.created_at] ?? ""),
    resolvedAt: (f[i.resolved_at] as string | undefined) ?? null,
    kind: parsed.kind,
    deliverableType: parsed.deliverableType,
    tier: parsed.tier,
    facts: parsed.facts,
    priority: parsed.priority,
    dueDate: parsed.dueDate,
    sampleDiscountEligible: parsed.sampleDiscountEligible,
    discountApplied: parsed.discountApplied,
    paymentStatus: parsed.paymentStatus,
    stripeSessionId: parsed.stripeSessionId,
    amountCents: parsed.amountCents,
    deliverableCatalogId: parsed.deliverableCatalogId,
    conflictReviewRequired: parsed.conflictReviewRequired,
    opposingParty: parsed.opposingParty,
    opposingCounsel: parsed.opposingCounsel,
    deliveredAt: parsed.deliveredAt,
    history: parsed.history,
  };
}

export async function listInboxItemsFromAirtable(): Promise<InboxItem[]> {
  const records = await airtableListAll<RawFields>(TABLES.pmInbox);
  return records.map(mapInbox).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

/** Statuses that still require attorney attention, across both inbox kinds. */
const OPEN_STATUSES = new Set(["Pending", "Submitted", "In progress", "Ready for review", "Returned"]);

export async function countUnreadInboxFromAirtable(): Promise<number> {
  const all = await listInboxItemsFromAirtable();
  return all.filter((item) => OPEN_STATUSES.has(item.status)).length;
}

export async function resolveInboxItemInAirtable(
  recordId: string,
  resolution: string,
  status: "Resolved" | "Dismissed" = "Resolved",
): Promise<InboxItem> {
  const i = F.pmInbox;
  const rec = await airtablePatch(TABLES.pmInbox, recordId, {
    [i.status]: status,
    [i.resolution]: resolution,
    [i.resolved_at]: new Date().toISOString(),
  });
  return mapInbox(rec);
}

/* ------------------------------------------------------------------ */
/* Assignment intake + review workflow (marketplace build pass)        */
/* ------------------------------------------------------------------ */

function serializeAssignmentOptions(payload: {
  deliverableType: string;
  tier: AssignmentTier;
  facts: string;
  priority?: string;
  dueDate?: string | null;
  sampleDiscountEligible?: boolean;
  discountApplied?: boolean;
  paymentStatus?: "pending" | "paid" | "invoice";
  stripeSessionId?: string;
  amountCents?: number;
  deliverableCatalogId?: string;
  conflictReviewRequired?: boolean;
  opposingParty?: string;
  opposingCounsel?: string;
  deliveredAt?: string;
  history: Array<{ status: string; note?: string; at: string; by?: string }>;
}): string {
  return JSON.stringify({
    kind: "assignment",
    deliverableType: payload.deliverableType,
    tier: payload.tier,
    facts: payload.facts,
    priority: payload.priority ?? "Medium",
    dueDate: payload.dueDate ?? null,
    sampleDiscountEligible: payload.sampleDiscountEligible ?? false,
    discountApplied: payload.discountApplied ?? false,
    paymentStatus: payload.paymentStatus,
    stripeSessionId: payload.stripeSessionId,
    amountCents: payload.amountCents,
    deliverableCatalogId: payload.deliverableCatalogId,
    conflictReviewRequired: payload.conflictReviewRequired ?? false,
    opposingParty: payload.opposingParty,
    opposingCounsel: payload.opposingCounsel,
    deliveredAt: payload.deliveredAt,
    history: payload.history,
  });
}

function assignmentOptionsFromItem(item: InboxItem, history: InboxItem["history"]) {
  return {
    deliverableType: item.deliverableType ?? "",
    tier: item.tier ?? "Custom",
    facts: item.facts ?? item.whatNeeded,
    priority: item.priority,
    dueDate: item.dueDate,
    sampleDiscountEligible: item.sampleDiscountEligible,
    discountApplied: item.discountApplied,
    paymentStatus: item.paymentStatus,
    stripeSessionId: item.stripeSessionId,
    amountCents: item.amountCents,
    deliverableCatalogId: item.deliverableCatalogId,
    conflictReviewRequired: item.conflictReviewRequired,
    opposingParty: item.opposingParty,
    opposingCounsel: item.opposingCounsel,
    deliveredAt: item.deliveredAt,
    history: history ?? [],
  };
}

export async function createAssignmentInAirtable(payload: {
  matterCode: string;
  deliverableType: string;
  tier: AssignmentTier;
  facts: string;
  priority?: string;
  dueDate?: string | null;
  submittedBy?: string;
  sampleDiscountEligible?: boolean;
  discountApplied?: boolean;
  paymentStatus?: "pending" | "paid" | "invoice";
  stripeSessionId?: string;
  amountCents?: number;
  deliverableCatalogId?: string;
  conflictReviewRequired?: boolean;
  opposingParty?: string;
  opposingCounsel?: string;
}): Promise<InboxItem> {
  const resolved = await resolveMatterRecordId(payload.matterCode);
  if (!resolved) throw new Error(`Matter not found: ${payload.matterCode}`);
  const i = F.pmInbox;
  const now = new Date().toISOString();
  const history = [
    {
      status: "Submitted",
      note: "Assignment submitted via intake form.",
      at: now,
      by: payload.submittedBy ?? "Attorney",
    },
  ];
  const fields: RawFields = {
    [i.title]: `${payload.deliverableType} \u2014 ${payload.tier} tier`,
    [i.matter_id]: resolved.matterId,
    [i.agent]: "PM Orchestrator",
    [i.what_tried]: "Assignment submitted via intake form. Awaiting PM pickup.",
    [i.what_needed]: payload.facts.slice(0, 4000),
    [i.options]: serializeAssignmentOptions({
      deliverableType: payload.deliverableType,
      tier: payload.tier,
      facts: payload.facts,
      priority: payload.priority,
      dueDate: payload.dueDate,
      sampleDiscountEligible: payload.sampleDiscountEligible,
      discountApplied: payload.discountApplied,
      paymentStatus: payload.paymentStatus,
      stripeSessionId: payload.stripeSessionId,
      amountCents: payload.amountCents,
      deliverableCatalogId: payload.deliverableCatalogId,
      conflictReviewRequired: payload.conflictReviewRequired,
      opposingParty: payload.opposingParty,
      opposingCounsel: payload.opposingCounsel,
      history,
    }),
    [i.status]: "Submitted",
    [i.created_at]: now,
  };
  const rec = await airtableCreate(TABLES.pmInbox, fields);
  return mapInbox(rec);
}

const ASSIGNMENT_TRANSITIONS_EXPORT = ASSIGNMENT_TRANSITIONS;

export { isValidAssignmentTransition, ASSIGNMENT_TRANSITIONS_EXPORT as ASSIGNMENT_TRANSITIONS };

export async function updateAssignmentStatusInAirtable(
  recordId: string,
  nextStatus: AssignmentStatus,
  options?: { note?: string; by?: string },
): Promise<InboxItem> {
  const existing = await airtableGetRecord<RawFields>(TABLES.pmInbox, recordId);
  const current = mapInbox(existing);
  if (!isValidAssignmentTransition(current.status, nextStatus)) {
    throw new Error(`Cannot move assignment from "${current.status}" to "${nextStatus}"`);
  }
  const i = F.pmInbox;
  const now = new Date().toISOString();
  const history = [
    ...(current.history ?? []),
    { status: nextStatus, note: options?.note?.trim() || undefined, at: now, by: options?.by ?? "Attorney" },
  ];
  const fields: RawFields = {
    [i.status]: nextStatus,
    [i.options]: serializeAssignmentOptions(assignmentOptionsFromItem(current, history)),
  };
  if (options?.note?.trim()) fields[i.resolution] = options.note.trim();
  if (nextStatus === "Approved" || nextStatus === "Returned") fields[i.resolved_at] = now;
  const rec = await airtablePatch(TABLES.pmInbox, recordId, fields);
  return mapInbox(rec);
}

/** Record export/download on an approved assignment (stage → Delivered). */
export async function markAssignmentDeliveredInAirtable(
  recordId: string,
  options?: { exportKind?: string; by?: string },
): Promise<InboxItem | null> {
  const existing = await airtableGetRecord<RawFields>(TABLES.pmInbox, recordId);
  const current = mapInbox(existing);
  if (current.kind !== "assignment" || current.status !== "Approved") return null;
  if (current.deliveredAt) return current;

  const { deliveredAt, history } = buildDeliveredHistory(current, options);
  const i = F.pmInbox;
  const fields: RawFields = {
    [i.options]: serializeAssignmentOptions({
      ...assignmentOptionsFromItem(current, history),
      deliveredAt,
    }),
  };
  const rec = await airtablePatch(TABLES.pmInbox, recordId, fields);
  return mapInbox(rec);
}

export async function getInboxItemByIdFromAirtable(recordId: string): Promise<InboxItem | null> {
  try {
    const rec = await airtableGetRecord<RawFields>(TABLES.pmInbox, recordId);
    return mapInbox(rec);
  } catch {
    return null;
  }
}

export async function updateAssignmentPaymentInAirtable(
  recordId: string,
  patch: {
    paymentStatus?: "pending" | "paid" | "invoice";
    stripeSessionId?: string;
    amountCents?: number;
  },
): Promise<InboxItem | null> {
  const existing = await airtableGetRecord<RawFields>(TABLES.pmInbox, recordId);
  const current = mapInbox(existing);
  if (current.kind !== "assignment") return null;

  const i = F.pmInbox;
  const now = new Date().toISOString();
  const paymentStatus = patch.paymentStatus ?? current.paymentStatus;
  const stripeSessionId = patch.stripeSessionId ?? current.stripeSessionId;
  const amountCents = patch.amountCents ?? current.amountCents;

  const history =
    patch.paymentStatus === "paid" && current.paymentStatus !== "paid"
      ? [
          ...(current.history ?? []),
          {
            status: "Payment received",
            note: stripeSessionId ? `Stripe session ${stripeSessionId}` : "Checkout completed.",
            at: now,
            by: "Stripe",
          },
        ]
      : (current.history ?? []);

  const fields: RawFields = {
    [i.options]: serializeAssignmentOptions({
      ...assignmentOptionsFromItem(current, history),
      paymentStatus,
      stripeSessionId,
      amountCents,
    }),
  };
  if (patch.paymentStatus === "paid") {
    fields[i.what_tried] = "Payment received. PM dispatch started.";
  }

  const rec = await airtablePatch(TABLES.pmInbox, recordId, fields);
  return mapInbox(rec);
}

/* ------------------------------------------------------------------ */
/* Events (BUILD_SPEC §7 Calendar)                                     */
/* ------------------------------------------------------------------ */

function mapEvent(rec: { id: string; fields: RawFields }, matterCode = ""): CalendarEvent {
  const f = rec.fields;
  const e = F.events;
  const matterLink = linkedIds(f[e.matter_id])[0] ?? "";
  return {
    id: rec.id,
    matterId: matterCode || matterLink,
    type: String(f[e.type] ?? ""),
    date: String(f[e.date] ?? ""),
    description: String(f[e.summary] ?? f[e.description] ?? ""),
  };
}

export async function listEventsForMatterFromAirtable(matterCode: string): Promise<
  Array<
    CalendarEvent & {
      time: string;
      location: string;
      longDescription: string;
      calendarSynced: boolean;
    }
  >
> {
  const resolved = await resolveMatterRecordId(matterCode);
  if (!resolved) return [];
  const formula = matterLinkFilterFormula(F.events.matter_id, resolved);
  const records = await airtableListAll<RawFields>(TABLES.events, { filterByFormula: formula });
  return records.map((r) => ({
    ...mapEvent(r, resolved.matterId),
    time: String(r.fields[F.events.time] ?? ""),
    location: String(r.fields[F.events.location] ?? ""),
    longDescription: String(r.fields[F.events.description] ?? ""),
    calendarSynced: Boolean(r.fields[F.events.calendar_synced] ?? false),
  }));
}

export async function listEventsFromAirtable(): Promise<
  Array<
    CalendarEvent & {
      time: string;
      location: string;
      longDescription: string;
      calendarSynced: boolean;
    }
  >
> {
  const matters = await listMattersFromAirtable();
  const codeByRecord = new Map(matters.map((m) => [m.id, m.matterId]));
  const records = await airtableListAll<RawFields>(TABLES.events);
  return records.map((r) => {
    const linked = linkedIds(r.fields[F.events.matter_id])[0] ?? "";
    const matterCode = codeByRecord.get(linked) ?? linked;
    return {
    ...mapEvent(r, matterCode),
    time: String(r.fields[F.events.time] ?? ""),
    location: String(r.fields[F.events.location] ?? ""),
    longDescription: String(r.fields[F.events.description] ?? ""),
    calendarSynced: Boolean(r.fields[F.events.calendar_synced] ?? false),
  };
  });
}

export async function createEventInAirtable(payload: {
  summary: string;
  matterCode?: string;
  type: string;
  date: string;
  time?: string;
  description?: string;
  location?: string;
}) {
  const e = F.events;
  const fields: RawFields = {
    [e.summary]: payload.summary,
    [e.type]: payload.type,
    [e.date]: payload.date,
    [e.created_at]: new Date().toISOString(),
  };
  if (payload.time) fields[e.time] = payload.time;
  if (payload.description) fields[e.description] = payload.description;
  if (payload.location) fields[e.location] = payload.location;
  if (payload.matterCode) {
    const resolved = await resolveMatterRecordId(payload.matterCode);
    if (resolved) fields[e.matter_id] = [resolved.recordId];
  }
  const rec = await airtableCreate(TABLES.events, fields);
  return mapEvent(rec, payload.matterCode ?? "");
}

/* ------------------------------------------------------------------ */
/* People (BUILD_SPEC §7.7 Settings)                                   */
/* ------------------------------------------------------------------ */

export type PersonRow = {
  id: string;
  name: string;
  role: string;
  email: string;
  isActive: boolean;
};

export async function listPeopleFromAirtable(): Promise<PersonRow[]> {
  const records = await airtableListAll<RawFields>(TABLES.people);
  return records.map((rec) => {
    const f = rec.fields;
    return {
      id: rec.id,
      name: String(f[F.people.name] ?? ""),
      role: String(f[F.people.role] ?? ""),
      email: String(f[F.people.email] ?? ""),
      isActive: Boolean(f[F.people.is_active] ?? false),
    };
  });
}

/* ------------------------------------------------------------------ */
/* Strategy Patterns / skills (BUILD_SPEC §10)                         */
/* ------------------------------------------------------------------ */

export async function createStrategyPatternInAirtable(payload: {
  name: string;
  description?: string;
  trigger?: string;
  body: string;
  agent?: string;
  matterCode?: string;
  correctionNote?: string;
  category?: string;
}) {
  const sp = F.strategyPatterns;
  const detailParts = [payload.description?.trim(), payload.trigger?.trim()].filter(Boolean);
  const categoryTag = payload.category ? `[${payload.category}] ` : "";
  const fields: RawFields = {
    [sp.fact_pattern]: `${categoryTag}${payload.name}`.slice(0, 240) || "Custom skill",
    [sp.fact_pattern_detail]: detailParts.join("\n\n").slice(0, 4000) || payload.body.slice(0, 4000),
    [sp.strategy_used]: (payload.agent ?? payload.category ?? "attorney-skill").slice(0, 240),
    [sp.outcome]: payload.body.slice(0, 4000),
    [sp.created_at]: new Date().toISOString(),
  };
  if (payload.correctionNote) {
    fields[sp.correction_note] = payload.correctionNote.slice(0, 2000);
  }
  if (payload.matterCode) {
    fields[sp.matching_matters] = payload.matterCode.slice(0, 240);
  }
  return airtableCreate(TABLES.strategyPatterns, fields);
}

/* ------------------------------------------------------------------ */
/* Corrections (BUILD_SPEC §10)                                        */
/* ------------------------------------------------------------------ */

export async function createCorrectionInAirtable(payload: {
  agent: string;
  matterCode?: string;
  originalOutput: string;
  attorneyEdit: string;
  correctionType:
    | "Factual"
    | "Classification"
    | "Convention"
    | "Analytical"
    | "False Positive"
    | "False Negative";
  reason: string;
  appliedTo: "firm-rules.md" | "Strategy Patterns" | "categorizer-examples.jsonl" | "Notes only";
}) {
  const c = F.corrections;
  const fields: RawFields = {
    [c.agent]: payload.agent,
    [c.original_output]: payload.originalOutput,
    [c.attorney_edit]: payload.attorneyEdit,
    [c.correction_type]: payload.correctionType,
    [c.reason]: payload.reason,
    [c.applied_to]: payload.appliedTo,
    [c.created_at]: new Date().toISOString(),
  };
  if (payload.matterCode) {
    const resolved = await resolveMatterRecordId(payload.matterCode);
    if (resolved) fields[c.matter_id] = [resolved.recordId];
  }
  return airtableCreate(TABLES.corrections, fields);
}

/* ------------------------------------------------------------------ */
/* PM Inbox writers (BUILD_SPEC §10)                                   */
/* ------------------------------------------------------------------ */

export async function createInboxItemInAirtable(payload: {
  title: string;
  matterCode?: string;
  agent: string;
  whatTried: string;
  whatNeeded: string;
  options?: string[];
}): Promise<InboxItem> {
  const i = F.pmInbox;
  const fields: RawFields = {
    [i.title]: payload.title,
    [i.agent]: payload.agent,
    [i.what_tried]: payload.whatTried,
    [i.what_needed]: payload.whatNeeded,
    [i.options]: JSON.stringify(payload.options ?? []),
    [i.status]: "Pending",
    [i.created_at]: new Date().toISOString(),
  };
  if (payload.matterCode) fields[i.matter_id] = payload.matterCode;
  const rec = await airtableCreate(TABLES.pmInbox, fields);
  return mapInbox(rec);
}

export async function listAssessmentTemplatesFromAirtable(): Promise<DocumentRow[]> {
  const d = F.documents;
  const formula = `FIND('assessment_template', {${d.category}})`;
  try {
    const records = await airtableListAll<RawFields>(TABLES.documents, { filterByFormula: formula });
    return records.map((r) => mapDocument(r, "FIRM-TEMPLATES"));
  } catch {
    return [];
  }
}

export async function listFirmSampleDocumentsFromAirtable(): Promise<DocumentRow[]> {
  const d = F.documents;
  const formula = `FIND('firm_sample', {${d.category}})`;
  try {
    const records = await airtableListAll<RawFields>(TABLES.documents, { filterByFormula: formula });
    return records.map((r) => mapDocument(r, "FIRM-TEMPLATES"));
  } catch {
    return [];
  }
}

export async function countFirmMemoryPatternsFromAirtable(): Promise<number> {
  const sp = F.strategyPatterns;
  const formula = `OR({${sp.strategy_used}} = 'firm_memory', FIND('firm_memory', {${sp.fact_pattern}}))`;
  try {
    const records = await airtableListAll<RawFields>(TABLES.strategyPatterns, { filterByFormula: formula });
    return records.length;
  } catch {
    return 0;
  }
}

export async function registerAssessmentDocumentInAirtable(
  matterCode: string,
  payload: { title: string; category: string; airtableDocumentId?: string },
): Promise<DocumentRow> {
  const resolved = await resolveMatterRecordId(matterCode);
  const d = F.documents;
  if (payload.airtableDocumentId) {
    await airtablePatch(TABLES.documents, payload.airtableDocumentId, {
      [d.category]: payload.category,
      [d.title]: payload.title.slice(0, 240),
    });
    return {
      id: payload.airtableDocumentId,
      matterId: resolved?.matterId ?? matterCode,
      title: payload.title,
      category: payload.category,
      uploadedAt: new Date().toISOString(),
    };
  }
  const fields: RawFields = buildDocumentCreateFields({
    title: payload.title,
    category: payload.category,
    uploadedBy: "Attorney",
    matterRecordId: resolved?.recordId,
  }) as RawFields;
  const rec = await airtableCreate(TABLES.documents, fields);
  return mapDocument(rec, resolved?.matterId ?? matterCode);
}

export async function findLatestAssessmentOcrNoteForMatter(matterCode: string): Promise<Note | null> {
  const notes = await listNotesForMatterFromAirtable(matterCode);
  const matches = notes
    .filter((n) => n.type === "Assessment Document")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return matches[0] ?? null;
}

export { isDemoMode };
