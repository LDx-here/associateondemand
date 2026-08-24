#!/usr/bin/env node
/** Verify the case story reads like prose about a person, not a form. */
import assert from "node:assert/strict";

import { buildCaseStory, buildStoryTimeline, humanAge } from "../src/lib/case-story.ts";

const NOW = new Date("2026-08-07T12:00:00Z");

const matter = (extra = {}) => ({
  id: "rec1",
  matterId: "AOD-1008",
  clientName: "Aigul Viazovikova",
  caseType: "Immigration",
  status: "Open",
  nextDeadline: null,
  assignedAttorney: "La'Dajia Ferguson",
  summary: "",
  ...extra,
});

const note = (createdAt, extra = {}) => ({
  id: `n-${createdAt}`,
  matterId: "AOD-1008",
  author: "Attorney",
  content: "Called client about the affidavit.",
  createdAt,
  type: "Manual",
  ...extra,
});

const text = (story) => story.sentences.map((s) => s.text).join(" ");

// --- humanAge reads the way a person speaks -------------------------------
assert.equal(humanAge("2026-08-07T09:00:00Z", NOW), "today");
assert.equal(humanAge("2026-08-06T09:00:00Z", NOW), "yesterday");
assert.equal(humanAge("2026-08-02T12:00:00Z", NOW), "5 days ago");
assert.equal(humanAge("2026-07-01T12:00:00Z", NOW), "about a month ago");
assert.equal(humanAge("2026-02-07T12:00:00Z", NOW), "6 months ago");
assert.equal(humanAge("2025-02-07T12:00:00Z", NOW), "about a year ago");

// --- Posture becomes a sentence, not a field ------------------------------
const scheduled = buildCaseStory(
  matter({ posture: "Awaiting Scheduling", court: "EOIR Cleveland" }),
  [note("2026-08-05T12:00:00Z")],
  [],
  [],
  NOW,
);
assert.match(scheduled.headline, /Aigul Viazovikova — Immigration/);
assert.match(text(scheduled), /awaiting scheduling/);
assert.match(text(scheduled), /before EOIR Cleveland/);
assert.match(text(scheduled), /You last worked it 2 days ago\./);

// --- Absent data produces silence, not em-dashes --------------------------
// This is the whole reason the old view was unreadable.
const bare = buildCaseStory(matter(), [], [], [], NOW);
assert.ok(!text(bare).includes("—"), "no em-dash placeholders in prose");
assert.ok(!/undefined|null|NaN/.test(text(bare)), "no leaked empty values");
assert.match(text(bare), /have not logged any work/);
assert.match(text(bare), /Nothing is scheduled/);

// --- Import notes are not "your work" -------------------------------------
// An imported matter's only note is a System import summary; saying she
// worked it today would hide exactly the case that needs picking up.
const importedOnly = buildCaseStory(
  matter(),
  [note("2026-08-07T00:00:00Z", { author: "System", type: "Import" })],
  [],
  [],
  NOW,
);
assert.match(text(importedOnly), /have not logged any work/);

// --- Deadlines ------------------------------------------------------------
const soon = buildCaseStory(matter({ nextDeadline: "2026-08-14" }), [], [], [], NOW);
assert.match(text(soon), /Next deadline is August 14, 2026, in 7 days\./);
assert.equal(
  soon.sentences.find((s) => s.text.includes("Next deadline")).tone,
  "attention",
  "a deadline inside two weeks needs emphasis",
);

const past = buildCaseStory(matter({ nextDeadline: "2026-07-01" }), [], [], [], NOW);
assert.match(text(past), /A deadline passed on July 1, 2026\./);
assert.equal(past.sentences.find((s) => s.text.includes("passed")).tone, "attention");

const far = buildCaseStory(matter({ nextDeadline: "2026-12-01" }), [], [], [], NOW);
assert.equal(
  far.sentences.find((s) => s.text.includes("Next deadline")).tone,
  "neutral",
  "a distant deadline is context, not an alarm",
);

// A task deadline counts when the matter itself has none.
const viaTask = buildCaseStory(
  matter(),
  [],
  [{ id: "t1", matterId: "AOD-1008", description: "File brief", status: "Open", dueDate: "2026-08-20" }],
  [],
  NOW,
);
assert.match(text(viaTask), /Next deadline is August 20, 2026/);

// --- Open tasks, and the undated ones that hide from the calendar ---------
const tasks = buildCaseStory(
  matter({ nextDeadline: "2026-09-01" }),
  [],
  [
    { id: "t1", matterId: "AOD-1008", description: "A", status: "Open", dueDate: "2026-09-01" },
    { id: "t2", matterId: "AOD-1008", description: "B", status: "Open", dueDate: null },
    { id: "t3", matterId: "AOD-1008", description: "C", status: "Done", dueDate: "2026-07-01" },
  ],
  [],
  NOW,
);
assert.match(text(tasks), /2 open tasks, 1 without a date\./);

// --- Logged time ----------------------------------------------------------
const billed = buildCaseStory(
  matter(),
  [
    note("2026-08-05T12:00:00Z", { activity: "Call", minutes: 30, billable: true }),
    note("2026-08-06T12:00:00Z", { activity: "Drafting", minutes: 60, billable: true }),
  ],
  [],
  [],
  NOW,
);
assert.match(text(billed), /logged 1\.5 billable hours across 2 entries/);

// Singular reads correctly.
const oneEntry = buildCaseStory(
  matter(),
  [note("2026-08-05T12:00:00Z", { activity: "Call", minutes: 6, billable: true })],
  [],
  [],
  NOW,
);
assert.match(oneEntry.sentences.map((s) => s.text).join(" "), /across 1 entry/);

// --- Contacts: the client is implied; co-counsel is worth saying ----------
const withCo = buildCaseStory(matter(), [], [], [
  { id: "c1", displayName: "Aigul Viazovikova", role: "Client" },
  { id: "c2", displayName: "Jordan Lee", role: "Co-Counsel" },
], NOW);
assert.match(text(withCo), /Also on this matter: Jordan Lee \(co-counsel\)\./);
assert.ok(!text(withCo).includes("Aigul Viazovikova ("), "the client is not listed as an 'also'");

const clientOnly = buildCaseStory(matter(), [], [], [
  { id: "c1", displayName: "Aigul Viazovikova", role: "Client" },
], NOW);
assert.ok(!text(clientOnly).includes("Also on this matter"), "no sentence when there is no one else");

// --- Timeline merges sources, newest first --------------------------------
const timeline = buildStoryTimeline(
  matter(),
  [
    note("2026-08-05T12:00:00Z", { content: "Called client about the affidavit." }),
    { ...note("2026-08-01T12:00:00Z"), matterId: "OTHER", content: "different matter" },
  ],
  [
    { id: "t1", matterId: "AOD-1008", description: "Send LOR", status: "Done", dueDate: "2026-08-03" },
    { id: "t2", matterId: "AOD-1008", description: "Undated", status: "Done", dueDate: null },
  ],
  [{ title: "I-589 draft", uploadedAt: "2026-08-04T12:00:00Z" }],
);
assert.deepEqual(
  timeline.map((e) => e.kind),
  ["note", "document", "task"],
  "newest first across all three sources",
);
assert.ok(!timeline.some((e) => e.label.includes("different matter")), "other matters excluded");
assert.ok(!timeline.some((e) => e.label.includes("Undated")), "undated tasks have no timeline position");

// Long notes are truncated rather than blowing out the layout.
const longNote = buildStoryTimeline(
  matter(),
  [note("2026-08-05T12:00:00Z", { content: "x".repeat(200) })],
  [],
  [],
);
assert.ok(longNote[0].label.endsWith("…"));
assert.ok(longNote[0].label.length <= 100);

// Only the first line of a multi-line note becomes the label.
const multiline = buildStoryTimeline(
  matter(),
  [note("2026-08-05T12:00:00Z", { content: "First line\nSecond line\nThird" })],
  [],
  [],
);
assert.equal(multiline[0].label, "First line");

// Structured payload notes are storage, not events. Before this filter the
// anchors intake showed up in "Recently on this matter" as a bare "Anchors",
// and a drafting-facts note would have shown a slab of JSON.
const structured = buildStoryTimeline(
  matter(),
  [
    note("2026-08-05T12:00:00Z", { content: "Anchors\n{\"answers\":{}}", type: "Anchors" }),
    note("2026-08-04T12:00:00Z", { content: '{"v":1,"practiceArea":"Immigration"}', type: "Facts" }),
    note("2026-08-03T12:00:00Z", { content: '{"entries":[]}', type: "Procedural" }),
    note("2026-08-02T12:00:00Z", { content: '{"pages":[]}', type: "Assessment Document" }),
    note("2026-08-01T12:00:00Z", { content: "Called client about the hearing." }),
  ],
  [],
  [],
);
assert.equal(structured.length, 1, "only the note she actually wrote is an event");
assert.equal(structured[0].label, "Called client about the hearing.");

assert.deepEqual(buildStoryTimeline(matter(), [], [], []), [], "empty case is safe");

console.log("verify-case-story: OK");
