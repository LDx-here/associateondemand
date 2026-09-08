import type Stripe from "stripe";

import { markAssignmentPaid } from "./assignment-payment";
import { markInvoicePaid } from "./data-store";

export type WebhookHandleResult =
  | { handled: true; inboxItemId?: string; invoiceId?: string }
  | { handled: false; reason: string };

/** Process checkout.session.completed — idempotent when session already marked paid. */
export async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
): Promise<WebhookHandleResult> {
  if (session.payment_status !== "paid") {
    return { handled: false, reason: `Session payment_status is ${session.payment_status}.` };
  }

  // A client invoice carries matterId + invoiceId; a marketplace assignment
  // carries inboxItemId. One session is never both.
  const matterId = session.metadata?.matterId?.trim();
  const invoiceId = session.metadata?.invoiceId?.trim();
  if (matterId && invoiceId) {
    const marked = await markInvoicePaid(matterId, invoiceId);
    if (!marked) return { handled: false, reason: `Invoice ${invoiceId} not found on ${matterId}.` };
    return { handled: true, invoiceId };
  }

  const inboxItemId = session.metadata?.inboxItemId?.trim();
  if (!inboxItemId) {
    return { handled: false, reason: "Missing invoice or assignment metadata in session." };
  }

  await markAssignmentPaid(inboxItemId, session.id);
  return { handled: true, inboxItemId };
}
