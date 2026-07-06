#!/usr/bin/env node
/** Verify intelligent intake prefill helpers (Phase 2 pass 15). */
import assert from "node:assert/strict";

import {
  buildIntakeGuidanceMessages,
  detectMissingCriticalFacts,
  extractHeuristicFactsFromText,
  mergeOcrIntoDraftingFacts,
} from "../src/lib/intake-prefill.ts";
import { emptyDraftingFacts } from "../src/lib/practice-area-facts.ts";

const sampleText = `
Client entered the U.S. on March 15, 2019. Qualifying relative: U.S. citizen spouse Jane Doe.
Extreme hardship includes spouse's chronic illness and sole caregiver role for minor children.
Grounds of inadmissibility under INA §212(a)(9)(B)(i) unlawful presence.
Positive factors: 10 years residence, tax compliance, community volunteer work.
`;

const facts = extractHeuristicFactsFromText(sampleText);
assert.ok(facts.some((f) => f.fact_type === "date"));
assert.ok(facts.some((f) => f.fact_type === "hardship_narrative" || f.fact_type === "qualifying_relative"));

const base = emptyDraftingFacts("AOD-1001", "Immigration - Family", "aos-discretionary-brief");
const { payload, filledFieldIds } = mergeOcrIntoDraftingFacts(base, facts, sampleText);
assert.ok(filledFieldIds.length >= 2);
assert.ok(String(payload.fields.qualifyingRelative || payload.fields.extremeHardshipFactors).length > 0);

const missing = detectMissingCriticalFacts(payload, "aos-discretionary-brief");
assert.ok(Array.isArray(missing));

const messages = buildIntakeGuidanceMessages({
  deliverableId: "aos-discretionary-brief",
  deliverableName: "AOS Discretionary Brief",
  caseType: "Immigration - Family",
  structuredFacts: payload,
  ocrPrefillCount: filledFieldIds.length,
});
assert.ok(messages.some((m) => m.id === "intro"));
const intro = messages.find((m) => m.id === "intro");
assert.ok(intro);
assert.match(intro.text, /AOS Discretionary Brief/);
assert.ok(messages.some((m) => m.id === "ocr-prefill"));

const emptyMessages = buildIntakeGuidanceMessages({
  caseType: "Immigration - Asylum",
});
assert.equal(emptyMessages[0]?.id, "pick-deliverable");

console.log("verify-intake-prefill: OK");
