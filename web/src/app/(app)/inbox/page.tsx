import { listInboxItems, useDemoMode } from "@/lib/data-store";
import { InboxBoard } from "@/components/InboxBoard";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const demo = useDemoMode();
  const items = await listInboxItems();
  const assignments = items.filter(
    (item) => item.kind === "assignment" && item.status !== "Approved" && item.status !== "Returned",
  );
  const pending = items.filter((item) => item.kind !== "assignment" && item.status === "Pending");
  const resolved = items
    .filter(
      (item) =>
        (item.kind === "assignment" && (item.status === "Approved" || item.status === "Returned")) ||
        (item.kind !== "assignment" && item.status !== "Pending"),
    )
    .slice(0, 25);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">PM Inbox</h1>
        <p className="text-sm text-slate-600">
          New assignments and agent flags the PM orchestrator routed for attorney review. Resolve
          from here to clear the unread badge on the dashboard.
        </p>
      </header>

      <InboxBoard assignments={assignments} pending={pending} resolved={resolved} demoMode={demo} />
    </div>
  );
}
