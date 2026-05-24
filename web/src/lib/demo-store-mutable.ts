import { readFile, writeFile } from "fs/promises";
import path from "path";

import type { DevSeed, LegalElementRow, Note, Task } from "./types";

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
  seed.notes.push({
    id: `note-${Date.now()}`,
    matterId: task.matterId,
    author: "System",
    content: `[Task completed] ${task.description}`,
    createdAt: new Date().toISOString(),
    type: "System Log",
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
