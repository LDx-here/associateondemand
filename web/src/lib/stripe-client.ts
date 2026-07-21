/** Reserved for Phase 1 external partner submission funnel — not internal RMV operator intake. */
export function isStripeCheckoutEnabled(): boolean {
  if (process.env.STRIPE_CHECKOUT_ENABLED === "false") return false;
  const key =
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ||
    process.env.stripe_publishable?.trim() ||
    process.env.NEXT_PUBLIC_stripe_publishable?.trim();
  return Boolean(key) && process.env.STRIPE_CHECKOUT_ENABLED === "true";
}
