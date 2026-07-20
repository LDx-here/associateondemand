import { deliverableById, type DeliverableCatalogEntry } from "./deliverable-catalog";
import { applySampleDiscount, SAMPLE_DISCOUNT_PERCENT } from "./practice-area-facts";

export type QuoteInput = {
  deliverableCatalogId: string;
  discountApplied?: boolean;
};

export type QuoteResult = {
  amountCents: number;
  amountUsd: number;
  discountApplied: boolean;
  deliverableName: string;
  listMidpointUsd: number;
};

/**
 * Deterministic flat-fee quote: midpoint of catalog min/max, rounded to whole dollars,
 * then sample discount when flagged. Convert to cents for Stripe.
 */
export function quoteAssignmentAmount(input: QuoteInput): QuoteResult | null {
  const entry = deliverableById(input.deliverableCatalogId);
  if (!entry?.pricing) return null;

  const midpointUsd = Math.round((entry.pricing.minUsd + entry.pricing.maxUsd) / 2);
  const discountApplied = Boolean(input.discountApplied && entry.pricing.sampleDiscountEligible);
  const pct = entry.pricing.sampleDiscountPercent ?? SAMPLE_DISCOUNT_PERCENT;
  const amountUsd = discountApplied ? applySampleDiscount(midpointUsd, pct) : midpointUsd;
  const amountCents = Math.max(50, amountUsd * 100);

  return {
    amountCents,
    amountUsd,
    discountApplied,
    deliverableName: entry.name,
    listMidpointUsd: midpointUsd,
  };
}

export function quoteFromCatalogEntry(
  entry: DeliverableCatalogEntry,
  discountApplied = false,
): QuoteResult | null {
  if (!entry.pricing) return null;
  return quoteAssignmentAmount({ deliverableCatalogId: entry.id, discountApplied });
}

export function formatUsdFromCents(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}
