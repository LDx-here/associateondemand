import { Link } from "wouter";
import { trpc } from "../../lib/trpc";
import { DashboardLayout } from "../../components/admin/DashboardLayout";

export default function AdminDashboard() {
  const pipeline = trpc.matters.getPipeline.useQuery();
  const leads = trpc.leads.list.useQuery();

  const stages = pipeline.data ?? {};
  const totalMatters = Object.values(stages).flat().length;
  const activeLeads = (leads.data ?? []).filter((l) => l.status === "in_progress").length;

  return (
    <DashboardLayout title="Dashboard">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="card">
          <p className="text-sm text-[var(--color-secondary)]">Total matters</p>
          <p className="text-3xl font-semibold">{totalMatters}</p>
        </div>
        <div className="card">
          <p className="text-sm text-[var(--color-secondary)]">In intake</p>
          <p className="text-3xl font-semibold">{stages.intake?.length ?? 0}</p>
        </div>
        <div className="card">
          <p className="text-sm text-[var(--color-secondary)]">Active leads</p>
          <p className="text-3xl font-semibold">{activeLeads}</p>
        </div>
      </div>
      <div className="mt-8">
        <Link href="/admin/matters" className="btn btn-primary">
          Open pipeline →
        </Link>
      </div>
    </DashboardLayout>
  );
}
