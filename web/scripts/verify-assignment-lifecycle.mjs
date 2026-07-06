/**
 * Scripted assignment-intake -> inbox lifecycle test (no live Airtable
 * needed). Closes the "no scripted web assignment->inbox lane test" gap
 * noted in CHECKPOINT.md by exercising the shared state machine in
 * `lib/assignment-lifecycle.ts` the same way both the demo store and the
 * Airtable-backed store do.
 *
 * Run: npx tsx scripts/verify-assignment-lifecycle.mjs
 */
import {
  ASSIGNMENT_TRANSITIONS,
  isValidAssignmentTransition,
  nextAssignmentStatuses,
} from "../src/lib/assignment-lifecycle.ts";
import { DELIVERABLE_CATALOG } from "../src/lib/deliverable-catalog.ts";

let failed = 0;

function expect(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    failed++;
  }
}

/* -------------------------------------------------------------------- */
/* 1. Happy-path lane order: Submitted -> In progress -> Ready for       */
/*    review -> Approved (mirrors AssignmentBoard's five Kanban lanes)  */
/* -------------------------------------------------------------------- */
const happyPath = ["Submitted", "In progress", "Ready for review", "Approved"];
for (let i = 0; i < happyPath.length - 1; i++) {
  const [from, to] = [happyPath[i], happyPath[i + 1]];
  expect(isValidAssignmentTransition(from, to), `expected "${from}" -> "${to}" to be legal`);
}

/* -------------------------------------------------------------------- */
/* 2. Return + resume-work loop: Ready for review -> Returned -> In     */
/*    progress (attorney sends back revision note, associate resumes)   */
/* -------------------------------------------------------------------- */
expect(
  isValidAssignmentTransition("Ready for review", "Returned"),
  '"Ready for review" -> "Returned" should be legal',
);
expect(isValidAssignmentTransition("Returned", "In progress"), '"Returned" -> "In progress" (resume work) should be legal');

/* -------------------------------------------------------------------- */
/* 3. Illegal transitions the API route + demo store must reject (409)  */
/* -------------------------------------------------------------------- */
const illegal = [
  ["Submitted", "Ready for review"], // can't skip In progress
  ["Submitted", "Approved"], // can't skip the whole board
  ["In progress", "Approved"], // must pass through Ready for review
  ["In progress", "Returned"], // Returned only follows a review
  ["Approved", "In progress"], // Approved is terminal
  ["Approved", "Returned"], // Approved is terminal
  ["Returned", "Ready for review"], // must re-enter In progress first
];
for (const [from, to] of illegal) {
  expect(!isValidAssignmentTransition(from, to), `expected "${from}" -> "${to}" to be rejected`);
}

/* -------------------------------------------------------------------- */
/* 4. Approved is a true terminal state (no outgoing transitions)       */
/* -------------------------------------------------------------------- */
expect(nextAssignmentStatuses("Approved").length === 0, '"Approved" should have no outgoing transitions');

/* -------------------------------------------------------------------- */
/* 5. Every status referenced in the table is a key in the table (no    */
/*    dangling target that has no row of its own)                       */
/* -------------------------------------------------------------------- */
const knownStatuses = new Set(Object.keys(ASSIGNMENT_TRANSITIONS));
for (const [from, targets] of Object.entries(ASSIGNMENT_TRANSITIONS)) {
  for (const to of targets) {
    expect(knownStatuses.has(to), `transition target "${to}" from "${from}" has no row in ASSIGNMENT_TRANSITIONS`);
  }
}

/* -------------------------------------------------------------------- */
/* 6. Template-catalog cross-check: every catalog entry's tier is one   */
/*    the intake form's tier selector actually understands              */
/* -------------------------------------------------------------------- */
const validTiers = new Set(["Template", "Custom", "Research"]);
for (const entry of DELIVERABLE_CATALOG) {
  expect(validTiers.has(entry.tier), `catalog entry "${entry.id}" has unknown tier "${entry.tier}"`);
}

if (failed > 0) {
  console.error(`\n${failed} assignment-lifecycle check(s) failed`);
  process.exit(1);
}

console.log(
  `OK: ${happyPath.length - 1} happy-path transitions, ${illegal.length} illegal transitions rejected, ${DELIVERABLE_CATALOG.length} catalog entries cross-checked`,
);
