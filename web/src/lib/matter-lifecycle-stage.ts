/**
 * Matter lifecycle stage — Clio-Manage-style automated workflow (Google
 * Sheets only for now; see docs/runbooks/google-sheets-setup.md).
 *
 * Distinct from `matter-stage.ts`'s `deriveMatterStage()`, which tracks a
 * single deliverable/assignment's drafting progress. This tracks the
 * matter itself and drives automatic task-list creation on transition.
 */

export const MATTER_LIFECYCLE_STAGES = [
  "Intake",
  "Active",
  "Filed/Awaiting Decision",
  "Resolution",
  "Closed",
] as const;

export type MatterLifecycleStage = (typeof MATTER_LIFECYCLE_STAGES)[number];

export const DEFAULT_LIFECYCLE_STAGE: MatterLifecycleStage = "Intake";

export function isMatterLifecycleStage(value: string): value is MatterLifecycleStage {
  return (MATTER_LIFECYCLE_STAGES as readonly string[]).includes(value);
}

export function normalizeLifecycleStage(value: string | null | undefined): MatterLifecycleStage {
  if (value && isMatterLifecycleStage(value)) return value;
  return DEFAULT_LIFECYCLE_STAGE;
}

/** Forward progression, plus one step back (re-open a matter that moved too far) and reopen-from-Closed. */
export const LIFECYCLE_TRANSITIONS: Record<MatterLifecycleStage, MatterLifecycleStage[]> = {
  Intake: ["Active"],
  Active: ["Filed/Awaiting Decision", "Intake"],
  "Filed/Awaiting Decision": ["Resolution", "Active"],
  Resolution: ["Closed", "Active"],
  Closed: ["Active"],
};

export function isValidLifecycleTransition(
  from: MatterLifecycleStage,
  to: MatterLifecycleStage,
): boolean {
  return LIFECYCLE_TRANSITIONS[from]?.includes(to) ?? false;
}
