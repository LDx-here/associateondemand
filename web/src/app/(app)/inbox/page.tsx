import {
  listInboxItemsFromAirtable,
  type InboxItem,
} from "@/lib/airtable/queries";
import { useDemoMode } from "@/lib/data-store";
import { InboxBoard } from "@/components/InboxBoard";

export const dynamic = "force-dynamic";

const DEMO_INBOX: InboxItem[] = [
  {
    id: "demo-inbox-1",
    title: "Research: Sixth Circuit asylum standard",
    matterId: "AOD-1001",
    agent: "Research Agent",
    whatTried:
      "Loaded the Five-Anchors SKILL and gathered gov + practice-resource hits for Matter of A-B- progeny.",
    whatNeeded:
      "Attorney to confirm whether the strategy memo should cite Niang v. Holder.",
    options: ["Approve", "Modify", "Defer"],
    status: "Pending",
    resolution: "",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    resolvedAt: null,
  },
  {
    id: "demo-inbox-2",
    title: "Fact extraction confidence low",
    matterId: "AOD-1003",
    agent: "Fact Extraction",
    whatTried:
      "Extracted 14 facts from intake declaration; 4 anchored to corroborating documents.",
    whatNeeded:
      "Attorney to review uncertain facts before strategy memo is finalised.",
    options: ["Approve", "Reject"],
    status: "Pending",
    resolution: "",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(),
    resolvedAt: null,
  },
];

export default async function InboxPage() {
  const demo = useDemoMode();
  const items = demo ? DEMO_INBOX : await listInboxItemsFromAirtable();
  const pending = items.filter((item) => item.status === "Pending");
  const resolved = items
    .filter((item) => item.status !== "Pending")
    .slice(0, 25);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">PM Inbox</h1>
        <p className="text-sm text-slate-600">
          Items the orchestrator routed for attorney review. Resolve from here
          to clear the unread badge on the dashboard.
        </p>
      </header>

      <InboxBoard pending={pending} resolved={resolved} demoMode={demo} />
    </div>
  );
}
