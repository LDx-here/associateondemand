/**
 * PM Inbox assignment lifecycle — shared transition rules for AOD (not MySQL/Legal OS).
 */

import type { AssignmentStatus, InboxItem } from "@/lib/types";

export const ASSIGNMENT_TRANSITIONS: Record<AssignmentStatus, AssignmentStatus[]> = {
  Submitted: ["In progress"],
  "In progress": ["Ready for review"],
  "Ready for review": ["Approved", "Returned"],
  Returned: ["In progress"],
  Approved: [],
};

export function isValidAssignmentTransition(from: string, to: AssignmentStatus): boolean {
  const allowed = ASSIGNMENT_TRANSITIONS[from as AssignmentStatus];
  return Array.isArray(allowed) && allowed.includes(to);
}

/** True when export/download should mark the assignment Delivered. */
export function assignmentCanBeDelivered(item: InboxItem): boolean {
  return item.kind === "assignment" && item.status === "Approved" && !item.deliveredAt;
}

export function isAssignmentDelivered(item: InboxItem): boolean {
  if (item.deliveredAt) return true;
  return (item.history ?? []).some(
    (h) =>
      h.status === "Delivered" ||
      (h.note ?? "").toLowerCase().includes("exported") ||
      (h.note ?? "").toLowerCase().includes("delivered"),
  );
}

export type MarkDeliveredInput = {
  exportKind?: string;
  by?: string;
};

/** Build history patch when attorney exports an approved deliverable. */
export function buildDeliveredHistory(
  item: InboxItem,
  input?: MarkDeliveredInput,
): { deliveredAt: string; history: NonNullable<InboxItem["history"]> } {
  const now = new Date().toISOString();
  const note = input?.exportKind
    ? `Deliverable exported (${input.exportKind}).`
    : "Deliverable exported.";
  return {
    deliveredAt: now,
    history: [
      ...(item.history ?? []),
      {
        status: "Delivered",
        note,
        at: now,
        by: input?.by ?? "Attorney",
      },
    ],
  };
}
