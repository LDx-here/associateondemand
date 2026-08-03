#!/usr/bin/env node
/** Verify practice-pulse aggregates — what needs the attorney's attention. */
import assert from "node:assert/strict";

import {
  QUIET_AFTER_DAYS,
  lastAttorneyActivityAt,
  mattersNeedingAttention,
  practicePulse,
} from "../src/lib/practice-pulse.ts";

const NOW = new Date("2026-08-03T12:00:00Z");

const matter = (matterId, extra = {}) => ({
  id: `rec-${matterId}`,
  matterId,
  clientName: matterId,
  caseType: "Immigration",
  status: "Open",
  ...extra,
});

const note = (matterId, createdAt, extra = {}) => ({
  id: `n-${matterId}-${createdAt}`,
  matterId,
  author: "Attorney",
  content: "x",
  createdAt,
  type: "Manual",
  ...extra,
});

// --- lastAttorneyActivityAt ------------------------------------------------
// Machine notes must not count as attorney activity. This is the crux: every
// imported matter carries a System "Import" note dated at import time, so
// counting it would make a six-month-quiet case look touched today.
const importedNotes = [
  note("M1", "2026-08-03T00:00:00Z", { author: "System", type: "Import" }),
  note("M1", "2026-08-03T00:00:00Z", { author: "pm_orchestrator", type: "Agent" }),
];
assert.equal(
  lastAttorneyActivityAt("M1", importedNotes),
  null,
  "import and agent notes are not attorney activity",
);

assert.equal(
  lastAttorneyActivityAt("M1", [...importedNotes, note("M1", "2026-07-01T00:00:00Z")]),
  "2026-07-01T00:00:00Z",
);

// Picks the latest, and ignores other matters' notes.
assert.equal(
  lastAttorneyActivityAt("M1", [
    note("M1", "2026-06-01T00:00:00Z"),
    note("M1", "2026-07-20T00:00:00Z"),
    note("M2", "2026-08-01T00:00:00Z"),
  ]),
  "2026-07-20T00:00:00Z",
);

// --- mattersNeedingAttention ----------------------------------------------
const matters = [
  matter("IMPORTED"), // only an import note → never touched
  matter("QUIET"), // last touched long ago
  matter("SCHEDULED"), // recent + has a deadline → fine
  matter("NO_DEADLINE"), // recent but nothing scheduled
  matter("CLOSED", { status: "Closed" }), // excluded entirely
];

const notes = [
  note("IMPORTED", "2026-08-03T00:00:00Z", { author: "System", type: "Import" }),
  note("QUIET", "2026-02-01T00:00:00Z"),
  note("SCHEDULED", "2026-08-01T00:00:00Z"),
  note("NO_DEADLINE", "2026-08-01T00:00:00Z"),
  note("CLOSED", "2026-01-01T00:00:00Z"),
];

const tasks = [
  { id: "t1", matterId: "SCHEDULED", description: "File brief", status: "Open", dueDate: "2026-08-10" },
  // Done tasks and undated tasks must not count as "scheduled".
  { id: "t2", matterId: "NO_DEADLINE", description: "Old", status: "Done", dueDate: "2026-08-10" },
  { id: "t3", matterId: "NO_DEADLINE", description: "Undated", status: "Open", dueDate: null },
];

const attention = mattersNeedingAttention(matters, notes, tasks, NOW);
const ids = attention.map((a) => a.matter.matterId);

assert.ok(!ids.includes("CLOSED"), "closed matters are never flagged");
assert.ok(!ids.includes("SCHEDULED"), "recent activity + a deadline is not attention-worthy");
assert.deepEqual(ids, ["IMPORTED", "QUIET", "NO_DEADLINE"], "ordered by urgency");

assert.equal(attention[0].reason, "never_touched");
assert.equal(attention[0].daysQuiet, null);
assert.match(attention[0].label, /no activity/i);

assert.equal(attention[1].reason, "quiet");
assert.equal(attention[1].daysQuiet, 183);
assert.match(attention[1].label, /quiet 183 days/);

assert.equal(attention[2].reason, "no_deadline");
assert.match(attention[2].label, /no deadline/i);

// A matter sitting exactly on the threshold counts as quiet.
const thresholdIso = new Date(
  NOW.getTime() - QUIET_AFTER_DAYS * 86_400_000,
).toISOString();
const edge = mattersNeedingAttention(
  [matter("EDGE")],
  [note("EDGE", thresholdIso)],
  [],
  NOW,
);
assert.equal(edge[0].reason, "quiet");
assert.equal(edge[0].daysQuiet, QUIET_AFTER_DAYS);

// Longest-quiet sorts first among quiet matters.
const ordered = mattersNeedingAttention(
  [matter("A"), matter("B")],
  [note("A", "2026-06-01T00:00:00Z"), note("B", "2026-01-01T00:00:00Z")],
  [],
  NOW,
);
assert.deepEqual(ordered.map((a) => a.matter.matterId), ["B", "A"]);

// --- practicePulse ---------------------------------------------------------
const pulse = practicePulse(matters, notes, tasks, NOW);
assert.equal(pulse.openMatters, 4, "closed matters excluded from the count");
assert.equal(pulse.needsAttention, 3);
assert.equal(pulse.dueSoon, 1, "SCHEDULED has a task due inside the window");
// SCHEDULED is the only open matter neither flagged nor imminent... but it IS
// due soon, so nothing is left on track.
assert.equal(pulse.onTrack, 0);

// A deadline outside the window is not "due soon".
const farPulse = practicePulse(
  [matter("FAR")],
  [note("FAR", "2026-08-01T00:00:00Z")],
  [{ id: "t", matterId: "FAR", description: "x", status: "Open", dueDate: "2026-12-01" }],
  NOW,
);
assert.equal(farPulse.dueSoon, 0);
assert.equal(farPulse.needsAttention, 0, "recent activity + a future deadline is fine");
assert.equal(farPulse.onTrack, 1);

// Empty practice does not throw or produce NaN.
const empty = practicePulse([], [], [], NOW);
assert.deepEqual(empty, { openMatters: 0, needsAttention: 0, dueSoon: 0, onTrack: 0 });

console.log("verify-practice-pulse: OK");
