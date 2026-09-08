import { NextResponse } from "next/server";

import { listInvoicesForMatter, saveInvoicesForMatter } from "@/lib/data-store";
import { getStripe, isStripeConfigured } from "@/lib/stripe-config";
import { invoiceTotals } from "@/lib/invoice";

type Ctx = { params: Promise<{ matterId: string; invoiceId: string }> };

/**
 * Create a Stripe payment link for one client invoice.
 *
 * A Checkout Session in payment mode, carrying matterId and invoiceId in
 * metadata so the webhook can mark this exact invoice paid. The link is stored
 * on the invoice, so re-requesting returns the same URL rather than opening a
 * second way to pay the same bill.
 */
export async function POST(req: Request, ctx: Ctx) {
  const { matterId, invoiceId } = await ctx.params;

  if (!isStripeConfigured()) {
    return NextResponse.json(
      {
        error:
          "Stripe is not connected yet. Set STRIPE_SECRET_KEY and NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, then try again.",
      },
      { status: 503 },
    );
  }

  const invoices = await listInvoicesForMatter(matterId);
  const invoice = invoices.find((i) => i.id === invoiceId);
  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  }
  if (invoice.status === "paid") {
    return NextResponse.json({ error: "This invoice is already paid." }, { status: 409 });
  }
  if (invoice.paymentUrl) {
    return NextResponse.json({ paymentUrl: invoice.paymentUrl, reused: true });
  }

  const totals = invoiceTotals(invoice);
  if (totals.totalCents <= 0) {
    return NextResponse.json(
      { error: "This invoice has no amount to charge." },
      { status: 400 },
    );
  }

  const origin = new URL(req.url).origin;

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: totals.totalCents,
            product_data: { name: `Invoice ${invoice.number}` },
          },
        },
      ],
      metadata: { matterId, invoiceId },
      success_url: `${origin}/matters/${matterId}?paid=${encodeURIComponent(invoice.number)}`,
      cancel_url: `${origin}/matters/${matterId}`,
    });

    if (!session.url) {
      return NextResponse.json({ error: "Stripe returned no payment URL." }, { status: 502 });
    }

    await saveInvoicesForMatter(
      matterId,
      invoices.map((i) => (i.id === invoiceId ? { ...i, paymentUrl: session.url! } : i)),
    );

    return NextResponse.json({ paymentUrl: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Stripe rejected the request.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
