import {
  airtableCreate,
  airtableFetch,
  airtableGetRecord,
  airtableListAll,
  airtablePatch,
  useDemoMode,
} from "./airtable-client";
import { FIELDS } from "./airtable-fields";
import { emptyCaseAssessment, parseCaseAssessment, serializeCaseAssessment } from "./case-assessment";
import type { CaseAssessment, DocumentRow, LegalElementRow, Matter, Note, Task } from "./types";

type RawFields = Record<string, unknown>;

function escapeFormula(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function linkedIds(field: unknown): string[] {
  if (!field) return [];
  if (Array.isArray(field)) return field.map(String);
  return [String(field)];
}

function mapMatter(rec: { id: string; fields: RawFields }): Matter {
  const f = rec.fields;
  const m = FIELDS.matters;
  return {
    id: rec.id,
    matterId: String(f[m.matterId] ?? rec.id),
    clientName: String(f[m.clientName] ?? "Unknown"),
    caseType: String(f[m.caseType] ?? ""),
    status: String(f[m.status] ?? ""),
    proceduralPosture: String(f[m.proceduralPosture] ?? ""),
    fidelityScore: Number(f[m.fidelityScore] ?? 0),
    nextDeadline: (f[m.nextDeadline] as string) ?? null,
    vulnerabilityFlags: (f[m.vulnerabilityFlags] as string[]) ?? [],
    assignedAttorney: String(f[m.assignedAttorney] ?? ""),
    summary: String(f[m.summary] ?? ""),
  };
}

function mapTask(rec: { id: string; fields: RawFields }, matterId: string): Task {
  const f = rec.fields;
  const t = FIELDS.tasks;
  return {
    id: rec.id,
    matterId,
    description: String(f[t.taskName] ?? ""),
    dueDate: (f[t.dueDate] as string) ?? null,
    status: String(f[t.status] ?? "To Do"),
    priority: String(f[t.priority] ?? "Medium"),
    isFilingDeadline: Boolean(f["Filing Deadline"] ?? f["Is Filing Deadline"] ?? false),
    assignedTo: String(f[t.assignedTo] ?? ""),
  };
}

function mapNote(rec: { id: string; fields: RawFields }, matterId: string): Note {
  const f = rec.fields;
  const n = FIELDS.notes;
  return {
    id: rec.id,
    matterId,
    author: String(f[n.author] ?? "Unknown"),
    content: String(f[n.content] ?? ""),
    createdAt: String(f[n.date] ?? new Date().toISOString()),
    type: String(f[n.type] ?? "Manual"),
  };
}

function mapLegalElement(rec: { id: string; fields: RawFields }, matterId: string): LegalElementRow {
  const f = rec.fields;
  const le = FIELDS.legalElements;
  const status = String(f[le.status] ?? "");
  return {
    id: rec.id,
    matterId,
    element: String(f[le.legalElement] ?? ""),
    assessment: status,
    keyGap: String(f[le.extractedFact] ?? "").slice(0, 120),
    nextAction: status === "Missing" ? "Gather evidence" : "Review with attorney",
  };
}

function mapDocument(rec: { id: string; fields: RawFields }, matterId: string): DocumentRow {
  const f = rec.fields;
  const d = FIELDS.documents;
  return {
    id: rec.id,
    matterId,
    title: String(f[d.title] ?? "Untitled"),
    category: String(f[d.category] ?? ""),
    uploadedAt: String(f[d.uploadedAt] ?? new Date().toISOString()),
  };
}

export async function listDocumentsFromAirtable(matterCode: string): Promise<DocumentRow[]> {
  const resolved = await resolveMatterRecordId(matterCode);
  if (!resolved) return [];
  const formula = `FIND('${escapeFormula(resolved.recordId)}', ARRAYJOIN({${FIELDS.documents.matterLink}}))`;
  try {
    const records = await airtableListAll<RawFields>(FIELDS.documents.table, { filterByFormula: formula });
    return records.map((r) => mapDocument(r, resolved.matterId));
  } catch {
    return [];
  }
}

export async function getCaseAssessmentFromAirtable(matterCode: string): Promise<CaseAssessment> {
  const resolved = await resolveMatterRecordId(matterCode);
  if (!resolved) return emptyCaseAssessment(matterCode);
  const formula = `{${FIELDS.matters.matterId}} = '${escapeFormula(resolved.matterId)}'`;
  const payload = await airtableFetch<{ records: Array<{ id: string; fields: RawFields }> }>(
    FIELDS.matters.table,
    { filterByFormula: formula, maxRecords: "1" },
  );
  const rec = payload.records[0];
  if (!rec) return emptyCaseAssessment(matterCode);
  const raw = rec.fields[FIELDS.matters.caseAssessment];
  return parseCaseAssessment(raw, resolved.matterId);
}

export async function saveCaseAssessmentInAirtable(
  matterCode: string,
  assessment: CaseAssessment,
): Promise<CaseAssessment> {
  const resolved = await resolveMatterRecordId(matterCode);
  if (!resolved) throw new Error(`Matter not found: ${matterCode}`);
  await airtablePatch(FIELDS.matters.table, resolved.recordId, {
    [FIELDS.matters.caseAssessment]: serializeCaseAssessment({ ...assessment, matterId: resolved.matterId }),
  });
  return { ...assessment, matterId: resolved.matterId };
}

export async function updateLegalElementInAirtable(
  elementId: string,
  patch: Partial<Pick<LegalElementRow, "assessment" | "keyGap" | "nextAction">>,
): Promise<LegalElementRow | null> {
  const le = FIELDS.legalElements;
  const fields: RawFields = {};
  if (patch.assessment !== undefined) fields[le.status] = patch.assessment;
  if (patch.keyGap !== undefined) fields[le.extractedFact] = patch.keyGap;
  const rec = await airtablePatch(le.table, elementId, fields);
  const matterLinks = linkedIds(rec.fields[le.matterLink]);
  const matterId = matterLinks[0] ?? "";
  return mapLegalElement(rec, matterId);
}

export async function listMattersFromAirtable(): Promise<Matter[]> {
  const records = await airtableListAll<RawFields>(FIELDS.matters.table);
  return records.map(mapMatter);
}

export async function resolveMatterRecordId(matterCode: string): Promise<{ recordId: string; matterId: string } | null> {
  if (matterCode.startsWith("rec")) {
    return { recordId: matterCode, matterId: matterCode };
  }
  const formula = `{${FIELDS.matters.matterId}} = '${escapeFormula(matterCode)}'`;
  const payload = await airtableFetch<{ records: Array<{ id: string; fields: RawFields }> }>(
    FIELDS.matters.table,
    { filterByFormula: formula, maxRecords: "1" },
  );
  const rec = payload.records[0];
  if (!rec) return null;
  return { recordId: rec.id, matterId: String(rec.fields[FIELDS.matters.matterId] ?? matterCode) };
}

export async function listTasksForMatterFromAirtable(matterCode: string): Promise<Task[]> {
  const resolved = await resolveMatterRecordId(matterCode);
  if (!resolved) return [];
  const formula = `FIND('${escapeFormula(resolved.recordId)}', ARRAYJOIN({${FIELDS.tasks.matterLink}}))`;
  const records = await airtableListAll<RawFields>(FIELDS.tasks.table, { filterByFormula: formula });
  return records.map((r) => mapTask(r, resolved.matterId));
}

export async function createTaskInAirtable(
  matterCode: string,
  payload: Pick<Task, "description" | "dueDate" | "priority" | "isFilingDeadline">,
): Promise<Task> {
  const resolved = await resolveMatterRecordId(matterCode);
  if (!resolved) throw new Error(`Matter not found: ${matterCode}`);
  const t = FIELDS.tasks;
  const fields: RawFields = {
    [t.taskName]: payload.description,
    [t.matterLink]: [resolved.recordId],
    [t.status]: "To Do",
    [t.priority]: payload.priority,
  };
  if (payload.dueDate) fields[t.dueDate] = payload.dueDate;
  if (payload.isFilingDeadline) fields["Filing Deadline"] = true;
  const rec = await airtableCreate(FIELDS.tasks.table, fields);
  return mapTask(rec, resolved.matterId);
}

export async function completeTaskInAirtable(taskId: string): Promise<Task | null> {
  const rec = await airtablePatch(FIELDS.tasks.table, taskId, { [FIELDS.tasks.status]: "Done" });
  const matterLinks = linkedIds(rec.fields[FIELDS.tasks.matterLink]);
  const recordId = matterLinks[0];
  if (!recordId) return mapTask(rec, "");
  let matterId = recordId;
  try {
    const matterRec = await airtableGetRecord<RawFields>(FIELDS.matters.table, recordId);
    matterId = String(matterRec.fields[FIELDS.matters.matterId] ?? recordId);
  } catch {
    matterId = recordId;
  }
  return mapTask(rec, matterId);
}

export async function listNotesForMatterFromAirtable(matterCode: string): Promise<Note[]> {
  const resolved = await resolveMatterRecordId(matterCode);
  if (!resolved) return [];
  const formula = `FIND('${escapeFormula(resolved.recordId)}', ARRAYJOIN({${FIELDS.notes.matterLink}}))`;
  const records = await airtableListAll<RawFields>(FIELDS.notes.table, { filterByFormula: formula });
  return records.map((r) => mapNote(r, resolved.matterId));
}

export async function createNoteInAirtable(matterCode: string, content: string, author: string): Promise<Note> {
  const resolved = await resolveMatterRecordId(matterCode);
  if (!resolved) throw new Error(`Matter not found: ${matterCode}`);
  const n = FIELDS.notes;
  const rec = await airtableCreate(FIELDS.notes.table, {
    [n.content]: content,
    [n.author]: author,
    [n.matterLink]: [resolved.recordId],
    [n.date]: new Date().toISOString(),
    [n.type]: "Manual",
  });
  return mapNote(rec, resolved.matterId);
}

export async function listLegalElementsFromAirtable(matterCode: string): Promise<LegalElementRow[]> {
  const resolved = await resolveMatterRecordId(matterCode);
  if (!resolved) return [];
  const formula = `FIND('${escapeFormula(resolved.recordId)}', ARRAYJOIN({${FIELDS.legalElements.matterLink}}))`;
  const records = await airtableListAll<RawFields>(FIELDS.legalElements.table, {
    filterByFormula: formula,
  });
  return records.map((r) => mapLegalElement(r, resolved.matterId));
}

export async function updateMatterDeadlineInAirtable(matterCode: string, nextDeadline: string | null): Promise<Matter | null> {
  const resolved = await resolveMatterRecordId(matterCode);
  if (!resolved) return null;
  const rec = await airtablePatch(FIELDS.matters.table, resolved.recordId, {
    [FIELDS.matters.nextDeadline]: nextDeadline,
  });
  return mapMatter(rec);
}

export { useDemoMode };
