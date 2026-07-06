"use client";

import { CheckCircle2 } from "lucide-react";
import { useState } from "react";

import { useToast } from "@/components/Toast";
import { emitMatterReviewRefresh } from "@/lib/matter-review-events";
import { btnPrimary, btnSecondary } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

type Props = {
  matterId: string;
  assignmentId?: string;
  deliverableLabel?: string;
  demoMode?: boolean;
  compact?: boolean;
  onAdvanced?: () => void;
};

export function DeliverableReadyInline({
  matterId,
  assignmentId,
  deliverableLabel,
  demoMode = false,
  compact = false,
  onAdvanced,
}: Props) {
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function markReadyForReview() {
    if (!assignmentId || demoMode) return;
    setBusy(true);
    try {
      const resp = await fetch(`/api/inbox/${assignmentId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "Ready for review",
          note: "Agent output saved — ready for attorney sign-off.",
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        showToast(data.error || `Could not update assignment (${resp.status}).`, "error");
        return;
      }
      setDone(true);
      showToast("Moved to Ready for review — approve in the panel above.", "success");
      emitMatterReviewRefresh(matterId);
      onAdvanced?.();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Network error.", "error");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-900",
          compact ? "text-xs" : "text-sm",
        )}
      >
        <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
        <span>Marked ready for review — use Deliverable review above to approve.</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-md border border-emerald-200 bg-emerald-50/60",
        compact ? "p-2.5 text-xs" : "p-3 text-sm",
      )}
    >
      <p className="font-medium text-emerald-900">
        {deliverableLabel ? `${deliverableLabel} — ` : ""}Work product ready for review
      </p>
      <p className="mt-1 text-emerald-800">
        Output saved to matter notes.{" "}
        {assignmentId
          ? "Advance the linked assignment when edits are complete."
          : "Submit an assignment from the matter header if you need formal sign-off."}
      </p>
      {assignmentId ? (
        <button
          type="button"
          disabled={busy || demoMode}
          className={cn(btnPrimary, "mt-2 text-xs")}
          onClick={() => void markReadyForReview()}
        >
          {busy ? "Updating…" : "Mark ready for review"}
        </button>
      ) : null}
      {demoMode && assignmentId ? (
        <p className="mt-1 text-[10px] text-amber-700">Connect live Airtable to advance assignment lanes.</p>
      ) : null}
    </div>
  );
}
