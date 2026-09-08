#!/usr/bin/env node
/**
 * Verify the case journeys against the two she actually walked through:
 * removal defense, and Hammond's UM injury claim.
 */
import assert from "node:assert/strict";

import {
  CASE_JOURNEYS,
  JOURNEY_BY_ID,
  JOURNEY_NOTE_TYPE,
  journeyPosition,
  journeySentence,
  parseJourneyStateNote,
  proposeCurrentStepId,
  proposeJourneyId,
  serializeJourneyState,
} from "../src/lib/case-journey.ts";

// --- Shape ------------------------------------------------------------------
for (const journey of CASE_JOURNEYS) {
  const ids = journey.steps.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length, `${journey.id} has duplicate step ids`);
  assert.ok(journey.steps.length >= 5, `${journey.id} is too thin to be a journey`);
  for (const step of journey.steps) {
    assert.ok(["you", "them"].includes(step.awaiting), `${journey.id}.${step.id} needs awaiting`);
  }
}

// --- Removal defense, in her order -------------------------------------------
const removal = JOURNEY_BY_ID.removal_defense;
const removalIds = removal.steps.map((s) => s.id);
assert.deepEqual(
  removalIds.slice(0, 8),
  [
    "nta",
    "mch_scheduled",
    "e28",
    "pleadings_received",
    "pleadings_filed",
    "scheduling_order",
    "scheduling_response",
    "biometrics",
  ],
  "removal defense must follow the sequence she described",
);
// The waits she named are theirs, not hers.
for (const id of ["mch_scheduled", "scheduling_order", "biometrics", "awaiting_ih_date"]) {
  assert.equal(
    removal.steps.find((s) => s.id === id).awaiting,
    "them",
    `${id} is a wait on someone else`,
  );
}
// And the filings are hers.
for (const id of ["e28", "pleadings_filed", "scheduling_response", "ih_prep"]) {
  assert.equal(removal.steps.find((s) => s.id === id).awaiting, "you", `${id} is her move`);
}

// --- Injury claim, in her order ----------------------------------------------
const injury = JOURNEY_BY_ID.injury_claim;
assert.deepEqual(
  injury.steps.map((s) => s.id),
  [
    "incident",
    "investigation",
    "lor",
    "adjuster_inquiries",
    "awaiting_offer",
    "offer_received",
    "accounting",
    "disbursement",
  ],
  "injury claim must follow the Hammond sequence",
);
assert.equal(injury.steps.find((s) => s.id === "awaiting_offer").awaiting, "them");
// The lien work she called out by name has to be in the accounting step.
const accountingPrep = injury.steps.find((s) => s.id === "accounting").prepare.join(" ");
assert.match(accountingPrep, /Medicaid lien/i, "Medicaid lien is named in her accounting step");
assert.match(accountingPrep, /expenses/i);

// --- Journey proposal by case type -------------------------------------------
assert.equal(proposeJourneyId("Immigration"), "removal_defense");
assert.equal(proposeJourneyId("Personal Injury"), "injury_claim");
assert.equal(proposeJourneyId("PI"), "injury_claim");
assert.equal(proposeJourneyId("Property Damage"), "injury_claim");
assert.equal(proposeJourneyId("immigration"), "removal_defense", "case-insensitive");
assert.equal(proposeJourneyId("Other"), null, "unknown type proposes nothing");
assert.equal(proposeJourneyId(""), null);
assert.equal(proposeJourneyId(null), null);

// --- Posture gives a first guess, never a wrong assertion ---------------------
assert.equal(proposeCurrentStepId("removal_defense", "Awaiting Scheduling"), "awaiting_ih_date");
assert.equal(proposeCurrentStepId("removal_defense", "Hearing Scheduled"), "ih_prep");
assert.equal(proposeCurrentStepId("injury_claim", "Representation Filed"), "lor");
assert.equal(proposeCurrentStepId("removal_defense", "Something Unknown"), null);
assert.equal(proposeCurrentStepId("removal_defense", ""), null);

// --- Position: where we started, where we are, what's next --------------------
const atBiometrics = journeyPosition({
  matterId: "AOD-1008",
  journeyId: "removal_defense",
  currentStepId: "biometrics",
  updatedAt: "2026-08-24T00:00:00.000Z",
});
assert.equal(atBiometrics.current.id, "biometrics");
assert.equal(atBiometrics.stepNumber, 8);
assert.equal(atBiometrics.totalSteps, 12);
assert.equal(atBiometrics.completed.length, 7, "everything before is behind us");
assert.equal(atBiometrics.completed[0].id, "nta", "where we started stays visible");
assert.equal(atBiometrics.next.id, "awaiting_ih_date");
assert.equal(atBiometrics.awaiting, "them");
// Prep looks one step ahead, which is the "anticipate" she asked for.
assert.ok(atBiometrics.prepare.some((p) => /compliance/i.test(p)));

const atIhPrep = journeyPosition({
  matterId: "AOD-1008",
  journeyId: "removal_defense",
  currentStepId: "ih_prep",
  updatedAt: "2026-08-24T00:00:00.000Z",
});
assert.equal(atIhPrep.awaiting, "you");
const prep = atIhPrep.prepare.join(" ");
for (const item of [/declaration/i, /country conditions/i, /witness/i, /exhibit/i]) {
  assert.match(prep, item, "individual hearing prep must list the packet pieces");
}
// No duplicates even when adjacent steps overlap.
assert.equal(new Set(atIhPrep.prepare).size, atIhPrep.prepare.length);

// Last step has no next and does not crash.
const atEnd = journeyPosition({
  matterId: "AOD-1007",
  journeyId: "injury_claim",
  currentStepId: "disbursement",
  updatedAt: "2026-08-24T00:00:00.000Z",
});
assert.equal(atEnd.next, null);
assert.equal(atEnd.later.length, 0);
assert.match(journeySentence(atEnd), /last step/i);

const sentence = journeySentence(atBiometrics);
assert.match(sentence, /next move is theirs/i, "a wait reads as their move");
const yourMove = journeySentence(atIhPrep);
assert.match(yourMove, /next move is yours/i);

// Unknown journey or step yields null rather than a wrong position.
assert.equal(
  journeyPosition({ matterId: "x", journeyId: "nope", currentStepId: "nta", updatedAt: "" }),
  null,
);
assert.equal(
  journeyPosition({
    matterId: "x",
    journeyId: "removal_defense",
    currentStepId: "not_a_step",
    updatedAt: "",
  }),
  null,
);

// --- Round-trip through a Note ------------------------------------------------
const state = {
  matterId: "AOD-1007",
  journeyId: "injury_claim",
  currentStepId: "awaiting_offer",
  updatedAt: "2026-08-24T00:00:00.000Z",
};
const serialized = serializeJourneyState(state);
assert.ok(serialized.startsWith(JOURNEY_NOTE_TYPE));
assert.deepEqual(parseJourneyStateNote(serialized, "AOD-1007"), state);
assert.deepEqual(parseJourneyStateNote(JSON.stringify(state), "AOD-1007"), state);

assert.equal(parseJourneyStateNote("", "AOD-1007"), null);
assert.equal(parseJourneyStateNote("garbage", "AOD-1007"), null);
assert.equal(
  parseJourneyStateNote(JSON.stringify({ journeyId: "gone", currentStepId: "x" }), "AOD-1007"),
  null,
);
// A step id removed from the template must not wedge the panel.
assert.equal(
  parseJourneyStateNote(
    JSON.stringify({ journeyId: "injury_claim", currentStepId: "retired_step" }),
    "AOD-1007",
  ),
  null,
  "a stale step id falls back to asking her",
);

console.log("case-journey: all checks passed");
