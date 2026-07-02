import { AssignmentIntakeForm } from "@/components/AssignmentIntakeForm";
import { listMatters } from "@/lib/data-store";

export const dynamic = "force-dynamic";

export default async function NewAssignmentPage() {
  const matters = await listMatters();
  const matterOptions = matters
    .map((m) => ({ matterId: m.matterId, label: `${m.matterId} — ${m.title || m.clientName}` }))
    .sort((a, b) => a.matterId.localeCompare(b.matterId));

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">New assignment</h1>
        <p className="text-sm text-slate-600">
          Submit a deliverable request — facts, tier, and (optionally) a new matter — straight to the
          PM Inbox for attorney triage.
        </p>
      </header>
      <AssignmentIntakeForm matterOptions={matterOptions} />
    </div>
  );
}
