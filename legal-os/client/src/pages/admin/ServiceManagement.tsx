import { trpc } from "../../lib/trpc";
import { DashboardLayout } from "../../components/admin/DashboardLayout";

export default function ServiceManagement() {
  const services = trpc.services.list.useQuery();

  return (
    <DashboardLayout title="Services & Pricing">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)]">
              {["Name", "Category", "Base fee", "Turnaround"].map((h) => (
                <th key={h} className="px-3 py-2 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(services.data ?? []).map((s) => (
              <tr key={s.id} className="border-b border-[var(--color-border)]">
                <td className="px-3 py-2">{s.name}</td>
                <td className="px-3 py-2">{s.category}</td>
                <td className="px-3 py-2">${Number(s.baseFee).toFixed(2)}</td>
                <td className="px-3 py-2">{s.standardTurnaround}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}
