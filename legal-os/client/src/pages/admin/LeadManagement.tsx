import { trpc } from "../../lib/trpc";
import { DashboardLayout } from "../../components/admin/DashboardLayout";

export default function LeadManagement() {
  const leads = trpc.leads.list.useQuery();
  const convert = trpc.leads.convertToMatter.useMutation({ onSuccess: () => leads.refetch() });

  return (
    <DashboardLayout title="Leads">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)]">
              {["Firm", "Attorney", "Email", "Path", "Status", "Last Step", "Actions"].map((h) => (
                <th key={h} className="px-3 py-2 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(leads.data ?? []).map((l) => (
              <tr key={l.id} className="border-b border-[var(--color-border)]">
                <td className="px-3 py-2">{l.firmName}</td>
                <td className="px-3 py-2">{l.attorneyName}</td>
                <td className="px-3 py-2">{l.email}</td>
                <td className="px-3 py-2">{l.intakePath ?? "—"}</td>
                <td className="px-3 py-2">{l.status}</td>
                <td className="px-3 py-2">{l.lastStepCompleted ?? "—"}</td>
                <td className="px-3 py-2">
                  {l.status !== "converted" && (
                    <button
                      className="text-[var(--color-primary)]"
                      onClick={() => convert.mutate({ leadId: l.id })}
                    >
                      Convert to matter
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}
