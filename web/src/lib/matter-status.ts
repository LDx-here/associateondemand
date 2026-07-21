/** Matter lifecycle status — maps to Airtable Matters.status single-select. */

export const MATTER_STATUS_CLOSED = "Closed";
export const MATTER_STATUS_ARCHIVED = "Archived";
export const MATTER_STATUS_ACTIVE = "Active";

export const CLOSED_MATTER_STATUSES = [MATTER_STATUS_CLOSED, MATTER_STATUS_ARCHIVED] as const;

const ACTIVE_ALIASES = new Set([
  MATTER_STATUS_ACTIVE,
  "Open",
  "In Progress",
  "Intake",
  "Pending Filing",
  "Active",
  "Moderate",
  "Strong",
]);

/** True when matter should appear in the default (active-only) list. */
export function isActiveMatterStatus(status: string): boolean {
  const normalized = status.trim();
  if (!normalized) return true;
  if (CLOSED_MATTER_STATUSES.includes(normalized as (typeof CLOSED_MATTER_STATUSES)[number])) {
    return false;
  }
  return true;
}

export function isClosedMatterStatus(status: string): boolean {
  return !isActiveMatterStatus(status);
}

/** Status written when attorney closes a matter (prefer over hard delete). */
export function closeMatterStatus(): string {
  return MATTER_STATUS_CLOSED;
}

/** Status written when attorney reopens a closed matter. */
export function reopenMatterStatus(currentStatus: string): string {
  if (currentStatus === MATTER_STATUS_ARCHIVED) return MATTER_STATUS_ACTIVE;
  return MATTER_STATUS_ACTIVE;
}

export const STRATEGY_STATUS_OPTIONS = ["Met", "Partial", "Gap", "Needs evidence"] as const;
export type StrategyStatus = (typeof STRATEGY_STATUS_OPTIONS)[number];

export function isStrategyStatus(value: string): value is StrategyStatus {
  return (STRATEGY_STATUS_OPTIONS as readonly string[]).includes(value);
}
