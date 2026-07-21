import { dispatchAssignmentToPm } from "./assignment-dispatch";
import { isDemoMode, updateAssignmentPayment, updateAssignmentStatus } from "./data-store";
import type { InboxItem } from "./types";

/**
 * Internal RMV operator intake never blocks on Stripe Checkout.
 * Partner law firms are invoiced off-platform (Phase 0) or pay at a future
 * external submission funnel (Phase 1). Stripe webhook routes remain for that funnel.
 */
export function requiresPaymentBeforeDispatch(): boolean {
  return false;
}

export async function dispatchAssignmentAfterPayment(item: InboxItem): Promise<{
  dispatch: Awaited<ReturnType<typeof dispatchAssignmentToPm>> | null;
  inboxItem: InboxItem;
}> {
  let inboxItem = item;
  let dispatch: Awaited<ReturnType<typeof dispatchAssignmentToPm>> | null = null;

  if (isDemoMode() || !item.matterId || !item.deliverableType || !item.tier || !item.facts) {
    return { dispatch, inboxItem };
  }

  dispatch = await dispatchAssignmentToPm(item.matterId, item.deliverableType, item.tier, item.facts);
  if (dispatch.started) {
    const advanced = await updateAssignmentStatus(inboxItem.id, "In progress", {
      note: `Auto-dispatched to ${dispatch.agent ?? "PM orchestrator"} after payment.`,
      by: "System",
    });
    if (advanced) inboxItem = advanced;

    if (dispatch.deliverableReady) {
      const lintNote =
        dispatch.documentLintPassed === false
          ? " Document linter flagged issues — fix before export."
          : "";
      const reviewed = await updateAssignmentStatus(inboxItem.id, "Ready for review", {
        note: `Associate draft ready for attorney sign-off (${dispatch.agent ?? "agent"}).${lintNote}`,
        by: "System",
      });
      if (reviewed) inboxItem = reviewed;
    }
  }

  return { dispatch, inboxItem };
}

export async function markAssignmentPaid(
  inboxItemId: string,
  stripeSessionId: string,
): Promise<InboxItem | null> {
  const updated = await updateAssignmentPayment(inboxItemId, {
    paymentStatus: "paid",
    stripeSessionId,
  });
  if (!updated || updated.paymentStatus !== "paid") return updated;

  await dispatchAssignmentAfterPayment(updated);
  return updated;
}
