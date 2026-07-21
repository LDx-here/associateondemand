/**
 * Validates deliverable catalog invariants (Phase 0 launch SKUs, pricing).
 * Run: node scripts/verify-deliverable-catalog.mjs
 */
import {
  DELIVERABLE_CATALOG,
  PHASE0_LAUNCH_SKU_IDS,
  deliverableById,
  formatCatalogQuote,
  isPhase0LaunchSku,
} from "../src/lib/deliverable-catalog.ts";

let failed = 0;

for (const id of PHASE0_LAUNCH_SKU_IDS) {
  const entry = deliverableById(id);
  if (!entry) {
    console.error(`FAIL: launch SKU "${id}" missing from DELIVERABLE_CATALOG`);
    failed++;
    continue;
  }
  if (!isPhase0LaunchSku(id)) {
    console.error(`FAIL: isPhase0LaunchSku("${id}") returned false`);
    failed++;
  }
  if (!entry.pricing) {
    console.error(`FAIL: launch SKU "${id}" should have pricing metadata`);
    failed++;
  } else if (!entry.pricing.note?.includes("partner firm") && !entry.pricing.note?.includes("invoiced")) {
    console.error(`FAIL: launch SKU "${id}" should include billing note`);
    failed++;
  }
  const quote = formatCatalogQuote(entry);
  if (!quote || quote.length < 3) {
    console.error(`FAIL: formatCatalogQuote("${id}") returned empty`);
    failed++;
  }
}

const requiredDayOne = ["aos-discretionary-brief", "custom-motion", "hearing-packet"];
for (const id of requiredDayOne) {
  if (!PHASE0_LAUNCH_SKU_IDS.includes(id)) {
    console.error(`FAIL: day-one SKU "${id}" not in PHASE0_LAUNCH_SKU_IDS`);
    failed++;
  }
}

if (DELIVERABLE_CATALOG.some((e, i, arr) => arr.findIndex((x) => x.id === e.id) !== i)) {
  console.error("FAIL: duplicate catalog IDs");
  failed++;
}

if (failed > 0) {
  console.error(`\n${failed} catalog check(s) failed`);
  process.exit(1);
}

console.log(`OK: ${PHASE0_LAUNCH_SKU_IDS.length} launch SKUs, ${DELIVERABLE_CATALOG.length} catalog entries`);
