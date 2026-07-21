/** Verify assignment transition helpers and delivered marking. */
import assert from "node:assert/strict";

import {
  ASSIGNMENT_TRANSITIONS,
  assignmentCanBeDelivered,
  buildDeliveredHistory,
  isAssignmentDelivered,
  isValidAssignmentTransition,
} from "../src/lib/assignment-transitions.ts";

assert.equal(isValidAssignmentTransition("Submitted", "In progress"), true);
assert.equal(isValidAssignmentTransition("Submitted", "Approved"), false);
assert.equal(isValidAssignmentTransition("Approved", "In progress"), false);

assert.deepEqual(Object.keys(ASSIGNMENT_TRANSITIONS).length, 5);

/** @param {Partial<import("../src/lib/types.ts").InboxItem> & { status: string }} partial */
function item(partial) {
  return {
    id: "inbox-1",
    title: "Test",
    matterId: "AOD-1001",
    agent: "PM Orchestrator",
    whatTried: "",
    whatNeeded: "",
    options: [],
    followUpSteps: [],
    resolution: "",
    createdAt: "2026-07-21T12:00:00.000Z",
    resolvedAt: null,
    kind: "assignment",
    ...partial,
  };
}

const approved = item({ status: "Approved" });
assert.equal(assignmentCanBeDelivered(approved), true);
assert.equal(isAssignmentDelivered(approved), false);

const deliveredPatch = buildDeliveredHistory(approved, { exportKind: "docx" });
assert.ok(deliveredPatch.deliveredAt);
assert.equal(deliveredPatch.history.at(-1)?.status, "Delivered");

const delivered = item({ status: "Approved", deliveredAt: deliveredPatch.deliveredAt });
assert.equal(isAssignmentDelivered(delivered), true);
assert.equal(assignmentCanBeDelivered(delivered), false);

console.log("verify-assignment-transitions: OK");
