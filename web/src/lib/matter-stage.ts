/**
 * Matter workflow stage — derived from PM Inbox assignment status + payment.
 * Ported from legal-os MATTER_STAGES, mapped to production AOD assignment lifecycle.
 */

import { isAssignmentDelivered } from "@/lib/assignment-transitions";
import type { InboxItem } from "@/lib/types";

export type MatterWorkflowStage =
  | "Intake"
  | "Conflict check"
  | "Quoted"
  | "In progress"
  | "Ready for review"
  | "Approved"
  | "Delivered";

export const MATTER_STAGE_ORDER: MatterWorkflowStage[] = [
  "Intake",
  "Conflict check",
  "Quoted",
  "In progress",
  "Ready for review",
  "Approved",
  "Delivered",
];

export const MATTER_STAGE_LABELS: Record<MatterWorkflowStage, string> = {
  Intake: "Intake",
  "Conflict check": "Conflict check",
  Quoted: "Quoted",
  "In progress": "In progress",
  "Ready for review": "Ready for review",
  Approved: "Approved",
  Delivered: "Delivered",
};

export type MatterStageInput = {
  assignments: InboxItem[];
  /** When no assignment exists yet but intake noted manual conflict review. */
  conflictReviewRequired?: boolean;
};

function latestAssignment(assignments: InboxItem[]): InboxItem | undefined {
  return [...assignments]
    .filter((a) => a.kind === "assignment")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

/** Derive human-readable matter stage from assignment + payment state. */
export function deriveMatterStage(input: MatterStageInput): MatterWorkflowStage {
  const active = latestAssignment(input.assignments);

  if (!active) {
    return input.conflictReviewRequired ? "Conflict check" : "Intake";
  }

  if (active.conflictReviewRequired) {
    if (active.status === "Submitted" || active.paymentStatus === "pending") {
      return "Conflict check";
    }
  }

  if (active.paymentStatus === "pending") {
    return "Quoted";
  }

  switch (active.status) {
    case "Submitted":
      return input.conflictReviewRequired ? "Conflict check" : "Intake";
    case "In progress":
    case "Returned":
      return "In progress";
    case "Ready for review":
      return "Ready for review";
    case "Approved":
      return isAssignmentDelivered(active) ? "Delivered" : "Approved";
    default:
      return "Intake";
  }
}

export function matterStageTone(stage: MatterWorkflowStage): string {
  switch (stage) {
    case "Intake":
      return "bg-slate-100 text-slate-800 ring-slate-300";
    case "Conflict check":
      return "bg-rose-50 text-rose-900 ring-rose-300";
    case "Quoted":
      return "bg-sky-50 text-sky-900 ring-sky-300";
    case "In progress":
      return "bg-amber-50 text-amber-900 ring-amber-300";
    case "Ready for review":
      return "bg-violet-50 text-violet-900 ring-violet-300";
    case "Approved":
      return "bg-emerald-50 text-emerald-900 ring-emerald-300";
    case "Delivered":
      return "bg-emerald-100 text-emerald-950 ring-emerald-400";
    default:
      return "bg-slate-100 text-slate-800 ring-slate-300";
  }
}
