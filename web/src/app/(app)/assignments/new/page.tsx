import { AssignmentIntakeForm } from "@/components/AssignmentIntakeForm";
import { listMatters, isDemoMode } from "@/lib/data-store";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ deliverable?: string; matterId?: string }> };

export default async function NewAssignmentPage({ searchParams }: Props) {
  const params = await searchParams;
  const matters = await listMatters();
  const demo = isDemoMode();

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">New assignment</h1>
        <p className="text-sm text-slate-600">
          Submit a deliverable request — facts, tier, and optional attachments — and it lands in the PM Inbox
          Submitted lane for pickup.
        </p>
      </header>
      <AssignmentIntakeForm
        matters={matters}
        demoMode={demo}
        initialDeliverableId={params.deliverable}
        initialMatterId={params.matterId}
      />
    </div>
  );
}
