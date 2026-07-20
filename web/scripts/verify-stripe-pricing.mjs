/**
 * Validates Stripe flat-fee quote calculation (catalog midpoint + sample discount).
 * Run: npm run test:stripe-pricing
 */
import {
  PHASE0_LAUNCH_SKU_IDS,
  deliverableById,
} from "../src/lib/deliverable-catalog.ts";
import { quoteAssignmentAmount, formatUsdFromCents } from "../src/lib/stripe-pricing.ts";

let failed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    failed++;
  }
}

const aos = quoteAssignmentAmount({ deliverableCatalogId: "aos-discretionary-brief", discountApplied: false });
assert(aos?.amountUsd === 1125, `AOS midpoint should be $1,125, got ${aos?.amountUsd}`);
assert(aos?.amountCents === 112500, `AOS cents should be 112500, got ${aos?.amountCents}`);

const aosDiscount = quoteAssignmentAmount({
  deliverableCatalogId: "aos-discretionary-brief",
  discountApplied: true,
});
assert(aosDiscount?.amountUsd === 900, `AOS discounted should be $900, got ${aosDiscount?.amountUsd}`);

const motion = quoteAssignmentAmount({ deliverableCatalogId: "custom-motion", discountApplied: false });
assert(motion?.amountUsd === 350, `Motion midpoint should be $350, got ${motion?.amountUsd}`);

assert(quoteAssignmentAmount({ deliverableCatalogId: "not-real" }) === null, "unknown SKU should return null");

for (const id of PHASE0_LAUNCH_SKU_IDS) {
  const entry = deliverableById(id);
  const quote = quoteAssignmentAmount({ deliverableCatalogId: id, discountApplied: false });
  if (!entry?.pricing) continue;
  assert(quote != null && quote.amountCents >= 5000, `launch SKU ${id} should quote >= $50`);
  assert(formatUsdFromCents(quote.amountCents).startsWith("$"), `formatUsdFromCents for ${id}`);
}

if (failed > 0) {
  console.error(`\n${failed} stripe pricing check(s) failed`);
  process.exit(1);
}

console.log("OK: stripe pricing quotes (midpoint + sample discount → cents)");
