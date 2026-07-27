import type { AuditLogEntry, Matter, Note, Task } from "./types";
import type { InboxItem } from "./airtable/queries";
import { MATTER_LIFECYCLE_STAGES, normalizeLifecycleStage } from "./matter-lifecycle-stage";

/** Rough hours saved per approved overflow deliverable (capacity relief metric). */
const HOURS_SAVED_PER_DELIVERABLE = 4;

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

/**
 * Matters grouped by lifecycle stage (Intake/Active/Filed/Resolution/Closed),
 * in canonical stage order — dashboard visibility for the stage-automation
 * built into the matter workbench. Google Sheets-only (same as the stage
 * feature itself); callers should gate rendering behind `usesGoogleSheets()`.
 */
export function matterLifecycleBreakdown(
  matters: Matter[],
): Array<{ stage: (typeof MATTER_LIFECYCLE_STAGES)[number]; count: number }> {
  const counts = new Map(MATTER_LIFECYCLE_STAGES.map((s) => [s, 0]));
  for (const m of matters) {
    const stage = normalizeLifecycleStage(m.lifecycleStage);
    counts.set(stage, (counts.get(stage) ?? 0) + 1);
  }
  return MATTER_LIFECYCLE_STAGES.map((stage) => ({ stage, count: counts.get(stage) ?? 0 }));
}

/** Greeting per BUILD_SPEC §7.1 row 1 — time-aware. */
export function greeting(name = "La'Dajia", now = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return `Good morning, ${name}`;
  if (hour < 17) return `Good afternoon, ${name}`;
  return `Good evening, ${name}`;
}

/** Overflow-counsel dashboard KPIs — relief framing (Master Roadmap Phase 1). */
export function overflowDashboardMetrics(items: InboxItem[], now = new Date()) {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const assignments = items.filter((item) => item.kind === "assignment");

  const approvedThisMonth = assignments.filter((item) => {
    if (item.status !== "Approved") return false;
    const resolvedAt = item.resolvedAt ?? item.createdAt;
    if (!resolvedAt) return false;
    return new Date(resolvedAt) >= monthStart;
  });

  const deliverablesInReview = assignments.filter((item) => item.status === "Ready for review").length;
  const openAssignments = assignments.filter((item) =>
    ["Submitted", "In progress", "Returned"].includes(item.status),
  ).length;

  return {
    hoursSavedThisMonth: approvedThisMonth.length * HOURS_SAVED_PER_DELIVERABLE,
    deliverablesInReview,
    openAssignments,
    awaitingPayment: assignments.filter((item) => item.paymentStatus === "pending").length,
    completedThisMonth: approvedThisMonth.length,
    activeProjects: assignments.filter((item) =>
      ["Submitted", "In progress", "Ready for review", "Returned"].includes(item.status),
    ).length,
  };
}

/** Firm Memory profile completeness (0–100) for dashboard CTA. */
export function firmMemoryCompleteness(status: {
  templateCount: number;
  sampleCount: number;
  stylePreferenceCount: number;
}): number {
  let score = 0;
  if (status.templateCount > 0) score += 34;
  if (status.sampleCount > 0) score += 33;
  if (status.stylePreferenceCount > 0) score += 33;
  return Math.min(100, score);
}

/** Subtitle for overflow partner vs RMV internal (email-domain heuristic). */
export function overflowWelcomeSubtitle(email?: string | null): string {
  const domain = email?.split("@")[1]?.toLowerCase() ?? "";
  if (domain.includes("recovermyvalue") || domain.includes("rmv")) {
    return "Your overflow counsel queue — verified deliverables for partner firms.";
  }
  return "Capacity relief from verified overflow counsel — submit assignments, review deliverables, sign off.";
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
