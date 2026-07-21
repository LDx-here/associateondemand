import { Link } from "wouter";
import { trpc } from "../../lib/trpc";
import { DashboardLayout } from "../../components/admin/DashboardLayout";

const STAGES = [
  "intake",
  "conflict_check",
  "quote",
  "engagement",
  "drafting",
  "review",
  "delivery",
  "closed",
] as const;

export default function MatterPipeline() {
  const pipeline = trpc.matters.getPipeline.useQuery();
  const transition = trpc.matters.transitionStage.useMutation({
    onSuccess: () => pipeline.refetch(),
  });

  return (
    <DashboardLayout title="Matter Pipeline">
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGES.map((stage) => (
          <div key={stage} className="min-w-[220px] flex-shrink-0">
            <h3 className="mb-3 text-sm font-medium capitalize">{stage.replace(/_/g, " ")}</h3>
            <div className="space-y-2">
              {(pipeline.data?.[stage] ?? []).map((m) => (
                <div key={m.id} className="card p-3 text-sm">
                  <Link href={`/admin/matters/${m.id}`} className="font-medium hover:underline">
                    {m.title}
                  </Link>
                  <p className="text-xs text-[var(--color-secondary)]">{m.urgency}</p>
                  {stage !== "closed" && (
                    <button
                      className="mt-2 text-xs text-[var(--color-primary)]"
                      onClick={() => {
                        const idx = STAGES.indexOf(stage);
                        if (idx < STAGES.length - 1) {
                          transition.mutate({ matterId: m.id, targetStage: STAGES[idx + 1] });
                        }
                      }}
                    >
                      Advance →
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
