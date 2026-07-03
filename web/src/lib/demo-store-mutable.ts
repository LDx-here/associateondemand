import { readFile, writeFile } from "fs/promises";
import path from "path";

import type { AssignmentStatus, AssignmentTier, DevSeed, InboxItem, LegalElementRow, Note, Task } from "./types";

let cache: DevSeed | null = null;

function seedPath(): string {
  return path.join(process.cwd(), "..", "data", "dev-seed.json");
}

export async function getMutableSeed(): Promise<DevSeed> {
  if (!cache) {
    const raw = await readFile(seedPath(), "utf-8");
    cache = JSON.parse(raw) as DevSeed;
  }
  return cache;
}

export async function persistSeed(): Promise<void> {
  if (!cache) return;
  await writeFile(seedPath(), JSON.stringify(cache, null, 2), "utf-8");
}

export async function addNote(matterId: string, content: string, author: string): Promise<Note> {
  const seed = await getMutableSeed();
  const note: Note = {
    id: `note-${Date.now()}`,
    matterId,
    author,
    content,
    createdAt: new Date().toISOString(),
    type: "Manual",
  };
  seed.notes.push(note);
  await persistSeed();
  return note;
}

export async function addTask(
  matterId: string,
  payload: Pick<Task, "description" | "dueDate" | "priority" | "isFilingDeadline">,
): Promise<Task> {
  const seed = await getMutableSeed();
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
  await persistSeed();
  return task;
}

export async function completeTask(taskId: string): Promise<Task | null> {
  const seed = await getMutableSeed();
  const task = seed.tasks.find((t) => t.id === taskId);
  if (!task) return null;
  task.status = "Done";
  const when = new Date().toISOString();
  seed.notes.push({
    id: `note-${Date.now()}`,
    matterId: task.matterId,
    author: "System",
    content: `Task completed: ${task.description}. By: Attorney. Date: ${when}. Documents: (not specified).`,
    createdAt: when,
    type: "Manual",
  });
  await persistSeed();
  return task;
}

export async function updateLegalElement(
  id: string,
  patch: Partial<Pick<LegalElementRow, "assessment" | "keyGap" | "nextAction">>,
): Promise<LegalElementRow | null> {
  const seed = await getMutableSeed();
  const row = seed.legalElements.find((e) => e.id === id);
  if (!row) return null;
  Object.assign(row, patch);
  await persistSeed();
  return row;
}

const ASSIGNMENT_TRANSITIONS: Record<AssignmentStatus, AssignmentStatus[]> = {
  Submitted: ["In progress"],
  "In progress": ["Ready for review"],
  "Ready for review": ["Approved", "Returned"],
  Returned: ["In progress"],
  Approved: [],
};

export async function listInboxItemsDemo(): Promise<InboxItem[]> {
  const seed = await getMutableSeed();
  return [...(seed.inboxItems ?? [])].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function createAssignmentDemo(payload: {
  matterId: string;
  deliverableType: string;
  tier: AssignmentTier;
  facts: string;
  priority?: string;
  dueDate?: string | null;
  submittedBy?: string;
}): Promise<InboxItem> {
  const seed = await getMutableSeed();
  if (!seed.inboxItems) seed.inboxItems = [];
  const now = new Date().toISOString();
  const item: InboxItem = {
    id: `inbox-demo-${Date.now()}`,
    title: `${payload.deliverableType} \u2014 ${payload.tier} tier`,
    matterId: payload.matterId,
    agent: "PM Orchestrator",
    whatTried: "Assignment submitted via intake form. Awaiting PM pickup.",
    whatNeeded: payload.facts,
    options: [],
    followUpSteps: [],
    status: "Submitted",
    resolution: "",
    createdAt: now,
    resolvedAt: null,
    kind: "assignment",
    deliverableType: payload.deliverableType,
    tier: payload.tier,
    facts: payload.facts,
    priority: payload.priority ?? "Medium",
    dueDate: payload.dueDate ?? null,
    history: [
      {
        status: "Submitted",
        note: "Assignment submitted via intake form.",
        at: now,
        by: payload.submittedBy ?? "Attorney",
      },
    ],
  };
  seed.inboxItems.push(item);
  await persistSeed();
  return item;
}

export async function updateAssignmentStatusDemo(
  itemId: string,
  nextStatus: AssignmentStatus,
  options?: { note?: string; by?: string },
): Promise<InboxItem | null> {
  const seed = await getMutableSeed();
  const item = (seed.inboxItems ?? []).find((i) => i.id === itemId);
  if (!item) return null;
  const allowed = ASSIGNMENT_TRANSITIONS[item.status as AssignmentStatus];
  if (!Array.isArray(allowed) || !allowed.includes(nextStatus)) {
    throw new Error(`Cannot move assignment from "${item.status}" to "${nextStatus}"`);
  }
  const now = new Date().toISOString();
  item.status = nextStatus;
  if (options?.note?.trim()) item.resolution = options.note.trim();
  if (nextStatus === "Approved" || nextStatus === "Returned") item.resolvedAt = now;
  item.history = [
    ...(item.history ?? []),
    { status: nextStatus, note: options?.note?.trim() || undefined, at: now, by: options?.by ?? "Attorney" },
  ];
  await persistSeed();
  return item;
}
