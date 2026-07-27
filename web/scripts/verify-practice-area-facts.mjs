#!/usr/bin/env node
/** Verify practice-area fact serialization helpers (pass 10). */
import assert from "node:assert/strict";

import {
  draftingFactsCompleteness,
  emptyDraftingFacts,
  fieldsForDeliverable,
  formatDraftingFactsForPrompt,
  isImmigrationPracticeArea,
  mergeFactsForDispatch,
  parseDraftingFactsNote,
  resolvePracticeArea,
  serializeDraftingFacts,
} from "../src/lib/practice-area-facts.ts";

// "Immigration - Adjustment" stays on the coarse "immigration" fallback —
// asylum and family-based get their own finer sub-areas (Immigration
// breadth pass), everything else (AOS/adjustment/cancellation/other) keeps
// the original generic immigration checklist.
assert.equal(resolvePracticeArea("Immigration - Adjustment"), "immigration");
assert.equal(resolvePracticeArea("Immigration - Asylum"), "immigration_asylum");
assert.equal(resolvePracticeArea("Immigration - Withholding of Removal"), "immigration_asylum");
assert.equal(resolvePracticeArea("Family-Based Petition"), "immigration_family");
assert.equal(resolvePracticeArea("Marriage-Based AOS"), "immigration_family");
assert.equal(resolvePracticeArea("Personal Injury - Auto"), "personal_injury");
assert.equal(resolvePracticeArea("Contract dispute"), "generic");

assert.ok(isImmigrationPracticeArea("immigration"));
assert.ok(isImmigrationPracticeArea("immigration_asylum"));
assert.ok(isImmigrationPracticeArea("immigration_family"));
assert.ok(!isImmigrationPracticeArea("personal_injury"));
assert.ok(!isImmigrationPracticeArea("generic"));

// A specific deliverable (AOS Discretionary Brief) keeps its own dedicated
// schema even when the case type resolves to a finer immigration sub-area —
// selecting AOS for an "Asylum"-labeled matter must not silently downgrade
// to the generic asylum checklist.
const asylumAosFields = fieldsForDeliverable("aos-discretionary-brief", "immigration_asylum");
assert.ok(asylumAosFields.some((f) => f.id === "sectionAHeading"), "AOS schema preserved for asylum sub-area");

// The generic (no deliverable selected) checklist IS the deeper, area-specific one.
const asylumGenericFields = fieldsForDeliverable(undefined, "immigration_asylum");
assert.ok(asylumGenericFields.some((f) => f.id === "wellFoundedFearNarrative"));
assert.ok(asylumGenericFields.some((f) => f.stage === "architecture"), "asylum schema is staged");

const familyGenericFields = fieldsForDeliverable(undefined, "immigration_family");
assert.ok(familyGenericFields.some((f) => f.id === "relationshipEvidence"));
assert.ok(familyGenericFields.some((f) => f.stage === "identity"), "family-based schema is staged");

const base = emptyDraftingFacts("AOD-1001", "Immigration - Adjustment");
base.fields.clientStatus = "Pending asylum";
base.fields.reliefSought = "AOS";
base.fields.entryDate = "2019-03-01";

const serialized = serializeDraftingFacts(base);
const roundTrip = parseDraftingFactsNote(serialized, "AOD-1001", "Immigration - Adjustment");
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
    qualifyingRelative: "U.S. citizen spouse — Jane Doe",
    extremeHardshipFactors: "Spouse has chronic illness; sole caregiver for minor children",
    inadmissibilityGrounds: "INA §212(a)(9)(B)(i) — unlawful presence",
    adverseFactors: "Single misdemeanor DUI (2018), completed probation",
    positiveEquities: "10 years residence, tax compliance, community volunteer",
  },
});
assert.match(aosPrompt, /Qualifying relative/);
assert.match(aosPrompt, /Hardship \/ humanitarian|Extreme hardship|hardship/i);
assert.match(aosPrompt, /212\(a\)/);
assert.doesNotMatch(aosPrompt, /Protected ground/);
assert.doesNotMatch(aosPrompt, /Country Conditions for Nexus/);

console.log("verify-practice-area-facts: OK");
