#!/usr/bin/env node
/** Verify note → case facts extraction + case narrative (Journal pass 1 arc). */
import assert from "node:assert/strict";

import {
  buildCaseNarrative,
  extractFactsFromNoteContent,
  isNarrativeNote,
  suggestFactMergeFromNote,
} from "../src/lib/note-fact-extraction.ts";

const attorneyNote = {
  id: "n1",
  matterId: "AOD-1001",
  author: "Attorney",
  content: "Client called about extreme hardship to U.S. citizen spouse. A123456789. Hearing March 15, 2026.",
  createdAt: "2026-07-20T15:00:00Z",
  type: "Manual",
  activity: "Call",
  minutes: 12,
  billable: true,
};

const agentNote = {
  id: "n2",
  matterId: "AOD-1001",
  author: "Agent",
  content: "Draft memo body…",
  createdAt: "2026-07-21T10:00:00Z",
  type: "Agent",
};

const factsJsonNote = {
  id: "n3",
  matterId: "AOD-1001",
  author: "Attorney",
  content: '{"v":1,"practiceArea":"immigration","fields":{}}',
  createdAt: "2026-07-22T10:00:00Z",
  type: "Facts",
};

assert.equal(isNarrativeNote(attorneyNote), true);
assert.equal(isNarrativeNote(agentNote), false);
assert.equal(isNarrativeNote(factsJsonNote), false);

const narrative = buildCaseNarrative([agentNote, attorneyNote], "General Asylum");
assert.equal(narrative.length, 1);
assert.match(narrative[0].paragraph, /Jul 20, 2026/);
assert.match(narrative[0].paragraph, /call, 0\.2 hr/);
assert.match(narrative[0].paragraph, /extreme hardship/i);

const extracted = extractFactsFromNoteContent(attorneyNote.content);
assert.ok(extracted.some((f) => f.fact_type === "a_number"));
assert.ok(extracted.some((f) => f.fact_type === "hardship_narrative"));

const merge = suggestFactMergeFromNote(
  attorneyNote.content,
  "AOD-1001",
  null,
  "Immigration - Asylum",
  "aos-discretionary-brief",
);
assert.ok(merge);
assert.ok(merge.filledFieldIds.length >= 1);
assert.ok(merge.fieldLabels.length >= 1);
assert.equal(merge.mergedPayload.v, 1);

// When all mappable fields are already filled, no suggestion is shown.
const existingFilled = {
  v: 1,
  practiceArea: "immigration_asylum",
  caseType: "Immigration - Asylum",
  deliverableId: "aos-discretionary-brief",
  fields: {
    qualifyingRelative: "Already set by attorney",
    extremeHardshipFactors: "Prior attorney narrative on hardship",
  },
};
const noNewFields = suggestFactMergeFromNote(
  "Qualifying relative is LPR mother with extreme hardship. A987654321.",
  "AOD-1001",
  existingFilled,
  "Immigration - Asylum",
);
assert.equal(noNewFields, null);

console.log("verify-note-fact-extraction: OK");
