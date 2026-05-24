import { MattersTable } from "@/components/MattersTable";
import { listMatters } from "@/lib/data-store";

export default async function MattersPage() {
  const matters = await listMatters();
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Matters</h1>
        <p className="text-sm text-slate-600">Sort and filter your active caseload.</p>
      </header>
      <MattersTable matters={matters} />
    </div>
  );
}
