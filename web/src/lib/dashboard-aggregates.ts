import type { Matter, Task } from "./types";

export function overdueTasks(tasks: Task[], today = new Date()): Task[] {
  return tasks.filter((t) => {
    if (t.status === "Done" || !t.dueDate) return false;
    return new Date(t.dueDate) < today;
  });
}

export function mattersWithDeadlineSoon(matters: Matter[], days = 7): Matter[] {
  const now = Date.now();
  const horizon = now + days * 24 * 60 * 60 * 1000;
  return matters.filter((m) => {
    if (!m.nextDeadline) return false;
    const ts = new Date(m.nextDeadline).getTime();
    return ts >= now && ts <= horizon;
  });
}
