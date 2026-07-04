import {
  completeTaskInAirtable,
  createAssignmentInAirtable,
  createLegalElementInAirtable,
  createNoteInAirtable,
  createTaskInAirtable,
  getCaseAssessmentFromAirtable,
  listDocumentsFromAirtable,
  listEventsForMatterFromAirtable,
  listInboxItemsFromAirtable,
  listLegalElementsFromAirtable,
  listContactsFromAirtable,
  listMattersFromAirtable,
  createMatterInAirtable,
  listAllNotesFromAirtable,
  listAllTasksFromAirtable,
  listNotesForMatterFromAirtable,
  listTasksForMatterFromAirtable,
  saveCaseAssessmentInAirtable,
  updateAssignmentStatusInAirtable,
  updateLegalElementInAirtable,
  updateMatterDeadlineInAirtable,
  updateMatterInAirtable,
  useDemoMode,
} from "./airtable/queries";
import { emptyCaseAssessment } from "./case-assessment";
import {
  createAssignmentDemo,
  getMutableSeed,
  listInboxItemsDemo,
  updateAssignmentStatusDemo,
} from "./demo-store-mutable";
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

export { useDemoMode };

async function loadDemoSeed(): Promise<DevSeed> {
  return getMutableSeed();
}

export async function listMatters(): Promise<Matter[]> {
  if (useDemoMode()) {
    return (await loadDemoSeed()).matters;
  }
  return listMattersFromAirtable();
}

export async function listContacts(): Promise<Contact[]> {
  if (useDemoMode()) {
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
  if (useDemoMode()) {
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
  const matters = await listMatters();
  return matters.find((m) => m.matterId === matterId || m.id === matterId) ?? null;
}

export async function listTasksForMatter(matterId: string): Promise<Task[]> {
  if (useDemoMode()) {
    const seed = await loadDemoSeed();
    return seed.tasks.filter((t) => t.matterId === matterId);
  }
  return listTasksForMatterFromAirtable(matterId);
}

export async function listAllTasks(): Promise<Task[]> {
  if (useDemoMode()) {
    return (await loadDemoSeed()).tasks;
  }
  return listAllTasksFromAirtable();
}

export async function listAllNotes(): Promise<Note[]> {
  if (useDemoMode()) {
    return (await loadDemoSeed()).notes;
  }
  return listAllNotesFromAirtable();
}

export async function listNotesForMatter(matterId: string): Promise<Note[]> {
  if (useDemoMode()) {
    const seed = await loadDemoSeed();
    return seed.notes.filter((n) => n.matterId === matterId);
  }
  return listNotesForMatterFromAirtable(matterId);
}

export async function listLegalElements(matterId: string): Promise<LegalElementRow[]> {
  if (useDemoMode()) {
    const seed = await loadDemoSeed();
    return seed.legalElements.filter((e) => e.matterId === matterId);
  }
  return listLegalElementsFromAirtable(matterId);
}

export async function listEventsForMatter(matterId: string) {
  if (useDemoMode()) {
    const seed = await loadDemoSeed();
    return seed.events.filter((e) => e.matterId === matterId);
  }
  return listEventsForMatterFromAirtable(matterId);
}

export async function listDocumentsForMatter(matterId: string): Promise<DocumentRow[]> {
  if (useDemoMode()) {
    const seed = await loadDemoSeed();
    return seed.documents.filter((d) => d.matterId === matterId);
  }
  return listDocumentsFromAirtable(matterId);
}

export async function getCaseAssessment(matterId: string): Promise<CaseAssessment> {
  if (useDemoMode()) {
    const seed = await loadDemoSeed();
    const stored = seed.caseAssessments?.find((c) => c.matterId === matterId);
    return stored ?? emptyCaseAssessment(matterId);
  }
  return getCaseAssessmentFromAirtable(matterId);
}

export async function saveCaseAssessment(matterId: string, assessment: CaseAssessment): Promise<CaseAssessment> {
  if (useDemoMode()) {
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
  if (useDemoMode()) {
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
  patch: Partial<Pick<LegalElementRow, "assessment" | "keyGap" | "nextAction">>,
): Promise<LegalElementRow | null> {
  if (useDemoMode()) {
    const { updateLegalElement } = await import("./demo-store-mutable");
    return updateLegalElement(id, patch);
  }
  return updateLegalElementInAirtable(id, patch);
}

export async function completeTask(
  taskId: string,
  options?: { completionDocs?: string; completionNote?: string; completedBy?: string },
): Promise<Task | null> {
  if (useDemoMode()) {
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
  if (useDemoMode()) {
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

export async function createNoteForMatter(matterId: string, content: string, author: string): Promise<Note> {
  if (useDemoMode()) {
    const seed = await loadDemoSeed();
    const note: Note = {
      id: `note-${Date.now()}`,
      matterId,
      author,
      content,
      createdAt: new Date().toISOString(),
      type: "Manual",
    };
    seed.notes.push(note);
    return note;
  }
  return createNoteInAirtable(matterId, content, author);
}

export async function updateMatterFields(
  matterId: string,
  patch: Parameters<typeof updateMatterInAirtable>[1],
): Promise<Matter | null> {
  if (useDemoMode()) {
    const seed = await loadDemoSeed();
    const matter = seed.matters.find((m) => m.matterId === matterId);
    if (!matter) return null;
    Object.assign(matter, patch);
    return matter;
  }
  return updateMatterInAirtable(matterId, patch);
}

export async function updateMatterDeadline(matterId: string, nextDeadline: string | null): Promise<Matter | null> {
  if (useDemoMode()) {
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
  if (useDemoMode()) return listInboxItemsDemo();
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
}): Promise<InboxItem> {
  if (useDemoMode()) return createAssignmentDemo(payload);
  return createAssignmentInAirtable({ matterCode: payload.matterId, ...payload });
}

export async function updateAssignmentStatus(
  itemId: string,
  nextStatus: AssignmentStatus,
  options?: { note?: string; by?: string },
): Promise<InboxItem | null> {
  if (useDemoMode()) return updateAssignmentStatusDemo(itemId, nextStatus, options);
  return updateAssignmentStatusInAirtable(itemId, nextStatus, options);
}

export async function buildTimeline(matterId: string): Promise<TimelineEntry[]> {
  const seed = useDemoMode() ? await loadDemoSeed() : null;
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
