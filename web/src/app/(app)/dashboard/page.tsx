import Link from "next/link";

import { KpiCard } from "@/components/KpiCard";
import { StatusBadge } from "@/components/StatusBadge";
import {
  filingDeadlinesWithin,
  greeting,
  overdueTasks,
  recentActivity,
  upcomingDeadlines,
} from "@/lib/dashboard-aggregates";
import {
  listAllTasks,
  listMatters,
  useDemoMode,
} from "@/lib/data-store";
import { getMutableSeed } from "@/lib/demo-store-mutable";
import { countUnreadInboxFromAirtable } from "@/lib/airtable/queries";

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

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

  const activeMatters = matters.filter((m) => m.status !== "Closed");
  const overdue = overdueTasks(tasks, now);
  const filingDeadlines14 = filingDeadlinesWithin(tasks, 14, now);
  let inboxUnread = 0;
  if (!demo) {
    try {
      inboxUnread = await countUnreadInboxFromAirtable();
    } catch {
      inboxUnread = 0;
    }
  }

  const deadlines30 = upcomingDeadlines(tasks, 30, now);
  const activity = recentActivity({
    notes: seed?.notes ?? [],
    completedTasks: seed?.tasks.filter((t) => t.status === "Done") ?? tasks.filter((t) => t.status === "Done"),
    auditLog: seed?.auditLog ?? [],
    days: 7,
    now,
  });

  const todayLabel = now.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">{greeting("La'Dajia", now)}</h1>
        <p className="text-sm text-slate-600">{todayLabel}</p>
        <p className="mt-1 text-xs text-slate-500">
          {demo
            ? "Showing bundled demo matters. Add a valid Airtable PAT to web/.env.local for live data."
            : "Connected to Airtable."}
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Active matters" value={activeMatters.length} />
        <KpiCard label="Overdue tasks" value={overdue.length} hint="Past due, not complete" />
        <KpiCard label="Upcoming deadlines" value={filingDeadlines14} hint="Filing deadlines, next 14 days" />
        <KpiCard label="PM inbox unread" value={inboxUnread} hint="Awaiting attorney review" />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="font-medium text-slate-900">Upcoming deadlines (next 30 days)</h2>
        </div>
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
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
                <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                  No deadlines in the next 30 days.
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
                      <Link
                        className="text-sky-700 hover:underline"
                        href={`/matters/${t.matterId}`}
                      >
                        {t.matterId}
                      </Link>
                    </td>
                    <td className="px-4 py-2">{t.description}</td>
                    <td className="px-4 py-2">{formatDate(t.dueDate)}</td>
                    <td className="px-4 py-2">{daysUntil(t.dueDate, now) ?? "—"}</td>
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
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
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
                <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                  Nothing overdue. Good.
                </td>
              </tr>
            ) : (
              overdue.map((t) => {
                const d = daysUntil(t.dueDate, now);
                return (
                  <tr key={t.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-2">
                      <Link className="text-sky-700 hover:underline" href={`/matters/${t.matterId}`}>
                        {t.matterId}
                      </Link>
                    </td>
                    <td className="px-4 py-2">{t.description}</td>
                    <td className="px-4 py-2">{formatDate(t.dueDate)}</td>
                    <td className="px-4 py-2 text-rose-700">{d === null ? "—" : Math.abs(d)}</td>
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
        <ol className="divide-y divide-slate-100">
          {activity.length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-slate-500">
              No recent activity yet.
            </li>
          ) : (
            activity.map((entry) => (
              <li key={entry.id} className="px-4 py-3 text-sm">
                <div className="flex items-baseline justify-between gap-2">
                  <Link className="font-medium text-sky-700 hover:underline" href={`/matters/${entry.matterId}`}>
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
            ))
          )}
        </ol>
      </section>
    </div>
  );
}
