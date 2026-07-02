import { cn } from "@/lib/utils";

/**
 * Centralized status pill. Every status label in the app routes through
 * this component so the semantic palette stays consistent (BUILD_SPEC §7
 * Clio-style polish). Palette uses `-50` backgrounds and `-700` text so
 * the badge sits quietly inside table rows.
 *
 * Buckets:
 *   - emerald (success / strong / resolved / complete)
 *   - sky      (in flight / open / active / moderate)
 *   - amber    (attention / pending / unread / intake / on hold / weak)
 *   - rose     (risk / overdue / blocked / dismissed)
 *   - slate    (terminal / archived / unknown)
 */
const PALETTE = {
  emerald: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20",
  sky: "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-600/20",
  amber: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/20",
  rose: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20",
  slate: "bg-slate-50 text-slate-700 ring-1 ring-inset ring-slate-500/20",
} as const;

type Bucket = keyof typeof PALETTE;

const STATUS_BUCKETS: Record<string, Bucket> = {
  // BUILD_SPEC §7 fidelity / strength ladder
  Strong: "emerald",
  Moderate: "sky",
  Weak: "amber",
  "At Risk": "rose",
  Unknown: "slate",
  // Matter / task lifecycle
  Active: "emerald",
  Open: "sky",
  "In Progress": "sky",
  Intake: "amber",
  Pending: "amber",
  "Pending Filing": "amber",
  "On Hold": "amber",
  "To Do": "slate",
  Blocked: "rose",
  Closed: "slate",
  Archived: "slate",
  Done: "emerald",
  Complete: "emerald",
  Completed: "emerald",
  Filed: "emerald",
  // Inbox + correction lifecycle
  Unread: "amber",
  Read: "slate",
  Resolved: "emerald",
  Dismissed: "slate",
  // Assignment intake lifecycle (Submitted -> In Progress -> Ready for
  // Review -> Approved / Returned)
  Submitted: "amber",
  "Ready for Review": "sky",
  Returned: "rose",
  Approved: "emerald",
};

function bucketFor(status: string): Bucket {
  return STATUS_BUCKETS[status] ?? "slate";
}

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const bucket = bucketFor(status);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        PALETTE[bucket],
        className,
      )}
    >
      {status}
    </span>
  );
}
