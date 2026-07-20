/** Client-side: publishable key present (checkout UI enabled). */
export function isStripeCheckoutEnabled(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim());
}
