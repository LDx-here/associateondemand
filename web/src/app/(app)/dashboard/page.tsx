import Link from "next/link";
import { Activity, AlertCircle, Briefcase, CalendarClock, ClipboardList, Inbox } from "lucide-react";

import { EmptyState } from "@/components/EmptyState";
import { DashboardCharts } from "@/components/DashboardCharts";
import { KpiCard } from "@/components/KpiCard";
import { StatusBadge } from "@/components/StatusBadge";
import {
  filingDeadlinesWithin,
  greeting,
  overdueTasks,
  inboxToActivityEntries,
  recentActivity,
  upcomingDeadlines,
} from "@/lib/dashboard-aggregates";
import {
  listAllNotes,
  listAllTasks,
  listInboxItems,
  listMatters,
  useDemoMode,
} from "@/lib/data-store";
import { getMutableSeed } from "@/lib/demo-store-mutable";
import { linkMatter } from "@/lib/ui-classes";
import { formatDate } from "@/lib/utils";

function daysUntil(value: string | null | undefined, now = new Date()): number | null {
  if (!value) return null;
  const ms = new Date(value).getTime() - now.getTime();
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

export default async function DashboardPage() {
  const now = new Date();
  const matters = await listMatters();
  const tasks = await listAllTasks();
  const matterIndex = new Map(matters.map((m) => [m.matterId, m]));
  const demo = useDemoMode();
  const seed = demo ? await getMutableSeed() : null;

  const activeMatters = matters.filter((m) => {
    const s = m.status.toLowerCase();
    return s === "active" || s === "open" || (s !== "closed" && s !== "archived");
  });
  const overdue = overdueTasks(tasks, now);
  const filingDeadlines14 = filingDeadlinesWithin(tasks, 14, now);
  let inboxItems: Awaited<ReturnType<typeof listInboxItems>> = [];
  try {
    inboxItems = await listInboxItems();
  } catch {
    inboxItems = [];
  }
  const inboxUnread = inboxItems.filter(
    (i) => i.status === "Pending" || i.status === "Submitted",
  ).length;
  const openAssignments = inboxItems.filter(
    (i) => i.kind === "assignment" && i.status !== "Approved" && i.status !== "Returned",
  ).length;

  const deadlines30 = upcomingDeadlines(tasks, 30, now);
  const liveNotes = demo ? [] : await listAllNotes();
  let inboxAudit = seed?.auditLog ?? [];
  if (!demo) {
    inboxAudit = inboxToActivityEntries(
      inboxItems.filter((i) => i.kind !== "assignment"),
      7,
      now,
    );
  }
  const activity = recentActivity({
    notes: demo ? (seed?.notes ?? []) : liveNotes,
    completedTasks: demo
      ? (seed?.tasks.filter((t) => t.status === "Done") ?? [])
      : tasks.filter((t) => t.status === "Done"),
    auditLog: inboxAudit,
    days: 7,
    now,
  });

  const todayLabel = now.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const statusCounts = [...new Set(matters.map((m) => m.status || "Unknown"))]
    .map((name) => ({ name, value: matters.filter((m) => (m.status || "Unknown") === name).length }))
    .filter((row) => row.value > 0);
  const caseTypeCounts = [...new Set(matters.map((m) => m.caseType).filter(Boolean))]
    .map((name) => ({ name, value: matters.filter((m) => m.caseType === name).length }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">{greeting("La'Dajia", now)}</h1>
        <p className="text-sm text-slate-600">{todayLabel}</p>
        {demo ? (
          <p className="mt-1 text-xs text-slate-500">
            Showing sample data. Connect Airtable in Settings to load live matters.
          </p>
        ) : null}
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard label="Active matters" value={activeMatters.length} icon={Briefcase} />
        <KpiCard label="Overdue tasks" value={overdue.length} hint="Past due, not complete" icon={AlertCircle} />
        <KpiCard
          label="Upcoming deadlines"
          value={filingDeadlines14}
          hint="Filing deadlines, next 14 days"
          icon={CalendarClock}
        />
        <KpiCard label="PM inbox unread" value={inboxUnread} hint="Awaiting attorney review" icon={Inbox} />
        <KpiCard
          label="Open assignments"
          value={openAssignments}
          hint="Submitted, in progress, or ready for review"
          icon={ClipboardList}
        />
      </section>

      <DashboardCharts statusCounts={statusCounts} caseTypeCounts={caseTypeCounts} />

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="font-medium text-slate-900">Upcoming deadlines (next 30 days)</h2>
        </div>
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
            <tr>
              <th className="px-4 py-2">Matter</th>
              <th className="px-4 py-2">Description</th>
              <th className="px-4 py-2">Due</th>
              <th className="px-4 py-2">Days until</th>
              <th className="px-4 py-2">Priority</th>
              <th className="px-4 py-2">Assigned</th>
            </tr>
          </thead>
          <tbody>
            {deadlines30.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-2">
                  <EmptyState
                    icon={CalendarClock}
                    title="No deadlines yet."
                    description="Deadlines from tasks will appear here when they are due in the next 30 days."
                  />
                </td>
              </tr>
            ) : (
              deadlines30.map((t) => {
                const matter = matterIndex.get(t.matterId);
                const filing = t.isFilingDeadline;
                return (
                  <tr
                    key={t.id}
                    className={`border-t border-slate-100 hover:bg-slate-50 ${
                      filing ? "border-l-4 border-l-rose-500 font-semibold" : ""
                    }`}
                  >
                    <td className="px-4 py-2">
                      <Link className={linkMatter} href={`/matters/${t.matterId}`}>
                        {t.matterId}
                      </Link>
                    </td>
                    <td className="px-4 py-2">{t.description}</td>
                    <td className="px-4 py-2 tabular-nums">{formatDate(t.dueDate)}</td>
                    <td className="px-4 py-2 tabular-nums">{daysUntil(t.dueDate, now) ?? "—"}</td>
                    <td className="px-4 py-2">{t.priority}</td>
                    <td className="px-4 py-2">
                      {t.assignedTo || matter?.assignedAttorney || "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="font-medium text-slate-900">Overdue tasks</h2>
        </div>
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
            <tr>
              <th className="px-4 py-2">Matter</th>
              <th className="px-4 py-2">Description</th>
              <th className="px-4 py-2">Due</th>
              <th className="px-4 py-2">Days late</th>
              <th className="px-4 py-2">Priority</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {overdue.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-slate-500">
                  No overdue tasks. You are caught up.
                </td>
              </tr>
            ) : (
              overdue.map((t) => {
                const d = daysUntil(t.dueDate, now);
                return (
                  <tr key={t.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-2">
                      <Link className={linkMatter} href={`/matters/${t.matterId}`}>
                        {t.matterId}
                      </Link>
                    </td>
                    <td className="px-4 py-2">{t.description}</td>
                    <td className="px-4 py-2 tabular-nums">{formatDate(t.dueDate)}</td>
                    <td className="px-4 py-2 text-rose-700 tabular-nums">{d === null ? "—" : Math.abs(d)}</td>
                    <td className="px-4 py-2">{t.priority}</td>
                    <td className="px-4 py-2">
                      <StatusBadge status={t.status} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="font-medium text-slate-900">Recent activity</h2>
          <p className="text-xs text-slate-500">Last 7 days across notes, completed tasks, and agent actions.</p>
        </div>
        {activity.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="No recent activity yet."
            description="Notes, completed tasks, and agent actions from the last week will show here."
          />
        ) : (
          <ol className="divide-y divide-slate-100">
            {activity.map((entry) => (
              <li key={entry.id} className="px-4 py-3 text-sm">
                <div className="flex items-baseline justify-between gap-2">
                  <Link className={linkMatter} href={`/matters/${entry.matterId}`}>
                    {entry.matterId}
                  </Link>
                  <span className="text-xs uppercase tracking-wide text-slate-400">
                    {entry.kind.replace("_", " ")}
                  </span>
                </div>
                <p className="mt-0.5 text-slate-800">{entry.summary}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {new Date(entry.timestamp).toLocaleString()} · {entry.actor}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
