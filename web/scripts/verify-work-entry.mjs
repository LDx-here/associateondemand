#!/usr/bin/env node
/** Verify work-capture helpers — note-as-billable-work-entry (Journal pass 1). */
import assert from "node:assert/strict";

import {
  DEFAULT_MINUTES,
  WORK_ACTIVITIES,
  formatWorkDuration,
  isWorkActivity,
  notesMissingTime,
  parseWorkEntry,
  rollUpWork,
  rollUpWorkSince,
  roundToBillingIncrement,
  toBillableHours,
} from "../src/lib/work-entry.ts";

// Billing increments: legal time is billed in tenths of an hour, and anything
// logged rounds UP to at least 0.1 — rounding a short call to zero is exactly
// the unbilled-time leak this feature exists to close.
assert.equal(roundToBillingIncrement(1), 6);
assert.equal(roundToBillingIncrement(6), 6);
assert.equal(roundToBillingIncrement(7), 12);
assert.equal(roundToBillingIncrement(30), 30);
assert.equal(roundToBillingIncrement(0), 0);
assert.equal(roundToBillingIncrement(-5), 0);
assert.equal(roundToBillingIncrement(Number.NaN), 0);

assert.equal(toBillableHours(6), "0.1");
assert.equal(toBillableHours(30), "0.5");
assert.equal(toBillableHours(90), "1.5");
assert.match(formatWorkDuration(18), /0\.3 hr/);

// Every activity needs a default duration, or picking it can't auto-fill time.
for (const activity of WORK_ACTIVITIES) {
  assert.ok(isWorkActivity(activity));
  assert.ok(DEFAULT_MINUTES[activity] > 0, `${activity} needs a default duration`);
  assert.equal(
    roundToBillingIncrement(DEFAULT_MINUTES[activity]),
    DEFAULT_MINUTES[activity],
    `${activity} default must already be a clean billing increment`,
  );
}
assert.ok(!isWorkActivity("Nap"));

// Parsing untrusted input.
assert.equal(parseWorkEntry(undefined), null);
assert.equal(parseWorkEntry(null), null);
assert.equal(parseWorkEntry("Call"), null);
assert.equal(parseWorkEntry({ activity: "Bogus", minutes: 12 }), null);
assert.equal(parseWorkEntry({ activity: "Call", minutes: 0 }), null);
assert.equal(parseWorkEntry({ activity: "Call" }), null);

const parsed = parseWorkEntry({ activity: "Call", minutes: 7 });
assert.deepEqual(parsed, { activity: "Call", minutes: 12, billable: true });
// Billable unless explicitly false — a missing flag must never silently write off time.
assert.equal(parseWorkEntry({ activity: "Call", minutes: 6, billable: undefined }).billable, true);
assert.equal(parseWorkEntry({ activity: "Call", minutes: 6, billable: false }).billable, false);

// Roll-ups.
const notes = [
  { id: "1", matterId: "M1", author: "A", content: "call", createdAt: "2026-07-20T10:00:00Z", type: "Manual", activity: "Call", minutes: 12, billable: true },
  { id: "2", matterId: "M1", author: "A", content: "draft", createdAt: "2026-07-21T10:00:00Z", type: "Manual", activity: "Drafting", minutes: 60, billable: true },
  { id: "3", matterId: "M1", author: "A", content: "courtesy", createdAt: "2026-07-22T10:00:00Z", type: "Manual", activity: "Call", minutes: 6, billable: false },
  { id: "4", matterId: "M1", author: "A", content: "no time logged", createdAt: "2026-07-23T10:00:00Z", type: "Manual" },
  { id: "5", matterId: "M1", author: "Agent", content: "agent output", createdAt: "2026-07-24T10:00:00Z", type: "Agent" },
];

const rollup = rollUpWork(notes);
assert.equal(rollup.billableMinutes, 72);
assert.equal(rollup.nonBillableMinutes, 6);
assert.equal(rollup.totalMinutes, 78);
assert.equal(rollup.entryCount, 3);
// Sorted by time descending; Call's two entries aggregate across billable and not.
assert.deepEqual(rollup.byActivity, [
  { activity: "Drafting", minutes: 60 },
  { activity: "Call", minutes: 18 },
]);

const since = rollUpWorkSince(notes, new Date("2026-07-21T00:00:00Z"));
assert.equal(since.billableMinutes, 60, "entries before the cutoff are excluded");
assert.equal(since.nonBillableMinutes, 6);

// Unbilled-time leak: a manual note with no time is a candidate to fix, but
// machine-written notes are not work the attorney performed. Note types are
// free text, so matching must be loose — an exact "System" check let the
// demo seed's "System Log" note through and inflated the leak count.
const missing = notesMissingTime(notes);
assert.equal(missing.length, 1);
assert.equal(missing[0].id, "4");

const machineNotes = [
  { id: "m1", matterId: "M1", author: "System", content: "x", createdAt: "2026-07-20T10:00:00Z", type: "System Log" },
  { id: "m2", matterId: "M1", author: "pm_orchestrator", content: "x", createdAt: "2026-07-20T10:00:00Z", type: "Agent Output" },
  { id: "m3", matterId: "M1", author: "System", content: "x", createdAt: "2026-07-20T10:00:00Z", type: "Assessment OCR" },
  { id: "m4", matterId: "M1", author: "System", content: "x", createdAt: "2026-07-20T10:00:00Z", type: "Drafting Facts" },
];
assert.equal(notesMissingTime(machineNotes).length, 0, "machine notes are never unbilled time");
// ...but a real attorney note with an unrelated type still counts.
assert.equal(
  notesMissingTime([
    { id: "a1", matterId: "M1", author: "Attorney", content: "x", createdAt: "2026-07-20T10:00:00Z", type: "Client Call" },
  ]).length,
  1,
);

assert.equal(rollUpWork([]).totalMinutes, 0);

console.log("verify-work-entry: OK");
