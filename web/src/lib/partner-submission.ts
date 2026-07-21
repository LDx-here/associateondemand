import { isStripeCheckoutEnabled } from "./stripe-client";

export type AssignmentSource = "internal" | "partner";

export const PARTNER_SUBMIT_PATH = "/partner/submit";

/** Public partner funnel URL — share with external law firms. */
export function partnerSubmissionUrl(origin?: string): string {
  const base =
    origin?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") ||
    "https://aod-next.vercel.app";
  return `${base}${PARTNER_SUBMIT_PATH}`;
}

/** Phase 1: partner pays at external submit when Stripe checkout is enabled. */
export function requiresPartnerPaymentBeforeDispatch(): boolean {
  return isStripeCheckoutEnabled();
}

export function assignmentSourceLabel(source?: AssignmentSource | string): string | null {
  if (source === "partner") return "Partner submitted";
  return null;
}
