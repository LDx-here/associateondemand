import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getDb, schema } from "../db.js";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc.js";
import { isValidStageTransition } from "../../shared/types.js";

const { matters } = schema;

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

export const paymentsRouter = router({
  isConfigured: publicProcedure.query(() => ({
    configured: isStripeConfigured(),
    message: isStripeConfigured()
      ? "Stripe checkout available"
      : "Invoice after delivery — set STRIPE_SECRET_KEY to enable checkout",
  })),

  createCheckoutSession: publicProcedure
    .input(
      z.object({
        matterId: z.number(),
        amount: z.number().optional(),
        successUrl: z.string().optional(),
        cancelUrl: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const stripe = getStripe();
      if (!stripe) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Stripe is not configured. Invoice after delivery applies.",
        });
      }

      const db = getDb();
      const [matter] = await db.select().from(matters).where(eq(matters.id, input.matterId)).limit(1);
      if (!matter) throw new TRPCError({ code: "NOT_FOUND" });

      const amountCents = Math.round((input.amount ?? Number(matter.totalFee ?? 0)) * 100);
      if (amountCents < 50) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid payment amount." });
      }

      const origin = process.env.PUBLIC_URL ?? "http://localhost:5173";
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              unit_amount: amountCents,
              product_data: {
                name: matter.title,
                description: matter.serviceType ?? "Legal OS deliverable",
              },
            },
            quantity: 1,
          },
        ],
        metadata: { matterId: String(input.matterId) },
        success_url: input.successUrl ?? `${origin}/associate/intake?payment=success`,
        cancel_url: input.cancelUrl ?? `${origin}/associate/intake?payment=cancelled`,
      });

      if (!session.url) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Stripe did not return checkout URL." });
      }

      return { checkoutUrl: session.url, sessionId: session.id, amountCents };
    }),
});

export async function handleStripeWebhook(rawBody: Buffer, signature: string | undefined) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripe = getStripe();
  if (!stripe || !secret) {
    return { status: 503, body: { error: "Stripe webhook not configured" } };
  }
  if (!signature) {
    return { status: 400, body: { error: "Missing stripe-signature" } };
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return { status: 400, body: { error: message } };
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const matterId = Number(session.metadata?.matterId);
    if (matterId) {
      const db = getDb();
      const [matter] = await db.select().from(matters).where(eq(matters.id, matterId)).limit(1);
      if (matter) {
        await db
          .update(matters)
          .set({
            paymentStatus: "paid",
            stripePaymentId: session.payment_intent as string,
          })
          .where(eq(matters.id, matterId));

        if (matter.stage === "engagement" && isValidStageTransition("engagement", "drafting")) {
          await db
            .update(matters)
            .set({
              stage: "drafting",
              nextAction: "Generate draft based on matter details and Firm Memory",
              status: "active",
            })
            .where(eq(matters.id, matterId));
        }
      }
    }
    return { status: 200, body: { received: true, matterId } };
  }

  return { status: 200, body: { received: true, ignored: event.type } };
}
