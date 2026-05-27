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
  useDemoMode,
} from "./client";
import { SPEC_FIELDS as F, TABLES } from "./fields";
import { emptyCaseAssessment, parseCaseAssessment, serializeCaseAssessment } from "../case-assessment";
import type {
  CalendarEvent,
  CaseAssessment,
  DocumentRow,
  LegalElementRow,
  Matter,
  Note,
  Task,
} from "../types";

type RawFields = Record<string, unknown>;

function escapeFormula(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
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
  return {
    id: rec.id,
    matterId: String(f[m.matter_id] ?? rec.id),
    /**
     * BUILD_SPEC §13.4 forbids surfacing client PII (Tier-0). The legacy
     * `Client Name` column was backed up to data/backups/ and tombstoned
     * in Airtable. The UI displays the matter id wherever the legacy
     * client name used to appear.
     */
    clientName: String(f[m.matter_id] ?? rec.id),
    caseType: String(f[m.case_type] ?? ""),
    status: String(f[m.status] ?? ""),
    proceduralPosture: "",
    fidelityScore: 0,
    nextDeadline: (f[m.next_deadline] as string) ?? null,
    vulnerabilityFlags: [],
    assignedAttorney: String(f[m.assigned_to] ?? ""),
    summary: String(f[m.summary] ?? ""),
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
  };
}

function mapDocument(rec: { id: string; fields: RawFields }, matterId: string): DocumentRow {
  const f = rec.fields;
  const d = F.documents;
  return {
    id: rec.id,
    matterId,
    title: String(f[d.title] ?? "Untitled"),
    category: String(f[d.category] ?? ""),
    uploadedAt: String(f[d.created_at] ?? new Date().toISOString()),
  };
}

export async function listMattersFromAirtable(): Promise<Matter[]> {
  const records = await airtableListAll<RawFields>(TABLES.matters);
  return records.map(mapMatter);
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
  const formula = `FIND('${escapeFormula(resolved.recordId)}', ARRAYJOIN({${F.documents.matter_id}}))`;
  try {
    const records = await airtableListAll<RawFields>(TABLES.documents, { filterByFormula: formula });
    return records.map((r) => mapDocument(r, resolved.matterId));
  } catch {
    return [];
  }
}

/**
 * The BUILD_SPEC `assessment_data` column on Matters is not yet present
 * in the live base (planned migration). Until then we treat case assessments
 * as a write-only field: reads return the empty assessment, writes are
 * no-ops in Airtable mode and persist only in demo mode. See gap audit §7.3.1.
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
  const raw = rec.fields["assessment_data"];
  return parseCaseAssessment(raw, resolved.matterId);
}

export async function saveCaseAssessmentInAirtable(
  matterCode: string,
  assessment: CaseAssessment,
): Promise<CaseAssessment> {
  const resolved = await resolveMatterRecordId(matterCode);
  if (!resolved) throw new Error(`Matter not found: ${matterCode}`);
  try {
    await airtablePatch(TABLES.matters, resolved.recordId, {
      assessment_data: serializeCaseAssessment({ ...assessment, matterId: resolved.matterId }),
    });
  } catch {
    /**
     * assessment_data column is not yet provisioned on the live Matters
     * table. Swallow the 422 so the UI can continue to use the demo store
     * path for assessment persistence until the column is added.
     */
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

export async function completeTaskInAirtable(taskId: string): Promise<Task | null> {
  const rec = await airtablePatch(TABLES.tasks, taskId, { [F.tasks.status]: "Done" });
  return mapTask(rec, firstString(rec.fields[F.tasks.matter_id]));
}

export async function listNotesForMatterFromAirtable(matterCode: string): Promise<Note[]> {
  const resolved = await resolveMatterRecordId(matterCode);
  if (!resolved) return [];
  const formula = `FIND('${escapeFormula(resolved.recordId)}', ARRAYJOIN({${F.notes.matter_id}}))`;
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

export async function updateMatterDeadlineInAirtable(
  matterCode: string,
  nextDeadline: string | null,
): Promise<Matter | null> {
  const resolved = await resolveMatterRecordId(matterCode);
  if (!resolved) return null;
  const rec = await airtablePatch(TABLES.matters, resolved.recordId, {
    [F.matters.next_deadline]: nextDeadline,
  });
  return mapMatter(rec);
}

/* ------------------------------------------------------------------ */
/* PM Inbox (BUILD_SPEC §7.5)                                          */
/* ------------------------------------------------------------------ */

export type InboxItem = {
  id: string;
  title: string;
  matterId: string;
  agent: string;
  whatTried: string;
  whatNeeded: string;
  options: string[];
  status: "Pending" | "Resolved" | "Dismissed" | string;
  resolution: string;
  createdAt: string;
  resolvedAt: string | null;
};

function parseOptions(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String);
  const text = String(raw).trim();
  if (!text) return [];
  if (text.startsWith("[")) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      // fall through to delimiter parsing
    }
  }
  return text
    .split(/[\n;|,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function mapInbox(rec: { id: string; fields: RawFields }): InboxItem {
  const f = rec.fields;
  const i = F.pmInbox;
  return {
    id: rec.id,
    title: String(f[i.title] ?? ""),
    matterId: firstString(f[i.matter_id]),
    agent: firstString(f[i.agent]),
    whatTried: String(f[i.what_tried] ?? ""),
    whatNeeded: String(f[i.what_needed] ?? ""),
    options: parseOptions(f[i.options]),
    status: String(f[i.status] ?? "Pending"),
    resolution: String(f[i.resolution] ?? ""),
    createdAt: String(f[i.created_at] ?? ""),
    resolvedAt: (f[i.resolved_at] as string | undefined) ?? null,
  };
}

export async function listInboxItemsFromAirtable(): Promise<InboxItem[]> {
  const records = await airtableListAll<RawFields>(TABLES.pmInbox);
  return records.map(mapInbox).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function countUnreadInboxFromAirtable(): Promise<number> {
  const all = await listInboxItemsFromAirtable();
  return all.filter((item) => item.status === "Pending").length;
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
/* Events (BUILD_SPEC §7 Calendar)                                     */
/* ------------------------------------------------------------------ */

function mapEvent(rec: { id: string; fields: RawFields }): CalendarEvent {
  const f = rec.fields;
  const e = F.events;
  const matterLink = linkedIds(f[e.matter_id])[0] ?? "";
  return {
    id: rec.id,
    matterId: matterLink,
    type: String(f[e.type] ?? ""),
    date: String(f[e.date] ?? ""),
    description: String(f[e.summary] ?? f[e.description] ?? ""),
  };
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
  const records = await airtableListAll<RawFields>(TABLES.events);
  return records.map((r) => ({
    ...mapEvent(r),
    time: String(r.fields[F.events.time] ?? ""),
    location: String(r.fields[F.events.location] ?? ""),
    longDescription: String(r.fields[F.events.description] ?? ""),
    calendarSynced: Boolean(r.fields[F.events.calendar_synced] ?? false),
  }));
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
  return mapEvent(rec);
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

export { useDemoMode };
