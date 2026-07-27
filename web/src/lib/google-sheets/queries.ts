/**
 * Google Sheets read/write — Matters + Notes (Phase 1 migration slice).
 */

import type { Matter, Note, Task } from "../types";
import { DEFAULT_LIFECYCLE_STAGE } from "../matter-lifecycle-stage";
import { FIRM_TEMPLATE_MATTER_ID } from "../assessment-documents";
import { MATTER_STATUS_CLOSED } from "../matter-status";
import {
  appendSheetRow,
  newRowId,
  readSheetTab,
  rowToValues,
  updateSheetRow,
} from "./client";
import { TAB_HEADERS } from "./schema";

function mapMatterRow(row: Record<string, string>): Matter {
  const matterId = row.matter_id || row.row_id;
  const title = row.title || "";
  return {
    id: row.row_id,
    matterId,
    clientName: title || matterId,
    title,
    caseType: row.case_type ?? "",
    country: row.country ?? "",
    posture: row.posture ?? "",
    court: row.court ?? "",
    judge: row.judge ?? "",
    status: row.status ?? "",
    proceduralPosture: row.posture ?? "",
    fidelityScore: 0,
    nextDeadline: row.next_deadline || null,
    nextHearing: row.next_hearing || null,
    vulnerabilityFlags: [],
    assignedAttorney: row.assigned_to ?? "",
    summary: row.summary ?? "",
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
    lifecycleStage: row.lifecycle_stage || undefined,
  };
}

function mapTaskRow(row: Record<string, string>): Task {
  return {
    id: row.row_id,
    matterId: row.matter_id,
    description: row.description ?? "",
    dueDate: row.due_date || null,
    status: row.status || "To Do",
    priority: row.priority || "Medium",
    isFilingDeadline: row.is_filing_deadline === "true" || row.is_filing_deadline === "TRUE",
    assignedTo: row.assigned_to || undefined,
    createdFrom: row.created_from_agent || undefined,
  };
}

function mapNoteRow(row: Record<string, string>): Note {
  return {
    id: row.row_id,
    matterId: row.matter_id,
    author: row.author || "Unknown",
    content: row.content ?? "",
    createdAt: row.created_at || new Date().toISOString(),
    type: row.type || "Manual",
  };
}

async function findMatterRow(matterCode: string): Promise<(Record<string, string> & { _sheetRow: number }) | null> {
  const rows = await readSheetTab("matters");
  const byCode = rows.find((r) => r.matter_id === matterCode);
  if (byCode) return byCode;
  if (matterCode.startsWith("gs-")) {
    return rows.find((r) => r.row_id === matterCode) ?? null;
  }
  return null;
}

export async function listMattersFromGoogleSheets(): Promise<Matter[]> {
  const rows = await readSheetTab("matters");
  return rows.map(mapMatterRow);
}

export async function getMatterFromGoogleSheets(matterCode: string): Promise<Matter | null> {
  const row = await findMatterRow(matterCode);
  return row ? mapMatterRow(row) : null;
}

export async function createMatterInGoogleSheets(payload: {
  title: string;
  caseType: string;
  country?: string;
  posture?: string;
  status?: string;
  summary?: string;
}): Promise<Matter> {
  const existing = await listMattersFromGoogleSheets();
  let maxNum = 1000;
  for (const m of existing) {
    const match = m.matterId.match(/^AOD-(\d+)$/i);
    if (match) maxNum = Math.max(maxNum, parseInt(match[1], 10));
  }
  const matterId = `AOD-${maxNum + 1}`;
  const now = new Date().toISOString();
  const rowId = newRowId("mat");
  const headers = TAB_HEADERS.matters;
  const row: Record<string, string> = {
    row_id: rowId,
    matter_id: matterId,
    title: payload.title,
    case_type: payload.caseType,
    country: payload.country ?? "",
    posture: payload.posture ?? "",
    court: "",
    judge: "",
    status: payload.status ?? "Open",
    assigned_to: "",
    next_deadline: "",
    next_hearing: "",
    summary: payload.summary ?? "",
    created_at: now,
    updated_at: now,
    lifecycle_stage: DEFAULT_LIFECYCLE_STAGE,
  };
  await appendSheetRow("matters", rowToValues(headers, row));
  return mapMatterRow(row);
}

export async function ensureFirmTemplateMatterInGoogleSheets(): Promise<{
  recordId: string;
  matterId: string;
}> {
  const existing = await findMatterRow(FIRM_TEMPLATE_MATTER_ID);
  if (existing) {
    return { recordId: existing.row_id, matterId: FIRM_TEMPLATE_MATTER_ID };
  }
  const titled = (await readSheetTab("matters")).find((r) => r.title === "Firm Templates");
  if (titled) {
    return { recordId: titled.row_id, matterId: titled.matter_id || FIRM_TEMPLATE_MATTER_ID };
  }
  const matter = await createMatterInGoogleSheets({
    title: "Firm Templates",
    caseType: "Other",
    status: MATTER_STATUS_CLOSED,
    summary:
      "Administrative matter for firm-wide deliverable templates and assessment forms. Not an active client case.",
  });
  // Patch matter_id to FIRM-TEMPLATES code
  const row = await findMatterRow(matter.matterId);
  if (row) {
    const headers = TAB_HEADERS.matters;
    const { _sheetRow, ...rowData } = row;
    const updated = { ...rowData, matter_id: FIRM_TEMPLATE_MATTER_ID, status: MATTER_STATUS_CLOSED };
    await updateSheetRow("matters", _sheetRow, rowToValues(headers, updated));
  }
  return { recordId: matter.id, matterId: FIRM_TEMPLATE_MATTER_ID };
}

export async function updateMatterInGoogleSheets(
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
      | "lifecycleStage"
    >
  >,
): Promise<Matter | null> {
  const row = await findMatterRow(matterCode);
  if (!row) return null;
  const headers = TAB_HEADERS.matters;
  const { _sheetRow, ...rowData } = row;
  const updated: Record<string, string> = { ...rowData, updated_at: new Date().toISOString() };
  if (patch.title !== undefined) updated.title = patch.title;
  if (patch.caseType !== undefined) updated.case_type = patch.caseType;
  if (patch.country !== undefined) updated.country = patch.country;
  if (patch.posture !== undefined) updated.posture = patch.posture;
  if (patch.court !== undefined) updated.court = patch.court;
  if (patch.judge !== undefined) updated.judge = patch.judge;
  if (patch.status !== undefined) updated.status = patch.status;
  if (patch.summary !== undefined) updated.summary = patch.summary;
  if (patch.nextDeadline !== undefined) updated.next_deadline = patch.nextDeadline ?? "";
  if (patch.nextHearing !== undefined) updated.next_hearing = patch.nextHearing ?? "";
  if (patch.assignedAttorney !== undefined) updated.assigned_to = patch.assignedAttorney;
  if (patch.lifecycleStage !== undefined) updated.lifecycle_stage = patch.lifecycleStage;
  await updateSheetRow("matters", _sheetRow, rowToValues(headers, updated));
  return mapMatterRow(updated);
}

export async function updateMatterDeadlineInGoogleSheets(
  matterCode: string,
  nextDeadline: string | null,
): Promise<Matter | null> {
  return updateMatterInGoogleSheets(matterCode, { nextDeadline });
}

export async function listAllNotesFromGoogleSheets(): Promise<Note[]> {
  const rows = await readSheetTab("notes");
  return rows.map(mapNoteRow);
}

export async function listNotesForMatterFromGoogleSheets(matterCode: string): Promise<Note[]> {
  const resolved = await findMatterRow(matterCode);
  const code = resolved?.matter_id ?? matterCode;
  const rows = await readSheetTab("notes");
  return rows.filter((r) => r.matter_id === code).map(mapNoteRow);
}

export async function createNoteInGoogleSheets(
  matterCode: string,
  content: string,
  author: string,
  type = "Manual",
): Promise<Note> {
  const matter = await findMatterRow(matterCode);
  if (!matter && matterCode !== FIRM_TEMPLATE_MATTER_ID) {
    throw new Error(`Matter not found: ${matterCode}`);
  }
  const resolvedCode = matter?.matter_id ?? matterCode;
  const headers = TAB_HEADERS.notes;
  const rowId = newRowId("note");
  const row: Record<string, string> = {
    row_id: rowId,
    matter_id: resolvedCode,
    content,
    author,
    created_at: new Date().toISOString(),
    type,
  };
  await appendSheetRow("notes", rowToValues(headers, row));
  return mapNoteRow(row);
}

export async function updateNoteInGoogleSheets(
  noteId: string,
  matterCode: string,
  content: string,
  author?: string,
): Promise<Note> {
  const rows = await readSheetTab("notes", { noCache: true });
  const existing = rows.find((r) => r.row_id === noteId);
  if (!existing) throw new Error(`Note not found: ${noteId}`);
  const headers = TAB_HEADERS.notes;
  const { _sheetRow, ...rowData } = existing;
  const updated: Record<string, string> = {
    ...rowData,
    content: content.slice(0, 100_000),
    author: author?.slice(0, 120) ?? existing.author,
  };
  await updateSheetRow("notes", _sheetRow, rowToValues(headers, updated));
  return mapNoteRow(updated);
}

export async function findLatestAgentNoteForMatterFromGoogleSheets(matterCode: string): Promise<Note | null> {
  const notes = await listNotesForMatterFromGoogleSheets(matterCode);
  return (
    notes
      .filter((n) => n.type === "Agent")
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null
  );
}

export async function findLatestProceduralTimelineNoteForMatterFromGoogleSheets(
  matterCode: string,
): Promise<Note | null> {
  const notes = await listNotesForMatterFromGoogleSheets(matterCode);
  return (
    notes
      .filter((n) => n.type === "Procedural")
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null
  );
}

export async function findLatestDraftingFactsNoteForMatterFromGoogleSheets(
  matterCode: string,
): Promise<Note | null> {
  const notes = await listNotesForMatterFromGoogleSheets(matterCode);
  return (
    notes
      .filter((n) => n.type === "Facts")
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null
  );
}

export async function findLatestAssessmentOcrNoteForMatterFromGoogleSheets(
  matterCode: string,
): Promise<Note | null> {
  const notes = await listNotesForMatterFromGoogleSheets(matterCode);
  return (
    notes
      .filter((n) => n.type === "Assessment Document")
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null
  );
}

export async function createStrategyPatternInGoogleSheets(payload: {
  name: string;
  description?: string;
  trigger?: string;
  body: string;
  agent?: string;
  matterCode?: string;
  correctionNote?: string;
}): Promise<{ id: string }> {
  const headers = TAB_HEADERS.strategyPatterns;
  const rowId = newRowId("sp");
  const detailParts = [payload.description?.trim(), payload.trigger?.trim()].filter(Boolean);
  const row: Record<string, string> = {
    row_id: rowId,
    fact_pattern: payload.name.slice(0, 240) || "Custom skill",
    fact_pattern_detail: detailParts.join("\n\n").slice(0, 4000) || payload.body.slice(0, 4000),
    strategy_used: (payload.agent ?? "attorney-skill").slice(0, 240),
    outcome: payload.body.slice(0, 4000),
    correction_note: (payload.correctionNote ?? "").slice(0, 2000),
    created_at: new Date().toISOString(),
  };
  await appendSheetRow("strategyPatterns", rowToValues(headers, row));
  return { id: rowId };
}

export async function createCorrectionInGoogleSheets(payload: {
  agent: string;
  matterCode?: string;
  originalOutput: string;
  attorneyEdit: string;
  correctionType: string;
  reason: string;
  appliedTo: string;
}): Promise<{ id: string }> {
  const headers = TAB_HEADERS.corrections;
  const rowId = newRowId("corr");
  const row: Record<string, string> = {
    row_id: rowId,
    agent: payload.agent.slice(0, 120),
    matter_id: payload.matterCode ?? "",
    original_output: payload.originalOutput.slice(0, 4000),
    attorney_edit: payload.attorneyEdit.slice(0, 4000),
    correction_type: payload.correctionType.slice(0, 80),
    reason: payload.reason.slice(0, 500),
    applied_to: payload.appliedTo.slice(0, 120),
    created_at: new Date().toISOString(),
  };
  await appendSheetRow("corrections", rowToValues(headers, row));
  return { id: rowId };
}

export async function listTasksForMatterFromGoogleSheets(matterCode: string): Promise<Task[]> {
  const resolved = await findMatterRow(matterCode);
  const code = resolved?.matter_id ?? matterCode;
  const rows = await readSheetTab("tasks");
  return rows.filter((r) => r.matter_id === code).map(mapTaskRow);
}

export async function listAllTasksFromGoogleSheets(): Promise<Task[]> {
  const rows = await readSheetTab("tasks");
  return rows.map(mapTaskRow);
}

export async function createTaskInGoogleSheets(
  matterCode: string,
  payload: Pick<Task, "description" | "dueDate" | "priority" | "isFilingDeadline"> & {
    createdFrom?: string;
  },
): Promise<Task> {
  const resolved = await findMatterRow(matterCode);
  const code = resolved?.matter_id ?? matterCode;
  const headers = TAB_HEADERS.tasks;
  const rowId = newRowId("task");
  const row: Record<string, string> = {
    row_id: rowId,
    matter_id: code,
    description: payload.description,
    status: "To Do",
    priority: payload.priority,
    due_date: payload.dueDate ?? "",
    assigned_to: "",
    is_filing_deadline: payload.isFilingDeadline ? "true" : "",
    created_from_agent: payload.createdFrom ?? "",
  };
  await appendSheetRow("tasks", rowToValues(headers, row));
  return mapTaskRow(row);
}

export async function completeTaskInGoogleSheets(
  taskId: string,
  _options?: { completionDocs?: string; completionNote?: string; completedBy?: string },
): Promise<Task | null> {
  const rows = await readSheetTab("tasks", { noCache: true });
  const existing = rows.find((r) => r.row_id === taskId);
  if (!existing) return null;
  const headers = TAB_HEADERS.tasks;
  const { _sheetRow, ...rowData } = existing;
  const updated: Record<string, string> = { ...rowData, status: "Done" };
  await updateSheetRow("tasks", _sheetRow, rowToValues(headers, updated));
  return mapTaskRow(updated);
}
