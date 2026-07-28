#!/usr/bin/env node
/** Verify the practice importer against the firm's REAL folder shapes. */
import assert from "node:assert/strict";

import {
  buildProposedMatter,
  buildProposedMatters,
  caseTypeFor,
  classifyDocument,
  daysSinceActivity,
  inferPracticeArea,
  normalizeClientName,
  parseClientFolderName,
} from "../src/lib/practice-import.ts";

// --- Folder names observed live in "03 Clients Active" -----------------------
assert.deepEqual(parseClientFolderName("2026-002-Hammond, Jeremiah"), {
  matterNumber: "2026-002",
  clientName: "Jeremiah Hammond",
});
// Spaces around both separators.
assert.deepEqual(parseClientFolderName("2026-003 - Tina Akyaa"), {
  matterNumber: "2026-003",
  clientName: "Tina Akyaa",
});
// Trailing type tag.
assert.deepEqual(parseClientFolderName("2025-001-Konst, John-DV"), {
  matterNumber: "2025-001",
  clientName: "John Konst",
  tag: "DV",
});
// Surname only, stray space after the separator.
assert.deepEqual(parseClientFolderName("2026-005- Augustine"), {
  matterNumber: "2026-005",
  clientName: "Augustine",
});
assert.deepEqual(parseClientFolderName("2026-006- Makhammad"), {
  matterNumber: "2026-006",
  clientName: "Makhammad",
});

// A hyphenated surname must not be eaten as a type tag.
assert.deepEqual(parseClientFolderName("2026-010-Garcia-Lopez, Maria"), {
  matterNumber: "2026-010",
  clientName: "Maria Garcia-Lopez",
});

// Non-client folders in the same directory must be skipped, not half-parsed.
assert.equal(parseClientFolderName("000-Case Viability"), null);
assert.equal(parseClientFolderName("appearances"), null);
assert.equal(parseClientFolderName("untitled folder"), null);
assert.equal(parseClientFolderName("Immigration"), null);
assert.equal(parseClientFolderName(""), null);

assert.equal(normalizeClientName("Hammond, Jeremiah"), "Jeremiah Hammond");
assert.equal(normalizeClientName("Augustine"), "Augustine");
assert.equal(normalizeClientName("Konst,"), "Konst");

// --- Practice area ----------------------------------------------------------
assert.equal(inferPracticeArea("Personal Injury"), "personal_injury");
assert.equal(inferPracticeArea("Property Damage Only"), "property_damage");
assert.equal(inferPracticeArea("Immigration"), "immigration");
assert.equal(inferPracticeArea("Leads"), "unknown");

// --- Document classification, using real filenames --------------------------
assert.equal(classifyDocument("470508-complaint - 1of1-2168715.pdf").category, "Court Filing");
assert.equal(classifyDocument("470508 ANSWER.pdf").category, "Court Filing");
assert.equal(classifyDocument("470508-order setting hearing.pdf").category, "Court Filing");
assert.equal(classifyDocument("Viazovikova Response to Scheduling Order.docx").category, "Court Filing");
assert.equal(classifyDocument("Viazovikova_Declaration_DRAFT").category, "Court Filing");
assert.equal(classifyDocument("UM-UIM & MedPay LOR - Hammond.docx").category, "Representation");
assert.equal(classifyDocument("IIA Service Agreement_Aigul Viazovikova.docx").category, "Engagement");
assert.equal(classifyDocument("8.1 - MHMC surgery R&B 2-12-26.pdf").category, "Medical Record");
assert.equal(classifyDocument("Diminished Value Resolution - 35-91R7-04K.pdf").category, "Valuation");
assert.equal(classifyDocument("Northland Insurance Correspondence Screenshot.png").category, "Insurance");
assert.equal(classifyDocument("crash report.pdf").category, "Evidence");
assert.equal(classifyDocument("random-thing.txt").category, "Other");

// Court filings and representation letters are procedural events; a medical
// records copy existing in a folder is not.
assert.equal(classifyDocument("470508 ANSWER.pdf").isTimelineEvent, true);
assert.equal(classifyDocument("LOR - Akyaa.docx").isTimelineEvent, true);
assert.equal(classifyDocument("8.1 - MHMC surgery R&B 2-12-26.pdf").isTimelineEvent, false);

// --- Whole-folder assembly --------------------------------------------------
const hammond = buildProposedMatter({
  folderName: "2026-002-Hammond, Jeremiah",
  parentFolder: "Personal Injury",
  files: [
    { name: "UM_UIM LOR - Hammond.docx", modifiedAt: "2026-03-02T10:00:00Z" },
    { name: "crash report.pdf", modifiedAt: "2026-02-01T10:00:00Z" },
    { name: ".DS_Store", modifiedAt: "2026-07-01T10:00:00Z" },
    { name: "~$draft.docx", modifiedAt: "2026-07-01T10:00:00Z" },
  ],
});
assert.ok(hammond);
assert.equal(hammond.clientName, "Jeremiah Hammond");
assert.equal(hammond.practiceArea, "personal_injury");
// Junk files excluded — and critically, they must not become "last activity".
assert.equal(hammond.documents.length, 2);
assert.equal(hammond.lastActivityAt, "2026-03-02T10:00:00Z");
// Documents sorted oldest-first, so the case reads chronologically.
assert.equal(hammond.documents[0].title, "crash report");
// Only the LOR is a procedural event.
assert.equal(hammond.timeline.length, 1);
assert.equal(hammond.timeline[0].category, "Representation");
assert.equal(caseTypeFor(hammond), "Personal Injury");

const konst = buildProposedMatter({
  folderName: "2025-001-Konst, John-DV",
  parentFolder: "Property Damage Only",
  files: [{ name: "Diminished Value Resolution.pdf", modifiedAt: "2026-04-01T10:00:00Z" }],
});
assert.ok(konst);
assert.equal(konst.tag, "DV");
assert.equal(caseTypeFor(konst), "Property Damage - Diminished Value");

// A folder with no files at all is still a real matter (e.g. 2026-005 Augustine).
const empty = buildProposedMatter({
  folderName: "2026-005- Augustine",
  parentFolder: "Immigration",
  files: [],
});
assert.ok(empty, "an empty client folder is still a matter");
assert.equal(empty.lastActivityAt, null);
assert.equal(daysSinceActivity(empty, new Date("2026-07-28T00:00:00Z")), null);

assert.equal(
  daysSinceActivity(hammond, new Date("2026-04-01T10:00:00Z")),
  30,
  "quiet-case detection counts days since the newest real document",
);

// Non-client folders are dropped from a mixed listing rather than throwing.
const batch = buildProposedMatters([
  { folderName: "2026-002-Hammond, Jeremiah", parentFolder: "Personal Injury", files: [] },
  { folderName: "appearances", parentFolder: "03 Clients Active", files: [] },
  { folderName: "2026-006- Makhammad", parentFolder: "Immigration", files: [] },
]);
assert.equal(batch.length, 2);
// Newest matter number first.
assert.equal(batch[0].matterNumber, "2026-006");

console.log("verify-practice-import: OK");

// --- Practice area from filenames when there's no parent-folder signal ------
// Observed live: 2026-005 and 2026-006 sit directly in "03 Clients Active".
const makhammad = buildProposedMatter({
  folderName: "2026-006- Makhammad",
  parentFolder: "03 Clients Active",
  files: [
    { name: "motion-remote-appearance-izzatov.pdf", modifiedAt: "2026-07-23T10:00:00Z" },
    { name: "proposed-order-remote-appearance-izzatov.pdf", modifiedAt: "2026-07-23T10:00:00Z" },
  ],
});
assert.equal(makhammad.practiceArea, "immigration", "remote-appearance motion signals immigration");
assert.equal(caseTypeFor(makhammad), "Immigration");

// Parent folder still wins when it is explicit.
const explicit = buildProposedMatter({
  folderName: "2026-002-Hammond, Jeremiah",
  parentFolder: "Personal Injury",
  files: [{ name: "asylum-notes.pdf", modifiedAt: "2026-07-23T10:00:00Z" }],
});
assert.equal(explicit.practiceArea, "personal_injury", "explicit parent folder beats filename guess");

// No signal at all stays unknown rather than guessing.
const bare = buildProposedMatter({
  folderName: "2026-005- Augustine",
  parentFolder: "03 Clients Active",
  files: [],
});
assert.equal(bare.practiceArea, "unknown");

console.log("verify-practice-import: area inference OK");
