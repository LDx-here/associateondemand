import { MattersTable } from "@/components/MattersTable";
import { NewMatterButton } from "@/components/NewMatterButton";
import { listMatters, useDemoMode } from "@/lib/data-store";

export default async function MattersPage() {
  const matters = await listMatters();
  const demo = useDemoMode();
  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Matters</h1>
          <p className="text-sm text-slate-600">Sort and filter your active caseload.</p>
        </div>
        <NewMatterButton demoMode={demo} />
      </header>
      <MattersTable matters={matters} />
    </div>
  );
}
