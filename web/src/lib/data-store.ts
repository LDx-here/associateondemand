import {
  completeTaskInAirtable,
  createAssignmentInAirtable,
  createLegalElementInAirtable,
  createNoteInAirtable,
  createTaskInAirtable,
  findLatestAgentNoteForMatter,
  findLatestAssessmentOcrNoteForMatter,
  findLatestDraftingFactsNoteForMatter,
  findLatestProceduralTimelineNoteForMatter,
  getCaseAssessmentFromAirtable,
  listDocumentsFromAirtable,
  listAssessmentTemplatesFromAirtable,
  listFirmSampleDocumentsFromAirtable,
  countFirmMemoryPatternsFromAirtable,
  registerAssessmentDocumentInAirtable,
  listEventsForMatterFromAirtable,
  listInboxItemsFromAirtable,
  listLegalElementsFromAirtable,
  listContactsFromAirtable,
  listMattersFromAirtable,
  getMatterFromAirtable,
  createMatterInAirtable,
  listAllNotesFromAirtable,
  listAllTasksFromAirtable,
  listNotesForMatterFromAirtable,
  listTasksForMatterFromAirtable,
  saveCaseAssessmentInAirtable,
  updateAssignmentStatusInAirtable,
  updateAssignmentPaymentInAirtable,
  markAssignmentDeliveredInAirtable,
  getInboxItemByIdFromAirtable,
  updateLegalElementInAirtable,
  updateMatterDeadlineInAirtable,
  updateMatterInAirtable,
  updateNoteInAirtable,
  isDemoMode,
} from "./airtable/queries";
import { emptyCaseAssessment } from "./case-assessment";
import {
  emptyProceduralTimeline,
  parseProceduralTimeline,
  PROCEDURAL_TIMELINE_NOTE_TYPE,
  serializeProceduralTimeline,
  type ProceduralTimelinePayload,
} from "./procedural-timeline";
import {
  emptyDraftingFacts,
  parseDraftingFactsNote,
  serializeDraftingFacts,
  type DraftingFactsPayload,
} from "./practice-area-facts";
import {
  createAssignmentDemo,
  addDocument as addDocumentDemo,
  getMutableSeed,
  listInboxItemsDemo,
  persistSeed,
  updateAssignmentStatusDemo,
  updateAssignmentPaymentDemo,
  markAssignmentDeliveredDemo,
  getInboxItemByIdDemo,
  updateNote as updateNoteDemo,
} from "./demo-store-mutable";
import {
  ASSESSMENT_DOCUMENT_NOTE_TYPE,
  encodeAssessmentTemplateCategory,
  encodeFirmSampleCategory,
  FIRM_TEMPLATE_MATTER_ID,
  isAssessmentTemplateDocument,
  isFirmSampleDocument,
  serializeAssessmentOcrPayload,
  type AssessmentOcrPayload,
} from "./assessment-documents";
import type {
  AssignmentStatus,
  AssignmentTier,
  CaseAssessment,
  DevSeed,
  DocumentRow,
  Contact,
  InboxItem,
  LegalElementRow,
  Matter,
  Note,
  Task,
  TimelineEntry,
} from "./types";

export { isDemoMode };

async function loadDemoSeed(): Promise<DevSeed> {
  return getMutableSeed();
}

export async function listMatters(): Promise<Matter[]> {
  if (isDemoMode()) {
    return (await loadDemoSeed()).matters;
  }
  return listMattersFromAirtable();
}

export async function listContacts(): Promise<Contact[]> {
  if (isDemoMode()) {
    return [];
  }
  return listContactsFromAirtable();
}

export async function createMatter(payload: {
  title: string;
  caseType: string;
  country?: string;
  posture?: string;
  status?: string;
  summary?: string;
}): Promise<Matter> {
  if (isDemoMode()) {
    const seed = await loadDemoSeed();
    const matterId = `AOD-${1000 + seed.matters.length + 1}`;
    const matter: Matter = {
      id: `rec-demo-${Date.now()}`,
      matterId,
      clientName: payload.title,
      title: payload.title,
      caseType: payload.caseType,
      country: payload.country,
      posture: payload.posture,
      status: payload.status ?? "Open",
      proceduralPosture: payload.posture ?? "",
      fidelityScore: 0,
      nextDeadline: null,
      vulnerabilityFlags: [],
      assignedAttorney: "",
      summary: payload.summary ?? "",
    };
    seed.matters.push(matter);
    const { persistSeed } = await import("./demo-store-mutable");
    await persistSeed();
    return matter;
  }
  return createMatterInAirtable(payload);
}

export async function getMatterByCode(matterId: string): Promise<Matter | null> {
  if (isDemoMode()) {
    const matters = await listMatters();
    return matters.find((m) => m.matterId === matterId || m.id === matterId) ?? null;
  }
  return getMatterFromAirtable(matterId);
}

export async function listTasksForMatter(matterId: string): Promise<Task[]> {
  if (isDemoMode()) {
    const seed = await loadDemoSeed();
    return seed.tasks.filter((t) => t.matterId === matterId);
  }
  return listTasksForMatterFromAirtable(matterId);
}

export async function listAllTasks(): Promise<Task[]> {
  if (isDemoMode()) {
    return (await loadDemoSeed()).tasks;
  }
  return listAllTasksFromAirtable();
}

export async function listAllNotes(): Promise<Note[]> {
  if (isDemoMode()) {
    return (await loadDemoSeed()).notes;
  }
  return listAllNotesFromAirtable();
}

export async function listNotesForMatter(matterId: string): Promise<Note[]> {
  if (isDemoMode()) {
    const seed = await loadDemoSeed();
    return seed.notes.filter((n) => n.matterId === matterId);
  }
  return listNotesForMatterFromAirtable(matterId);
}

export async function listLegalElements(matterId: string): Promise<LegalElementRow[]> {
  if (isDemoMode()) {
    const seed = await loadDemoSeed();
    return seed.legalElements.filter((e) => e.matterId === matterId);
  }
  return listLegalElementsFromAirtable(matterId);
}

export async function listEventsForMatter(matterId: string) {
  if (isDemoMode()) {
    const seed = await loadDemoSeed();
    return seed.events.filter((e) => e.matterId === matterId);
  }
  return listEventsForMatterFromAirtable(matterId);
}

export async function listDocumentsForMatter(matterId: string): Promise<DocumentRow[]> {
  if (isDemoMode()) {
    const seed = await loadDemoSeed();
    return seed.documents.filter((d) => d.matterId === matterId);
  }
  return listDocumentsFromAirtable(matterId);
}

export async function getCaseAssessment(matterId: string): Promise<CaseAssessment> {
  if (isDemoMode()) {
    const seed = await loadDemoSeed();
    const stored = seed.caseAssessments?.find((c) => c.matterId === matterId);
    return stored ?? emptyCaseAssessment(matterId);
  }
  return getCaseAssessmentFromAirtable(matterId);
}

export async function saveCaseAssessment(matterId: string, assessment: CaseAssessment): Promise<CaseAssessment> {
  if (isDemoMode()) {
    const seed = await loadDemoSeed();
    if (!seed.caseAssessments) seed.caseAssessments = [];
    const idx = seed.caseAssessments.findIndex((c) => c.matterId === matterId);
    const payload = { ...assessment, matterId };
    if (idx >= 0) seed.caseAssessments[idx] = payload;
    else seed.caseAssessments.push(payload);
    const { persistSeed } = await import("./demo-store-mutable");
    await persistSeed();
    return payload;
  }
  return saveCaseAssessmentInAirtable(matterId, assessment);
}

export async function createLegalElement(
  matterId: string,
  elementName: string,
): Promise<LegalElementRow> {
  if (isDemoMode()) {
    const seed = await loadDemoSeed();
    const row: LegalElementRow = {
      id: `le-${Date.now()}`,
      matterId,
      element: elementName,
      assessment: "Not assessed",
      keyGap: "",
      nextAction: "",
    };
    seed.legalElements.push(row);
    const { persistSeed } = await import("./demo-store-mutable");
    await persistSeed();
    return row;
  }
  return createLegalElementInAirtable(matterId, elementName);
}

export async function updateLegalElementRow(
  id: string,
  patch: Partial<Pick<LegalElementRow, "assessment" | "keyGap" | "nextAction" | "supportingFacts">>,
): Promise<LegalElementRow | null> {
  if (isDemoMode()) {
    const { updateLegalElement } = await import("./demo-store-mutable");
    return updateLegalElement(id, patch);
  }
  return updateLegalElementInAirtable(id, patch);
}

export async function completeTask(
  taskId: string,
  options?: { completionDocs?: string; completionNote?: string; completedBy?: string },
): Promise<Task | null> {
  if (isDemoMode()) {
    const { completeTask: completeDemoTask } = await import("./demo-store-mutable");
    return completeDemoTask(taskId);
  }
  const task = await completeTaskInAirtable(taskId, options);
  if (!task) return null;
  const when = new Date().toISOString();
  const docs = options?.completionDocs?.trim() || "(not specified)";
  const note = options?.completionNote?.trim();
  const body = note
    ? `Task completed: ${task.description}. By: ${options?.completedBy ?? "Attorney"}. Date: ${when}. Documents: ${docs}. Note: ${note}`
    : `Task completed: ${task.description}. By: ${options?.completedBy ?? "Attorney"}. Date: ${when}. Documents: ${docs}.`;
  await createNoteInAirtable(task.matterId, body, "System", "Manual");
  return task;
}

export async function createTaskForMatter(
  matterId: string,
  payload: Pick<Task, "description" | "dueDate" | "priority" | "isFilingDeadline">,
): Promise<Task> {
  if (isDemoMode()) {
    const seed = await loadDemoSeed();
    const task: Task = {
      id: `tsk-${Date.now()}`,
      matterId,
      description: payload.description,
      dueDate: payload.dueDate,
      status: "To Do",
      priority: payload.priority,
      isFilingDeadline: payload.isFilingDeadline,
    };
    seed.tasks.push(task);
    return task;
  }
  return createTaskInAirtable(matterId, payload);
}

export async function createNoteForMatter(
  matterId: string,
  content: string,
  author: string,
  type = "Manual",
): Promise<Note> {
  if (isDemoMode()) {
    const seed = await loadDemoSeed();
    const note: Note = {
      id: `note-${Date.now()}`,
      matterId,
      author,
      content,
      createdAt: new Date().toISOString(),
      type,
    };
    seed.notes.push(note);
    await persistSeed();
    return note;
  }
  return createNoteInAirtable(matterId, content, author, type);
}

export async function getDraftingFactsForMatter(matterId: string): Promise<DraftingFactsPayload | null> {
  const matter = await getMatterByCode(matterId);
  const caseType = matter?.caseType ?? "";
  if (isDemoMode()) {
    const seed = await loadDemoSeed();
    const note = seed.notes
      .filter((n) => n.matterId === matterId && n.type === "Facts")
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    if (!note) return null;
    return parseDraftingFactsNote(note.content, matterId, caseType);
  }
  const note = await findLatestDraftingFactsNoteForMatter(matterId);
  if (!note) return null;
  return parseDraftingFactsNote(note.content, matterId, caseType);
}

export async function saveDraftingFactsForMatter(
  matterId: string,
  payload: DraftingFactsPayload,
): Promise<DraftingFactsPayload> {
  const matter = await getMatterByCode(matterId);
  if (!matter) throw new Error(`Matter not found: ${matterId}`);
  const normalized: DraftingFactsPayload = {
    ...payload,
    v: 1,
    caseType: matter.caseType,
    updatedAt: new Date().toISOString(),
  };
  const content = serializeDraftingFacts(normalized);

  if (isDemoMode()) {
    const seed = await loadDemoSeed();
    const existing = seed.notes
      .filter((n) => n.matterId === matterId && n.type === "Facts")
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    if (existing) {
      existing.content = content;
      existing.author = "Attorney";
      return normalized;
    }
    seed.notes.push({
      id: `note-${Date.now()}`,
      matterId,
      author: "Attorney",
      content,
      createdAt: new Date().toISOString(),
      type: "Facts",
    });
    return normalized;
  }

  const existing = await findLatestDraftingFactsNoteForMatter(matterId);
  if (existing) {
    await updateNoteInAirtable(existing.id, matterId, content, "Attorney");
  } else {
    await createNoteInAirtable(matterId, content, "Attorney", "Facts");
  }
  return normalized;
}

export async function getProceduralTimelineForMatter(
  matterId: string,
): Promise<ProceduralTimelinePayload> {
  if (isDemoMode()) {
    const seed = await loadDemoSeed();
    const note = seed.notes
      .filter((n) => n.matterId === matterId && n.type === PROCEDURAL_TIMELINE_NOTE_TYPE)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    if (!note) return emptyProceduralTimeline(matterId);
    return parseProceduralTimeline(note.content, matterId) ?? emptyProceduralTimeline(matterId);
  }
  const note = await findLatestProceduralTimelineNoteForMatter(matterId);
  if (!note) return emptyProceduralTimeline(matterId);
  return parseProceduralTimeline(note.content, matterId) ?? emptyProceduralTimeline(matterId);
}

export async function saveProceduralTimelineForMatter(
  matterId: string,
  payload: ProceduralTimelinePayload,
): Promise<ProceduralTimelinePayload> {
  const matter = await getMatterByCode(matterId);
  if (!matter) throw new Error(`Matter not found: ${matterId}`);
  const normalized: ProceduralTimelinePayload = {
    ...payload,
    v: 1,
    matterId,
    updatedAt: new Date().toISOString(),
  };
  const content = serializeProceduralTimeline(normalized);

  if (isDemoMode()) {
    const seed = await loadDemoSeed();
    const existing = seed.notes
      .filter((n) => n.matterId === matterId && n.type === PROCEDURAL_TIMELINE_NOTE_TYPE)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    if (existing) {
      existing.content = content;
      existing.author = "Attorney";
      return normalized;
    }
    seed.notes.push({
      id: `note-${Date.now()}`,
      matterId,
      author: "Attorney",
      content,
      createdAt: new Date().toISOString(),
      type: PROCEDURAL_TIMELINE_NOTE_TYPE,
    });
    return normalized;
  }

  const existing = await findLatestProceduralTimelineNoteForMatter(matterId);
  if (existing) {
    await updateNoteInAirtable(existing.id, matterId, content, "Attorney");
  } else {
    await createNoteInAirtable(matterId, content, "Attorney", PROCEDURAL_TIMELINE_NOTE_TYPE);
  }
  return normalized;
}

export async function updateNoteForMatter(
  matterId: string,
  noteId: string,
  content: string,
  author?: string,
): Promise<Note | null> {
  if (isDemoMode()) {
    const seed = await loadDemoSeed();
    const note = seed.notes.find((n) => n.id === noteId && n.matterId === matterId);
    if (!note) return null;
    note.content = content;
    if (author) note.author = author;
    return note;
  }
  try {
    return await updateNoteInAirtable(noteId, matterId, content, author);
  } catch {
    return null;
  }
}

/** Upsert the latest agent work product on a matter (Notes table, type Agent). */
export async function upsertAgentOutputForMatter(
  matterId: string,
  content: string,
  options?: { noteId?: string; agent?: string },
): Promise<Note> {
  const trimmed = content.trim();
  if (!trimmed) throw new Error("content required");

  if (isDemoMode()) {
    if (options?.noteId) {
      const updated = await updateNoteDemo(options.noteId, trimmed, "Attorney (edited)");
      if (updated) return updated;
    }
    const seed = await loadDemoSeed();
    const existing = seed.notes
      .filter((n) => n.matterId === matterId && n.type === "Agent")
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    if (existing) {
      existing.content = trimmed;
      existing.author = "Attorney (edited)";
      return existing;
    }
    const note: Note = {
      id: `note-${Date.now()}`,
      matterId,
      author: options?.agent ?? "Litigation Associate",
      content: trimmed,
      createdAt: new Date().toISOString(),
      type: "Agent",
    };
    seed.notes.push(note);
    return note;
  }

  if (options?.noteId) {
    const updated = await updateNoteInAirtable(options.noteId, matterId, trimmed, "Attorney (edited)");
    return updated;
  }
  const latest = await findLatestAgentNoteForMatter(matterId);
  if (latest) {
    return updateNoteInAirtable(latest.id, matterId, trimmed, "Attorney (edited)");
  }
  const label = options?.agent ? `[${options.agent} — edited output]` : "[Agent output — edited]";
  return createNoteInAirtable(matterId, `${label}\n\n${trimmed}`, options?.agent ?? "Litigation Associate", "Agent");
}

export async function updateMatterFields(
  matterId: string,
  patch: Parameters<typeof updateMatterInAirtable>[1],
): Promise<Matter | null> {
  if (isDemoMode()) {
    const seed = await loadDemoSeed();
    const matter = seed.matters.find((m) => m.matterId === matterId);
    if (!matter) return null;
    Object.assign(matter, patch);
    return matter;
  }
  return updateMatterInAirtable(matterId, patch);
}

export async function updateMatterDeadline(matterId: string, nextDeadline: string | null): Promise<Matter | null> {
  if (isDemoMode()) {
    const seed = await loadDemoSeed();
    const matter = seed.matters.find((m) => m.matterId === matterId);
    if (!matter) return null;
    matter.nextDeadline = nextDeadline;
    return matter;
  }
  return updateMatterDeadlineInAirtable(matterId, nextDeadline);
}

const OPEN_INBOX_STATUSES = new Set(["Pending", "Submitted", "In progress", "Ready for review", "Returned"]);

export async function listInboxItems(): Promise<InboxItem[]> {
  if (isDemoMode()) return listInboxItemsDemo();
  return listInboxItemsFromAirtable();
}

export async function countUnreadInbox(): Promise<number> {
  const items = await listInboxItems();
  return items.filter((item) => OPEN_INBOX_STATUSES.has(item.status)).length;
}

export async function countSubmittedAssignments(): Promise<number> {
  const items = await listInboxItems();
  return items.filter((item) => item.kind === "assignment" && item.status === "Submitted").length;
}

export async function createAssignment(payload: {
  matterId: string;
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
  if (isDemoMode()) return createAssignmentDemo(payload);
  return createAssignmentInAirtable({ matterCode: payload.matterId, ...payload });
}

export async function getInboxItemById(itemId: string): Promise<InboxItem | null> {
  if (isDemoMode()) return getInboxItemByIdDemo(itemId);
  return getInboxItemByIdFromAirtable(itemId);
}

export async function updateAssignmentPayment(
  itemId: string,
  patch: {
    paymentStatus?: "pending" | "paid" | "invoice";
    stripeSessionId?: string;
    amountCents?: number;
  },
): Promise<InboxItem | null> {
  if (isDemoMode()) return updateAssignmentPaymentDemo(itemId, patch);
  return updateAssignmentPaymentInAirtable(itemId, patch);
}

export async function updateAssignmentStatus(
  itemId: string,
  nextStatus: AssignmentStatus,
  options?: { note?: string; by?: string },
): Promise<InboxItem | null> {
  if (isDemoMode()) return updateAssignmentStatusDemo(itemId, nextStatus, options);
  return updateAssignmentStatusInAirtable(itemId, nextStatus, options);
}

export async function markAssignmentDelivered(
  itemId: string,
  options?: { exportKind?: string; by?: string },
): Promise<InboxItem | null> {
  if (isDemoMode()) return markAssignmentDeliveredDemo(itemId, options);
  return markAssignmentDeliveredInAirtable(itemId, options);
}

/** Assignment-kind PM Inbox rows linked to a matter code (e.g. AOD-1001). */
export async function listAssignmentsForMatter(matterId: string): Promise<InboxItem[]> {
  const items = await listInboxItems();
  return items
    .filter((item) => item.kind === "assignment" && item.matterId === matterId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

/** Agent-flag PM Inbox rows (gaps, MANUAL FLAG) linked to a matter code. */
export async function listAgentAlertsForMatter(matterId: string): Promise<InboxItem[]> {
  const items = await listInboxItems();
  return items
    .filter((item) => item.kind !== "assignment" && item.matterId === matterId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function buildTimeline(matterId: string): Promise<TimelineEntry[]> {
  const seed = isDemoMode() ? await loadDemoSeed() : null;
  const entries: TimelineEntry[] = [];

  const notes = seed ? seed.notes.filter((n) => n.matterId === matterId) : await listNotesForMatter(matterId);
  for (const n of notes) {
    entries.push({
      id: n.id,
      matterId,
      timestamp: n.createdAt,
      actor: n.author,
      kind: "note",
      summary: n.content.slice(0, 120),
    });
  }

  const tasks = seed ? seed.tasks.filter((t) => t.matterId === matterId) : await listTasksForMatter(matterId);
  for (const t of tasks) {
    entries.push({
      id: `${t.id}-created`,
      matterId,
      timestamp: t.dueDate ?? new Date().toISOString(),
      actor: "System",
      kind: "task_created",
      summary: `Task: ${t.description}`,
    });
    if (t.status === "Done") {
      entries.push({
        id: `${t.id}-done`,
        matterId,
        timestamp: t.dueDate ?? new Date().toISOString(),
        actor: "Attorney",
        kind: "task_completed",
        summary: `Completed: ${t.description}`,
      });
    }
  }

  if (seed) {
    for (const d of seed.documents.filter((x) => x.matterId === matterId)) {
      entries.push({
        id: d.id,
        matterId,
        timestamp: d.uploadedAt,
        actor: "Upload",
        kind: "document",
        summary: d.title,
      });
    }
    for (const e of seed.events.filter((x) => x.matterId === matterId)) {
      entries.push({
        id: e.id,
        matterId,
        timestamp: e.date,
        actor: "Calendar",
        kind: "event",
        summary: e.description,
      });
    }
    for (const a of (seed.auditLog ?? []).filter((x) => x.matterId === matterId)) {
      entries.push({
        id: a.id,
        matterId,
        timestamp: a.timestamp,
        actor: a.actor,
        kind: "agent",
        summary: a.summary,
      });
    }
  } else {
    const documents = await listDocumentsForMatter(matterId);
    for (const d of documents) {
      entries.push({
        id: d.id,
        matterId,
        timestamp: d.uploadedAt,
        actor: d.uploadedBy || "Upload",
        kind: "document",
        summary: d.title,
      });
    }
    const events = await listEventsForMatter(matterId);
    for (const e of events) {
      entries.push({
        id: e.id,
        matterId,
        timestamp: e.date,
        actor: "Calendar",
        kind: "event",
        summary: e.description,
      });
    }
  }

  return entries.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
}

export async function registerAssessmentDocument(
  matterId: string,
  payload: { title: string; category: string; airtableDocumentId?: string; ocrStatus?: string },
): Promise<DocumentRow> {
  if (isDemoMode()) {
    return addDocumentDemo(matterId, {
      title: payload.title,
      category: payload.category,
      ocrStatus: payload.ocrStatus,
      id: payload.airtableDocumentId,
    });
  }
  return registerAssessmentDocumentInAirtable(matterId, payload);
}

export async function listAssessmentTemplates(): Promise<DocumentRow[]> {
  if (isDemoMode()) {
    const seed = await loadDemoSeed();
    return seed.documents.filter(
      (d) => d.matterId === FIRM_TEMPLATE_MATTER_ID || isAssessmentTemplateDocument(d),
    );
  }
  return listAssessmentTemplatesFromAirtable();
}

export async function saveAssessmentTemplate(payload: {
  title: string;
  practiceArea: string;
  airtableDocumentId?: string;
}): Promise<DocumentRow> {
  const category = encodeAssessmentTemplateCategory(payload.practiceArea);
  if (isDemoMode()) {
    const seed = await loadDemoSeed();
    const existingIdx = seed.documents.findIndex(
      (d) =>
        (d.matterId === FIRM_TEMPLATE_MATTER_ID || isAssessmentTemplateDocument(d)) &&
        d.category === category,
    );
    const doc = await addDocumentDemo(FIRM_TEMPLATE_MATTER_ID, {
      title: payload.title,
      category,
      id: payload.airtableDocumentId,
    });
    if (existingIdx >= 0) seed.documents[existingIdx] = doc;
    await persistSeed();
    return doc;
  }
  return registerAssessmentDocumentInAirtable(FIRM_TEMPLATE_MATTER_ID, {
    title: payload.title,
    category,
    airtableDocumentId: payload.airtableDocumentId,
  });
}

export type FirmMemoryStatus = {
  templateCount: number;
  sampleCount: number;
  stylePreferenceCount: number;
  configured: boolean;
};

export async function listFirmSamples(): Promise<DocumentRow[]> {
  if (isDemoMode()) {
    const seed = await loadDemoSeed();
    return seed.documents.filter(
      (d) => d.matterId === FIRM_TEMPLATE_MATTER_ID || isFirmSampleDocument(d),
    );
  }
  return listFirmSampleDocumentsFromAirtable();
}

export async function getFirmMemoryStatus(): Promise<FirmMemoryStatus> {
  const templates = await listAssessmentTemplates();
  const samples = await listFirmSamples();
  const templateCount = templates.length;
  const sampleCount = samples.length;
  let stylePreferenceCount = 0;
  if (!isDemoMode()) {
    stylePreferenceCount = await countFirmMemoryPatternsFromAirtable();
  }
  const configured = templateCount > 0 || sampleCount > 0 || stylePreferenceCount > 0;
  return { templateCount, sampleCount, stylePreferenceCount, configured };
}

export async function saveFirmSample(payload: {
  title: string;
  practiceArea: string;
  airtableDocumentId?: string;
}): Promise<DocumentRow> {
  const category = encodeFirmSampleCategory(payload.practiceArea);
  if (isDemoMode()) {
    return addDocumentDemo(FIRM_TEMPLATE_MATTER_ID, {
      title: payload.title,
      category,
      id: payload.airtableDocumentId,
    });
  }
  return registerAssessmentDocumentInAirtable(FIRM_TEMPLATE_MATTER_ID, {
    title: payload.title,
    category,
    airtableDocumentId: payload.airtableDocumentId,
  });
}

export async function getAssessmentOcrNote(matterId: string): Promise<Note | null> {
  if (isDemoMode()) {
    const seed = await loadDemoSeed();
    const matches = seed.notes
      .filter((n) => n.matterId === matterId && n.type === ASSESSMENT_DOCUMENT_NOTE_TYPE)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return matches[0] ?? null;
  }
  return findLatestAssessmentOcrNoteForMatter(matterId);
}

export async function saveAssessmentOcrPayload(
  matterId: string,
  payload: AssessmentOcrPayload,
  author = "Attorney",
): Promise<AssessmentOcrPayload> {
  const content = serializeAssessmentOcrPayload(payload);

  if (isDemoMode()) {
    const seed = await loadDemoSeed();
    const existing = seed.notes
      .filter((n) => n.matterId === matterId && n.type === ASSESSMENT_DOCUMENT_NOTE_TYPE)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    if (existing) {
      existing.content = content;
      existing.author = author;
    } else {
      seed.notes.push({
        id: `note-${Date.now()}`,
        matterId,
        author,
        content,
        createdAt: new Date().toISOString(),
        type: ASSESSMENT_DOCUMENT_NOTE_TYPE,
      });
    }
    const { persistSeed } = await import("./demo-store-mutable");
    await persistSeed();
    return payload;
  }

  const existing = await findLatestAssessmentOcrNoteForMatter(matterId);
  if (existing) {
    await updateNoteInAirtable(existing.id, matterId, content, author);
  } else {
    await createNoteInAirtable(matterId, content, author, ASSESSMENT_DOCUMENT_NOTE_TYPE);
  }
  return payload;
}
