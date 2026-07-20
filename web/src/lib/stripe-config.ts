import Stripe from "stripe";

let stripeClient: Stripe | null = null;

/** True when server-side Stripe secret and publishable key are both set. */
export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim() && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim());
}

/** Test mode when secret key uses Stripe test prefix. */
export function isStripeTestMode(): boolean {
  const key = process.env.STRIPE_SECRET_KEY?.trim() ?? "";
  return key.startsWith("sk_test_");
}

export function getStripePublishableKey(): string | null {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();
  return key || null;
}

export function getStripeWebhookSecret(): string | null {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  return secret || null;
}

export function getStripe(): Stripe {
  if (!isStripeConfigured()) {
    throw new Error("Stripe is not configured. Set STRIPE_SECRET_KEY and NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.");
  }
  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!.trim(), {
      typescript: true,
    });
  }
  return stripeClient;
}
