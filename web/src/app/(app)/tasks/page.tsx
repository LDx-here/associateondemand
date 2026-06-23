import {
  listAllTasks,
  listMatters,
  useDemoMode,
} from "@/lib/data-store";
import { GlobalTaskList } from "@/components/GlobalTaskList";

export const dynamic = "force-dynamic";

export default async function GlobalTasksPage() {
  const [tasks, matters] = await Promise.all([listAllTasks(), listMatters()]);
  const demo = useDemoMode();
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Tasks</h1>
        <p className="text-sm text-slate-600">
          Every open task across every matter. Use the filters to narrow by
          matter, status, priority, or filing deadlines.
        </p>
      </header>

      <GlobalTaskList
        initialTasks={tasks}
        matters={matters.map((m) => ({
          id: m.id,
          matterId: m.matterId,
          assignedAttorney: m.assignedAttorney,
        }))}
        demoMode={demo}
      />
    </div>
  );
}
