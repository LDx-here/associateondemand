#!/usr/bin/env node
/**
 * Verify the Five Anchors intake — the structure works by hand, with no model.
 * The fifth anchor (uncertainty and gaps) is checked on its own, because the
 * blueprint treats surfacing what we do not know as the point of the system.
 */
import assert from "node:assert/strict";

import {
  ANCHOR_IDS,
  ANCHOR_NOTE_TYPE,
  FIVE_ANCHORS,
  answerKey,
  anchorProgress,
  emptyAnchorIntake,
  formatAnchorsForReading,
  intakeReadiness,
  parseAnchorIntakeNote,
  serializeAnchorIntake,
  unansweredAnchors,
} from "../src/lib/five-anchors.ts";

// --- Shape ------------------------------------------------------------------
assert.equal(FIVE_ANCHORS.length, 5, "the blueprint names exactly five anchors");
assert.deepEqual(
  FIVE_ANCHORS.map((a) => a.id),
  [...ANCHOR_IDS],
  "anchor order must match the blueprint's order",
);
assert.ok(
  FIVE_ANCHORS.every((a) => a.prompts.length > 0),
  "every anchor asks at least one question",
);
// Every prompt is a question she can answer by typing — no anchor is a stub.
for (const anchor of FIVE_ANCHORS) {
  for (const p of anchor.prompts) {
    assert.ok(p.question.trim().endsWith("?"), `${anchor.id}.${p.id} should ask a question`);
  }
}
// Prompt keys must be unique, or answers would overwrite each other.
const keys = FIVE_ANCHORS.flatMap((a) => a.prompts.map((p) => answerKey(a.id, p.id)));
assert.equal(new Set(keys).size, keys.length, "answer keys collide");

// --- An empty intake is honest about being empty ----------------------------
const empty = emptyAnchorIntake("AOD-1008");
assert.deepEqual(unansweredAnchors(empty), [...ANCHOR_IDS]);
const emptyReadiness = intakeReadiness(empty);
assert.equal(emptyReadiness.answered, 0);
assert.equal(emptyReadiness.percent, 0);
assert.equal(emptyReadiness.everyAnchorStarted, false);
assert.equal(emptyReadiness.gapsAddressed, false);

// --- Partial intake, in the shape she actually types -------------------------
const partial = {
  matterId: "AOD-1008",
  answers: {
    "facts.parties": "Client (respondent), DHS, IJ Cleveland.",
    "facts.incident": "Detained at the border after fleeing threats.",
    "legal_context.practice_area": "Immigration",
    "legal_context.governing_law": "INA 208; 8 CFR 1208.13",
    "posture.filed": "I-589 filed; individual hearing set.",
    // Whitespace-only must not count as an answer.
    "evidence.on_hand": "   ",
  },
  updatedAt: "2026-08-24T12:00:00.000Z",
};
const progress = anchorProgress(partial);
assert.equal(progress.find((p) => p.anchorId === "facts").answered, 2);
assert.equal(progress.find((p) => p.anchorId === "evidence").answered, 0, "blank is not an answer");
assert.deepEqual(unansweredAnchors(partial), ["evidence", "gaps"]);

const partialReadiness = intakeReadiness(partial);
assert.equal(partialReadiness.answered, 5);
assert.equal(partialReadiness.total, keys.length);
assert.equal(partialReadiness.everyAnchorStarted, false);
assert.equal(partialReadiness.gapsAddressed, false, "gaps untouched must read as unaddressed");

// A well-filled intake that never states its gaps is still not "complete" —
// this is the exact failure the fifth anchor exists to catch.
const noGaps = { ...partial, answers: { ...partial.answers } };
for (const anchor of FIVE_ANCHORS) {
  if (anchor.id === "gaps") continue;
  for (const p of anchor.prompts) noGaps.answers[answerKey(anchor.id, p.id)] = "answered";
}
const noGapsReadiness = intakeReadiness(noGaps);
assert.ok(noGapsReadiness.percent > 70, "most prompts are answered");
assert.equal(noGapsReadiness.everyAnchorStarted, false);
assert.equal(noGapsReadiness.gapsAddressed, false);
assert.deepEqual(unansweredAnchors(noGaps), ["gaps"]);

// --- Reading view ------------------------------------------------------------
const prose = formatAnchorsForReading(partial);
assert.ok(prose.includes("Facts"), "answered anchors appear");
assert.ok(prose.includes("IJ Cleveland"));
assert.ok(
  !prose.includes("What is the timeline?"),
  "unanswered questions must not render as empty headings",
);
assert.ok(
  prose.includes("Not yet addressed: Documents and evidence, Uncertainty and gaps."),
  "the reading view names what is still missing",
);
assert.equal(formatAnchorsForReading(empty).trim(), "Not yet addressed: " +
  FIVE_ANCHORS.map((a) => a.title).join(", ") + ".");

// --- Round-trip through a Note ----------------------------------------------
const serialized = serializeAnchorIntake(partial);
assert.ok(serialized.startsWith(ANCHOR_NOTE_TYPE), "note carries its type marker");
const restored = parseAnchorIntakeNote(serialized, "AOD-1008");
assert.deepEqual(restored.answers, partial.answers);
assert.equal(restored.matterId, "AOD-1008");

// Bare JSON (no type prefix) still parses — older or hand-edited notes.
assert.deepEqual(
  parseAnchorIntakeNote(JSON.stringify(partial), "AOD-1008").answers,
  partial.answers,
);

// Garbage must not throw or poison the form.
assert.equal(parseAnchorIntakeNote("", "AOD-1008"), null);
assert.equal(parseAnchorIntakeNote("not json at all", "AOD-1008"), null);
assert.equal(parseAnchorIntakeNote(JSON.stringify({ nope: true }), "AOD-1008"), null);
const dirty = parseAnchorIntakeNote(
  JSON.stringify({ answers: { "facts.parties": "ok", "facts.incident": { bad: 1 }, x: 7 } }),
  "AOD-1008",
);
assert.deepEqual(dirty.answers, { "facts.parties": "ok" }, "non-string answers are dropped");
assert.equal(dirty.matterId, "AOD-1008", "matterId falls back to the matter being viewed");

console.log("five-anchors: all checks passed");
