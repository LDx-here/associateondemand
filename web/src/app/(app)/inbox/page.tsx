import Link from "next/link";

import { AssignmentBoard } from "@/components/AssignmentBoard";
import { InboxBoard } from "@/components/InboxBoard";
import { listInboxItems, useDemoMode } from "@/lib/data-store";
import { btnPrimary } from "@/lib/ui-classes";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const demo = useDemoMode();
  const items = await listInboxItems();

  const assignments = items.filter((item) => item.kind === "assignment");
  const agentFlags = items.filter((item) => item.kind !== "assignment");
  const pending = agentFlags.filter((item) => item.status === "Pending");
  const resolved = agentFlags.filter((item) => item.status !== "Pending").slice(0, 25);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">PM Inbox</h1>
          <p className="text-sm text-slate-600">
            Assignments move Submitted → In progress → Ready for review → Returned / Approved. Agent
            escalations below need a quick approve, reject, or resolution note.
          </p>
        </div>
        <Link href="/assignments/new" className={btnPrimary}>
          New assignment
        </Link>
      </header>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Assignments ({assignments.length})
        </h2>
        <AssignmentBoard assignments={assignments} demoMode={demo} />
      </section>

      <section className="space-y-4 border-t border-slate-200 pt-6">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Agent escalations</h2>
          <p className="text-xs text-slate-500">
            Items an agent routed here because it hit a gap, low-confidence extraction, or MANUAL FLAG.
          </p>
        </div>
        <InboxBoard pending={pending} resolved={resolved} demoMode={demo} />
      </section>
    </div>
  );
}
