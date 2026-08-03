#!/usr/bin/env node
/** Verify case-state inference against the firm's REAL filenames. */
import assert from "node:assert/strict";

import {
  extractDatesFromFilename,
  inferPosture,
  proposeCaseState,
  proposeDeadlines,
} from "../src/lib/case-state.ts";

const NOW = new Date("2026-08-03T00:00:00Z");
const f = (name, modifiedAt = "2026-07-01T00:00:00Z") => ({ name, modifiedAt });

// --- Posture, from filenames observed in 03 Clients Active -----------------
assert.equal(inferPosture([f("470508-complaint - 1of1-2168715.pdf")]).posture, "Filed");
assert.equal(inferPosture([f("470508 ANSWER.pdf")]).posture, "Responsive Pleading Filed");
assert.equal(
  inferPosture([f("470508-order setting hearing - 1of1-2223059.pdf")]).posture,
  "Hearing Scheduled",
);
assert.equal(
  inferPosture([f("notice-limited-appearance-izzatov.gdoc")]).posture,
  "Representation Filed",
);
assert.equal(
  inferPosture([f("Viazovikova Response to Scheduling Order.docx")]).posture,
  "Awaiting Scheduling",
);
assert.equal(inferPosture([f("UM_UIM LOR - Hammond.docx")]).posture, "Representation Filed");
assert.equal(inferPosture([]).posture, "Intake", "an empty folder is still at intake");
assert.equal(inferPosture([f("random.txt")]).posture, "Intake");

// Underscores must not defeat word-boundary matching (the same class of bug
// that previously left Viazovikova_Declaration_DRAFT unclassified).
assert.equal(
  inferPosture([f("25-346894_HRP1_Hearing_Packet_257071197.pdf")]).posture,
  "Hearing Scheduled",
);

// Procedural progression wins over document count: the PI folder holds a
// complaint AND an answer AND an order setting hearing — it is at hearing.
const piFolder = [
  f("470508-complaint - 1of1-2168715.pdf"),
  f("470508 ANSWER.pdf"),
  f("470508 OPC MTN IN RESPONSE TO DFJ.pdf"),
  f("470508-order setting hearing - 1of1-2223059.pdf"),
];
const piPosture = inferPosture(piFolder);
assert.equal(piPosture.posture, "Hearing Scheduled");
assert.match(piPosture.evidence, /order setting hearing/);

// --- Date extraction -------------------------------------------------------
// Scanner timestamp: 20260416 + time digits.
assert.ok(
  extractDatesFromFilename("25-346894_HRP1_Hearing_Packet_20260416050937524_QUICKSCAN.pdf")
    .includes("2026-04-16"),
);
// Two-digit year.
assert.ok(extractDatesFromFilename("8.1 - MHMC surgery R&B 2-12-26.pdf").includes("2026-02-12"));
// MM-DD-YYYY.
assert.ok(
  extractDatesFromFilename("Westlaw Claims Explorer - 06-08-2026.pdf").includes("2026-06-08"),
);
// Impossible dates are rejected rather than silently wrapped by Date().
assert.deepEqual(extractDatesFromFilename("file-13-45-2026.pdf"), []);
assert.deepEqual(extractDatesFromFilename("20261332_scan.pdf"), []);
// A long ID that is not a date must not become one.
assert.deepEqual(extractDatesFromFilename("470508-complaint - 1of1-2168715.pdf"), []);
assert.deepEqual(extractDatesFromFilename("no digits here.pdf"), []);

// --- Deadline proposal is deliberately conservative ------------------------
// Only deadline-bearing documents contribute, and only future dates.
assert.deepEqual(
  proposeDeadlines([f("8.1 - MHMC surgery R&B 2-12-26.pdf")], NOW),
  [],
  "a medical record's date is not a deadline",
);
assert.deepEqual(
  proposeDeadlines([f("order setting hearing 2026-04-16.pdf")], NOW),
  [],
  "a hearing that already happened is history, not a deadline",
);

const future = proposeDeadlines(
  [
    f("order setting hearing 2026-09-15.pdf"),
    f("notice of hearing 2026-12-01.pdf"),
    f("declaration 2026-11-01.pdf"), // not deadline-bearing
  ],
  NOW,
);
assert.deepEqual(future.map((c) => c.date), ["2026-09-15", "2026-12-01"], "sorted, filtered");

// --- Whole-folder proposal -------------------------------------------------
const state = proposeCaseState(
  [...piFolder, f("notice of hearing 2026-10-20.pdf")],
  NOW,
);
assert.equal(state.posture, "Hearing Scheduled");
assert.equal(state.nextDeadline, "2026-10-20");
assert.match(state.deadlineEvidence, /notice of hearing/);
assert.equal(state.deadlineCandidates.length, 1);

// No date anywhere → posture still inferred, deadline stays null rather than
// being invented.
const noDate = proposeCaseState([f("470508 ANSWER.pdf")], NOW);
assert.equal(noDate.posture, "Responsive Pleading Filed");
assert.equal(noDate.nextDeadline, null);
assert.equal(noDate.deadlineEvidence, null);

// Empty folder is safe.
const empty = proposeCaseState([], NOW);
assert.equal(empty.posture, "Intake");
assert.equal(empty.nextDeadline, null);

console.log("verify-case-state: OK");
