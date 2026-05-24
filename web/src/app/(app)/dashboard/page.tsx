import Link from "next/link";

import { KpiCard } from "@/components/KpiCard";
import { StatusBadge } from "@/components/StatusBadge";
import { mattersWithDeadlineSoon, overdueTasks } from "@/lib/dashboard-aggregates";
import { listAllTasks, listMatters, useDemoMode } from "@/lib/data-store";

export default async function DashboardPage() {
  const matters = await listMatters();
  const tasks = await listAllTasks();
  const overdue = overdueTasks(tasks);
  const deadlines7 = mattersWithDeadlineSoon(matters, 7);
  const deadlines30 = mattersWithDeadlineSoon(matters, 30);
  const activeMatters = matters.filter((m) => m.status !== "Closed");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-600">
          {useDemoMode()
            ? "Showing bundled demo matters. Add Airtable credentials to web/.env.local for live data."
            : "Connected to Airtable."}
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Active matters" value={activeMatters.length} />
        <KpiCard label="Overdue tasks" value={overdue.length} hint="Across all matters" />
        <KpiCard label="Deadlines (7d)" value={deadlines7.length} hint="Matters with next deadline" />
        <KpiCard label="Deadlines (30d)" value={deadlines30.length} hint="Matters with next deadline" />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="font-medium text-slate-900">Recent matters</h2>
        </div>
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">ID</th>
              <th className="px-4 py-2">Client</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Next deadline</th>
            </tr>
          </thead>
          <tbody>
            {matters.map((m) => (
              <tr key={m.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-2">
                  <Link className="font-medium text-sky-700 hover:underline" href={`/matters/${m.matterId}`}>
                    {m.matterId}
                  </Link>
                </td>
                <td className="px-4 py-2">{m.clientName}</td>
                <td className="px-4 py-2">{m.caseType}</td>
                <td className="px-4 py-2">
                  <StatusBadge status={m.status} />
                </td>
                <td className={`px-4 py-2 ${m.nextDeadline ? "font-medium text-slate-900" : ""}`}>
                  {m.nextDeadline ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
