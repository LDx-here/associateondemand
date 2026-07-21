import { NextResponse } from "next/server";

import { getInboxItemById, updateAssignmentPayment } from "@/lib/data-store";
import { formatUsdFromCents, quoteAssignmentAmount } from "@/lib/stripe-pricing";
import { getStripe, isStripeConfigured } from "@/lib/stripe-config";

type CheckoutRequest = {
  inboxItemId?: string;
};

export async function POST(req: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Stripe is not configured. Invoice after delivery applies." },
      { status: 503 },
    );
  }

  let body: CheckoutRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const inboxItemId = (body.inboxItemId ?? "").trim();
  if (!inboxItemId) {
    return NextResponse.json({ error: "inboxItemId is required." }, { status: 400 });
  }

  const item = await getInboxItemById(inboxItemId);
  if (!item || item.kind !== "assignment") {
    return NextResponse.json({ error: "Assignment not found." }, { status: 404 });
  }
  if (item.paymentStatus === "paid") {
    return NextResponse.json({ error: "Assignment is already paid." }, { status: 409 });
  }

  const catalogId = item.deliverableCatalogId;
  const quote = catalogId
    ? quoteAssignmentAmount({
        deliverableCatalogId: catalogId,
        discountApplied: item.discountApplied,
      })
    : null;
  const amountCents = item.amountCents ?? quote?.amountCents;
  if (!amountCents || amountCents < 50) {
    return NextResponse.json(
      { error: "Could not determine a flat fee for this deliverable. Contact RMV for a quote." },
      { status: 422 },
    );
  }

  const origin = new URL(req.url).origin;
  const stripe = getStripe();
  const deliverableLabel = item.deliverableType ?? "Overflow deliverable";
  const isPartner = item.source === "partner";
  const successPath = isPartner
    ? `/partner/submit?payment=success&matterId=${encodeURIComponent(item.matterId ?? "")}`
    : `/inbox?payment=success&matterId=${encodeURIComponent(item.matterId ?? "")}`;
  const cancelPath = isPartner
    ? `/partner/submit?payment=cancelled&deliverable=${encodeURIComponent(catalogId ?? "")}`
    : `/assignments/new?payment=cancelled&deliverable=${encodeURIComponent(catalogId ?? "")}`;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: isPartner && item.partnerEmail ? item.partnerEmail : undefined,
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: amountCents,
          product_data: {
            name: deliverableLabel,
            description: `${deliverableLabel} — RMV overflow counsel flat fee${item.discountApplied ? " (sample discount applied)" : ""}`,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      inboxItemId,
      matterId: item.matterId ?? "",
      deliverableType: item.deliverableType ?? "",
      source: item.source ?? "internal",
    },
    success_url: `${origin}${successPath}`,
    cancel_url: `${origin}${cancelPath}`,
  });

  if (!session.url) {
    return NextResponse.json({ error: "Stripe did not return a checkout URL." }, { status: 502 });
  }

  await updateAssignmentPayment(inboxItemId, {
    paymentStatus: "pending",
    stripeSessionId: session.id,
    amountCents,
  });

  return NextResponse.json({
    checkoutUrl: session.url,
    sessionId: session.id,
    amountCents,
    amountLabel: formatUsdFromCents(amountCents),
  });
}
