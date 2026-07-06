#!/usr/bin/env node
/** Verify practice-area fact serialization helpers (pass 10). */
import assert from "node:assert/strict";

import {
  draftingFactsCompleteness,
  emptyDraftingFacts,
  formatDraftingFactsForPrompt,
  mergeFactsForDispatch,
  parseDraftingFactsNote,
  resolvePracticeArea,
  serializeDraftingFacts,
} from "../src/lib/practice-area-facts.ts";

assert.equal(resolvePracticeArea("Immigration - Asylum"), "immigration");
assert.equal(resolvePracticeArea("Personal Injury - Auto"), "personal_injury");
assert.equal(resolvePracticeArea("Contract dispute"), "generic");

const base = emptyDraftingFacts("AOD-1001", "Immigration - Asylum");
base.fields.clientStatus = "Pending asylum";
base.fields.reliefSought = "AOS";
base.fields.entryDate = "2019-03-01";

const serialized = serializeDraftingFacts(base);
const roundTrip = parseDraftingFactsNote(serialized, "AOD-1001", "Immigration - Asylum");
assert.ok(roundTrip);
assert.equal(roundTrip.fields.clientStatus, "Pending asylum");

const completeness = draftingFactsCompleteness(base);
assert.equal(completeness.filled, 3);
assert.equal(completeness.total, 5);

const prompt = formatDraftingFactsForPrompt(base);
assert.match(prompt, /Current immigration status: Pending asylum/);
assert.match(prompt, /Relief or outcome sought: AOS/);

const merged = mergeFactsForDispatch(base, "Client has strong equities.");
assert.match(merged, /Structured facts for drafting/);
assert.match(merged, /Client has strong equities/);

const aosFields = emptyDraftingFacts("AOD-1001", "Immigration - Asylum", "aos-discretionary-brief");
assert.ok(aosFields.deliverableId === "aos-discretionary-brief");
const aosCompleteness = draftingFactsCompleteness(aosFields, "aos-discretionary-brief");
assert.ok(aosCompleteness.total >= 5);

const aosPrompt = formatDraftingFactsForPrompt({
  ...aosFields,
  fields: {
    ...aosFields.fields,
    persecutionNarrative: "Harassed by police in 2019",
    protectedGround: "Political opinion",
    countryConditions: "State Dept report on file",
  },
});
assert.match(aosPrompt, /Credibility Assessment/);
assert.match(aosPrompt, /Country Conditions for Nexus/);

console.log("verify-practice-area-facts: OK");
