import { NextResponse } from "next/server";

import { handleCheckoutSessionCompleted } from "@/lib/stripe-webhook-handlers";
import { getStripe, getStripeWebhookSecret } from "@/lib/stripe-config";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const webhookSecret = getStripeWebhookSecret();
  if (!webhookSecret) {
    return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET is not configured." }, { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header." }, { status: 400 });
  }

  const body = await req.text();
  const stripe = getStripe();

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const result = await handleCheckoutSessionCompleted(event.data.object);
    if (!result.handled) {
      return NextResponse.json({ received: true, skipped: result.reason });
    }
    return NextResponse.json({ received: true, inboxItemId: result.inboxItemId });
  }

  return NextResponse.json({ received: true, ignored: event.type });
}
