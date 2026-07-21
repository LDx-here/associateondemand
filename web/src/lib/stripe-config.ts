import Stripe from "stripe";

let stripeClient: Stripe | null = null;

/** Read first non-empty env var from canonical name or legacy Vercel aliases. */
function readStripeEnv(canonical: string, ...aliases: string[]): string | null {
  for (const name of [canonical, ...aliases]) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return null;
}

export function getStripeSecretKey(): string | null {
  return readStripeEnv("STRIPE_SECRET_KEY", "stripe_secret");
}

export function getStripePublishableKey(): string | null {
  return readStripeEnv(
    "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
    "stripe_publishable",
    "NEXT_PUBLIC_stripe_publishable",
  );
}

export function getStripeWebhookSecret(): string | null {
  return readStripeEnv("STRIPE_WEBHOOK_SECRET", "stripe_webhook_secret");
}

/** True when server-side Stripe secret and publishable key are both set. */
export function isStripeConfigured(): boolean {
  return Boolean(getStripeSecretKey() && getStripePublishableKey());
}

/** Test mode when secret key uses Stripe test prefix. */
export function isStripeTestMode(): boolean {
  const key = getStripeSecretKey() ?? "";
  return key.startsWith("sk_test_");
}

export function getStripe(): Stripe {
  const secretKey = getStripeSecretKey();
  if (!isStripeConfigured() || !secretKey) {
    throw new Error("Stripe is not configured. Set STRIPE_SECRET_KEY and NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.");
  }
  if (!stripeClient) {
    stripeClient = new Stripe(secretKey, {
      typescript: true,
    });
  }
  return stripeClient;
}
