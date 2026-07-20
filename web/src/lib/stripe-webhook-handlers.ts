import type Stripe from "stripe";

import { markAssignmentPaid } from "./assignment-payment";

export type WebhookHandleResult =
  | { handled: true; inboxItemId: string }
  | { handled: false; reason: string };

/** Process checkout.session.completed — idempotent when session already marked paid. */
export async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
): Promise<WebhookHandleResult> {
  const inboxItemId = session.metadata?.inboxItemId?.trim();
  if (!inboxItemId) {
    return { handled: false, reason: "Missing inboxItemId in session metadata." };
  }
  if (session.payment_status !== "paid") {
    return { handled: false, reason: `Session payment_status is ${session.payment_status}.` };
  }

  await markAssignmentPaid(inboxItemId, session.id);
  return { handled: true, inboxItemId };
}
