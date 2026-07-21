import { trpc } from "../../lib/trpc";
import { DashboardLayout } from "../../components/admin/DashboardLayout";

export default function ClioIntegration() {
  const status = trpc.clio.getConnectionStatus.useQuery();
  const events = trpc.clio.listWebhookEvents.useQuery();

  return (
    <DashboardLayout title="Clio Integration">
      <div className="card mb-6 max-w-2xl">
        <h3 className="mb-2 font-semibold">Connection status</h3>
        {status.data?.configured ? (
          <p className="text-sm">
            Configured: {status.data.connected ? "Connected" : "Not connected — complete OAuth"}
          </p>
        ) : (
          <div className="text-sm text-[var(--color-secondary)]">
            <p className="mb-2 font-medium text-[var(--color-destructive)]">Disabled per LEGAL_BOUNDARIES.md</p>
            <p>
              Clio requires a paying subscription and scoped business need. To enable: set{" "}
              <code>CLIO_ENABLED=true</code> plus OAuth credentials in <code>.env</code>.
            </p>
            <p className="mt-2">{status.data?.message}</p>
          </div>
        )}
      </div>
      <div className="card">
        <h3 className="mb-4 font-semibold">Recent webhook events</h3>
        <ul className="space-y-2 text-sm">
          {(events.data ?? []).map((e) => (
            <li key={e.id}>{e.eventType} — {e.resourceType} #{e.resourceId}</li>
          ))}
          {(events.data ?? []).length === 0 && <li className="text-[var(--color-secondary)]">None</li>}
        </ul>
      </div>
    </DashboardLayout>
  );
}
