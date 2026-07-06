import type { AssignmentStatus } from "./types";

/**
 * Single source of truth for the assignment intake -> inbox state machine
 * (BUILD_SPEC marketplace pass §2): Submitted -> In progress -> Ready for
 * review -> Returned / Approved, with Returned looping back to In progress
 * for a resubmission ("Resume work"). Both the live Airtable-backed store
 * (`lib/airtable/queries.ts`) and the demo-mode store
 * (`lib/demo-store-mutable.ts`) import this table so the two code paths can
 * never drift out of sync with each other.
 */
export const ASSIGNMENT_TRANSITIONS: Record<AssignmentStatus, AssignmentStatus[]> = {
  Submitted: ["In progress"],
  "In progress": ["Ready for review"],
  "Ready for review": ["Approved", "Returned"],
  Returned: ["In progress"],
  Approved: [],
};

export const TERMINAL_ASSIGNMENT_STATUSES: AssignmentStatus[] = ["Approved"];

export function isValidAssignmentTransition(from: string, to: AssignmentStatus): boolean {
  const allowed = ASSIGNMENT_TRANSITIONS[from as AssignmentStatus];
  return Array.isArray(allowed) && allowed.includes(to);
}

export function nextAssignmentStatuses(from: string): AssignmentStatus[] {
  return ASSIGNMENT_TRANSITIONS[from as AssignmentStatus] ?? [];
}
