/** Verify matter lifecycle stage transitions + task-checklist templates + dashboard aggregates. */
import assert from "node:assert/strict";

import {
  DEFAULT_LIFECYCLE_STAGE,
  isMatterLifecycleStage,
  isValidLifecycleTransition,
  MATTER_LIFECYCLE_STAGES,
  normalizeLifecycleStage,
} from "../src/lib/matter-lifecycle-stage.ts";
import { stageTaskTemplates } from "../src/lib/matter-task-templates.ts";
import {
  filingDeadlinesMissingDate,
  matterLifecycleBreakdown,
} from "../src/lib/dashboard-aggregates.ts";

// --- normalizeLifecycleStage --------------------------------------------

assert.equal(normalizeLifecycleStage(undefined), DEFAULT_LIFECYCLE_STAGE);
assert.equal(normalizeLifecycleStage(null), DEFAULT_LIFECYCLE_STAGE);
assert.equal(normalizeLifecycleStage(""), DEFAULT_LIFECYCLE_STAGE);
assert.equal(normalizeLifecycleStage("Not a real stage"), DEFAULT_LIFECYCLE_STAGE);
assert.equal(normalizeLifecycleStage("Active"), "Active");
assert.equal(normalizeLifecycleStage("Filed/Awaiting Decision"), "Filed/Awaiting Decision");

assert.equal(isMatterLifecycleStage("Closed"), true);
assert.equal(isMatterLifecycleStage("Bogus"), false);

// --- isValidLifecycleTransition ------------------------------------------

// Forward progression, one stage at a time, is always legal.
assert.equal(isValidLifecycleTransition("Intake", "Active"), true);
assert.equal(isValidLifecycleTransition("Active", "Filed/Awaiting Decision"), true);
assert.equal(isValidLifecycleTransition("Filed/Awaiting Decision", "Resolution"), true);
assert.equal(isValidLifecycleTransition("Resolution", "Closed"), true);

// Reopen-from-Closed and one-step-back are legal.
assert.equal(isValidLifecycleTransition("Closed", "Active"), true);
assert.equal(isValidLifecycleTransition("Active", "Intake"), true);
assert.equal(isValidLifecycleTransition("Filed/Awaiting Decision", "Active"), true);
assert.equal(isValidLifecycleTransition("Resolution", "Active"), true);

// Skipping stages, moving backward more than one step, or self-transitions are illegal.
assert.equal(isValidLifecycleTransition("Intake", "Closed"), false);
assert.equal(isValidLifecycleTransition("Intake", "Resolution"), false);
assert.equal(isValidLifecycleTransition("Closed", "Intake"), false);
assert.equal(isValidLifecycleTransition("Active", "Active"), false);
assert.equal(isValidLifecycleTransition("Filed/Awaiting Decision", "Filed/Awaiting Decision"), false);

// --- stageTaskTemplates ---------------------------------------------------

// Immigration Intake has a real checklist; Closed for a non-immigration/PI
// case type falls through to the generic (mostly empty) template set.
const immigrationIntake = stageTaskTemplates("General Asylum", "Intake");
assert.ok(immigrationIntake.length >= 2, "immigration Intake should have a real checklist");
assert.ok(immigrationIntake.every((t) => typeof t.id === "string" && t.id.length > 0));

const piActive = stageTaskTemplates("Personal Injury - Auto", "Active");
assert.ok(piActive.length >= 2, "PI Active should have a real checklist");

const genericActive = stageTaskTemplates("Business Law", "Active");
assert.equal(genericActive.length, 0, "generic practice areas have no Active-stage checklist yet");

// Every stage-template id must be unique within its (area, stage) bucket —
// the createdFrom idempotency tag is `stage:<stage>:<template.id>`, so a
// duplicate id would silently collide and only ever create one task.
for (const stage of MATTER_LIFECYCLE_STAGES) {
  for (const caseType of ["General Asylum", "Personal Injury - Auto"]) {
    const templates = stageTaskTemplates(caseType, stage);
    const ids = templates.map((t) => t.id);
    assert.equal(new Set(ids).size, ids.length, `duplicate template id in ${caseType}/${stage}`);
  }
}

// --- dashboard-aggregates: matterLifecycleBreakdown -----------------------

const breakdown = matterLifecycleBreakdown([
  { matterId: "AOD-1", lifecycleStage: "Intake" },
  { matterId: "AOD-2", lifecycleStage: "Intake" },
  { matterId: "AOD-3", lifecycleStage: "Active" },
  { matterId: "AOD-4" }, // undefined -> normalizes to Intake
]);
assert.equal(breakdown.length, MATTER_LIFECYCLE_STAGES.length, "must return all 5 canonical stages");
assert.equal(breakdown.find((b) => b.stage === "Intake").count, 3);
assert.equal(breakdown.find((b) => b.stage === "Active").count, 1);
assert.equal(breakdown.find((b) => b.stage === "Closed").count, 0);

// --- dashboard-aggregates: filingDeadlinesMissingDate ----------------------

const missing = filingDeadlinesMissingDate([
  { id: "t1", matterId: "AOD-1", description: "a", dueDate: null, status: "To Do", priority: "High", isFilingDeadline: true },
  { id: "t2", matterId: "AOD-1", description: "b", dueDate: "2026-08-01", status: "To Do", priority: "High", isFilingDeadline: true },
  { id: "t3", matterId: "AOD-1", description: "c", dueDate: null, status: "To Do", priority: "Medium", isFilingDeadline: false },
  { id: "t4", matterId: "AOD-1", description: "d", dueDate: null, status: "Done", priority: "High", isFilingDeadline: true },
]);
assert.equal(missing, 1, "only the incomplete filing-deadline task with no date should count");

console.log("verify-matter-lifecycle-stage: OK");
