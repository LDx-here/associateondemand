/** Verify matter stage derivation and conflict check helpers. */
import assert from "node:assert/strict";

import { checkConflictAgainstMatters } from "../src/lib/conflict-check.ts";
import { deriveMatterStage } from "../src/lib/matter-stage.ts";

/** @param {Partial<import("../src/lib/types.ts").InboxItem> & { status: string }} partial */
function assignment(partial) {
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

assert.equal(deriveMatterStage({ assignments: [] }), "Intake");

assert.equal(
  deriveMatterStage({
    assignments: [assignment({ status: "Submitted", paymentStatus: "pending" })],
  }),
  "Quoted",
);

assert.equal(
  deriveMatterStage({
    assignments: [
      assignment({ status: "Submitted", conflictReviewRequired: true, paymentStatus: "invoice" }),
    ],
  }),
  "Conflict check",
);

assert.equal(
  deriveMatterStage({ assignments: [assignment({ status: "In progress" })] }),
  "In progress",
);

assert.equal(
  deriveMatterStage({ assignments: [assignment({ status: "Ready for review" })] }),
  "Ready for review",
);

const conflict = checkConflictAgainstMatters("Acme Corp", [
  { matterId: "AOD-2001", title: "Smith v. Acme Corp", summary: "" },
]);
assert.equal(conflict.result, "review_required");
assert.ok(conflict.matches.length >= 1);

const clear = checkConflictAgainstMatters("Unknown Party XYZ", [
  { matterId: "AOD-2001", title: "Unrelated matter", summary: "" },
]);
assert.equal(clear.result, "clear");

console.log("verify-matter-stage: OK");
