/** Client-side: publishable key present (checkout UI enabled). */
export function isStripeCheckoutEnabled(): boolean {
  const key =
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ||
    process.env.stripe_publishable?.trim() ||
    process.env.NEXT_PUBLIC_stripe_publishable?.trim();
  return Boolean(key);
}
