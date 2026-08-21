#!/usr/bin/env node
/** Verify work inference — propose from her words, never fabricate. */
import assert from "node:assert/strict";

import { detectWorkFromNote } from "../src/lib/work-detection.ts";
import { DEFAULT_MINUTES } from "../src/lib/work-entry.ts";

// --- Notes in the shape she actually writes --------------------------------
const cases = [
  ["Called client re: country conditions affidavit.", "Call"],
  ["Spoke with opposing counsel about the settlement.", "Call"],
  ["Left a message for the adjuster.", "Call"],
  ["Emailed the I-589 packet to the client.", "Email"],
  ["Met with client to go over the declaration.", "Meeting"],
  ["Zoom consult with prospective client.", "Meeting"],
  ["Drafted the response to the scheduling order.", "Drafting"],
  ["Revised the demand letter.", "Drafting"],
  ["Researched Sixth Circuit asylum standard on Westlaw.", "Research"],
  ["Reviewed the medical records.", "Review"],
  ["Filed the motion for remote appearance.", "Filing"],
  ["Attended the master calendar hearing.", "Court"],
];
for (const [note, expected] of cases) {
  const s = detectWorkFromNote(note);
  assert.ok(s, `expected a suggestion for: ${note}`);
  assert.equal(s.activity, expected, `${note} -> ${s.activity}, expected ${expected}`);
  assert.equal(s.minutes, DEFAULT_MINUTES[expected], "defaults to the activity's typical duration");
  assert.equal(s.durationFromNote, false);
}

// --- Silence when there is no signal ---------------------------------------
// A note recording a fact is not work. Guessing here would train her to
// distrust every suggestion.
for (const note of [
  "",
  "   ",
  "Client's A-number is A123-456-789.",
  "Hearing is set for the 14th.",
  "Note to self: country conditions packet is in the shared folder.",
]) {
  assert.equal(detectWorkFromNote(note), null, `should stay silent: "${note}"`);
}

// --- A stated duration always beats the default ---------------------------
const twenty = detectWorkFromNote("20 min call with the client.");
assert.equal(twenty.activity, "Call");
assert.equal(twenty.minutes, 24, "20 min rounds up to the 0.4 billing increment");
assert.equal(twenty.durationFromNote, true);

const hourAndHalf = detectWorkFromNote("Drafted the brief — spent 1.5 hours.");
assert.equal(hourAndHalf.minutes, 90);
assert.equal(hourAndHalf.durationFromNote, true);

assert.equal(detectWorkFromNote("Reviewed records, 45m.").minutes, 48);
assert.equal(detectWorkFromNote("2 hrs of research on the PSG issue.").minutes, 120);

// Sub-increment time still bills — rounding a short call to zero is the leak.
assert.equal(detectWorkFromNote("2 minute call to confirm the date.").minutes, 6);

// Implausible durations are ignored rather than logging a 40-hour phone call.
const absurd = detectWorkFromNote("Called about the 99 hour delay.");
assert.equal(absurd.durationFromNote, false, "99 hours is not a duration she worked");
assert.equal(absurd.minutes, DEFAULT_MINUTES.Call);

// --- Specificity ordering --------------------------------------------------
// "Drafted a motion for the hearing" is drafting, not a court appearance.
assert.equal(detectWorkFromNote("Drafted a motion for the hearing.").activity, "Drafting");
// Filing outranks drafting when both appear — the filing is the billable event.
assert.equal(detectWorkFromNote("Filed the brief I drafted yesterday.").activity, "Filing");
// An actual appearance still reads as Court.
assert.equal(detectWorkFromNote("Appeared before the IJ this morning.").activity, "Court");

// --- The matched phrase is surfaced so she can see why --------------------
const why = detectWorkFromNote("Called client re: affidavit.");
assert.match(why.matchedOn, /call/i);

// --- Case insensitivity and multi-line ------------------------------------
assert.equal(detectWorkFromNote("CALLED THE CLIENT").activity, "Call");
assert.equal(
  detectWorkFromNote("Client update.\nDrafted the declaration today.").activity,
  "Drafting",
);

console.log("verify-work-detection: OK");
