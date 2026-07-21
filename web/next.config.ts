import type { NextConfig } from "next";

/** Expose publishable key to the client bundle when only legacy alias is set on Vercel. */
const stripePublishableKey =
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ||
  process.env.stripe_publishable?.trim() ||
  process.env.NEXT_PUBLIC_stripe_publishable?.trim() ||
  "";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  env: {
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: stripePublishableKey,
  },
};

export default nextConfig;
