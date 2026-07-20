/**
 * Validates Stripe webhook handler logic with a mocked checkout.session.completed event.
 * Run: npm run test:stripe-webhook
 */
import { handleCheckoutSessionCompleted } from "../src/lib/stripe-webhook-handlers.ts";

let failed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    failed++;
  }
}

const noMeta = await handleCheckoutSessionCompleted({
  id: "cs_test_1",
  payment_status: "paid",
  metadata: {},
});
assert(!noMeta.handled && "reason" in noMeta, "should reject missing inboxItemId");

const unpaid = await handleCheckoutSessionCompleted({
  id: "cs_test_2",
  payment_status: "unpaid",
  metadata: { inboxItemId: "rec123" },
});
assert(!unpaid.handled && unpaid.reason?.includes("unpaid"), "should reject unpaid session");

const paid = await handleCheckoutSessionCompleted({
  id: "cs_test_3",
  payment_status: "paid",
  metadata: { inboxItemId: "rec-nonexistent-test" },
});
assert(paid.handled === true && "inboxItemId" in paid, "should handle paid session with inboxItemId");

if (failed > 0) {
  console.error(`\n${failed} stripe webhook check(s) failed`);
  process.exit(1);
}

console.log("OK: stripe webhook handler (mocked checkout.session.completed)");
