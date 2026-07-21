import { trpc } from "../../lib/trpc";
import { DashboardLayout } from "../../components/admin/DashboardLayout";

export default function AgentRegistry() {
  const agents = trpc.agents.list.useQuery();
  const tasks = trpc.agents.listTasks.useQuery({ status: "pending" });

  return (
    <DashboardLayout title="Agent Registry">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h3 className="mb-4 font-semibold">Registered agents</h3>
          <ul className="space-y-3">
            {(agents.data ?? []).map((a) => (
              <li key={a.id} className="flex justify-between text-sm">
                <span>{a.name}</span>
                <span className="badge badge-accent">{a.type}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="card">
          <h3 className="mb-4 font-semibold">Pending tasks</h3>
          <ul className="space-y-2 text-sm">
            {(tasks.data ?? []).map((t) => (
              <li key={t.id}>Matter #{t.matterId} — {t.taskType}</li>
            ))}
            {(tasks.data ?? []).length === 0 && <li className="text-[var(--color-secondary)]">None</li>}
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
}
