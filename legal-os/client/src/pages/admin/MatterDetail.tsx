import { useRoute } from "wouter";
import { trpc } from "../../lib/trpc";
import { DashboardLayout } from "../../components/admin/DashboardLayout";

export default function MatterDetail() {
  const [, params] = useRoute("/admin/matters/:id");
  const id = Number(params?.id);
  const matter = trpc.matters.getById.useQuery({ id }, { enabled: id > 0 });
  const tasks = trpc.agents.listTasks.useQuery({ matterId: id }, { enabled: id > 0 });
  const docs = trpc.files.listByMatter.useQuery({ matterId: id }, { enabled: id > 0 });
  const generateDraft = trpc.drafting.generateDraft.useMutation();

  if (matter.isLoading) return <DashboardLayout title="Matter">Loading…</DashboardLayout>;
  if (!matter.data) return <DashboardLayout title="Matter">Not found</DashboardLayout>;

  const m = matter.data;

  return (
    <DashboardLayout title={m.title}>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card space-y-2 text-sm">
          <p><strong>Stage:</strong> {m.stage}</p>
          <p><strong>Status:</strong> {m.status}</p>
          <p><strong>Next action:</strong> {m.nextAction ?? "—"}</p>
          <p><strong>Urgency:</strong> {m.urgency}</p>
          <p><strong>Payment:</strong> {m.paymentStatus}</p>
          {m.totalFee && <p><strong>Fee:</strong> ${Number(m.totalFee)}</p>}
        </div>
        <div className="card">
          <h3 className="mb-3 font-semibold">Agent tasks</h3>
          <ul className="space-y-2 text-sm">
            {(tasks.data ?? []).map((t) => (
              <li key={t.id} className="flex justify-between">
                <span>{t.taskType}</span>
                <span className="badge badge-accent">{t.status}</span>
              </li>
            ))}
            {(tasks.data ?? []).length === 0 && <li className="text-[var(--color-secondary)]">No tasks</li>}
          </ul>
          {m.stage === "drafting" && (
            <button
              className="btn btn-primary mt-4"
              onClick={() =>
                generateDraft.mutate({
                  matterId: id,
                  taskType: "motion_to_dismiss",
                  instructions: "Draft based on matter details.",
                })
              }
            >
              Generate draft
            </button>
          )}
        </div>
        <div className="card lg:col-span-2">
          <h3 className="mb-3 font-semibold">Documents</h3>
          <ul className="text-sm">
            {(docs.data ?? []).map((d) => (
              <li key={d.id}>{d.fileName} — {d.documentType}</li>
            ))}
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
}
