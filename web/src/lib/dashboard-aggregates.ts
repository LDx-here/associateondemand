import type { AuditLogEntry, Matter, Note, Task } from "./types";
import type { InboxItem } from "./airtable/queries";

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

/** Upcoming-deadline tasks per BUILD_SPEC §7.1 row 3. */
export function upcomingDeadlines(
  tasks: Task[],
  days = 30,
  today = new Date(),
): Task[] {
  const horizon = today.getTime() + days * 24 * 60 * 60 * 1000;
  return tasks
    .filter((t) => {
      if (!t.dueDate || t.status === "Done") return false;
      const ts = new Date(t.dueDate).getTime();
      return ts >= today.getTime() && ts <= horizon;
    })
    .sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1));
}

/** KPI count: tasks with `is_filing_deadline = true` due in N days. */
export function filingDeadlinesWithin(
  tasks: Task[],
  days = 14,
  today = new Date(),
): number {
  const horizon = today.getTime() + days * 24 * 60 * 60 * 1000;
  return tasks.filter((t) => {
    if (!t.isFilingDeadline || !t.dueDate || t.status === "Done") return false;
    const ts = new Date(t.dueDate).getTime();
    return ts >= today.getTime() && ts <= horizon;
  }).length;
}

/** Greeting per BUILD_SPEC §7.1 row 1 — time-aware. */
export function greeting(name = "La'Dajia", now = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return `Good morning, ${name}`;
  if (hour < 17) return `Good afternoon, ${name}`;
  return `Good evening, ${name}`;
}

/** Map PM Inbox rows into recent-activity agent entries (BUILD_SPEC §7.1). */
export function inboxToActivityEntries(items: InboxItem[], days = 7, now = new Date()): AuditLogEntry[] {
  const floor = now.getTime() - days * 24 * 60 * 60 * 1000;
  return items
    .filter((item) => {
      if (!item.createdAt) return true;
      return new Date(item.createdAt).getTime() >= floor;
    })
    .map((item) => ({
      id: `inbox-${item.id}`,
      matterId: item.matterId || "firm",
      timestamp: item.createdAt || now.toISOString(),
      actor: item.agent || "PM",
      agent: item.agent || "pm_orchestrator",
      summary: item.title || item.whatNeeded || "PM inbox review",
    }));
}

export type ActivityFeedEntry = {
  id: string;
  matterId: string;
  timestamp: string;
  actor: string;
  kind: "note" | "task_completed" | "document" | "agent" | "correction";
  summary: string;
};

/**
 * Recent Activity feed per BUILD_SPEC §7.1 row 5.
 * Interleaves notes, completed tasks, and audit entries within the last
 * `days` window. Documents and events are added by callers when seed-loaded.
 */
export function recentActivity(
  options: {
    notes?: Note[];
    completedTasks?: Task[];
    auditLog?: AuditLogEntry[];
    days?: number;
    now?: Date;
    limit?: number;
  } = {},
): ActivityFeedEntry[] {
  const { notes = [], completedTasks = [], auditLog = [], days = 7, now = new Date(), limit = 25 } = options;
  const floor = now.getTime() - days * 24 * 60 * 60 * 1000;
  const entries: ActivityFeedEntry[] = [];

  for (const n of notes) {
    const ts = new Date(n.createdAt).getTime();
    if (ts < floor) continue;
    entries.push({
      id: `note-${n.id}`,
      matterId: n.matterId,
      timestamp: n.createdAt,
      actor: n.author,
      kind: n.type === "Correction" ? "correction" : "note",
      summary: n.content.slice(0, 140),
    });
  }

  for (const t of completedTasks) {
    if (t.status !== "Done" || !t.dueDate) continue;
    const ts = new Date(t.dueDate).getTime();
    if (ts < floor) continue;
    entries.push({
      id: `task-${t.id}`,
      matterId: t.matterId,
      timestamp: t.dueDate,
      actor: t.assignedTo ?? "Attorney",
      kind: "task_completed",
      summary: `Completed: ${t.description}`,
    });
  }

  for (const a of auditLog) {
    const ts = new Date(a.timestamp).getTime();
    if (ts < floor) continue;
    entries.push({
      id: `audit-${a.id}`,
      matterId: a.matterId,
      timestamp: a.timestamp,
      actor: a.actor,
      kind: "agent",
      summary: a.summary,
    });
  }

  return entries
    .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))
    .slice(0, limit);
}
