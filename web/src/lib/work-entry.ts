/**
 * Work capture on notes — every note can also be a billable work entry.
 *
 * Attorneys bill in tenth-of-an-hour (6 minute) increments, so the UI offers
 * quick chips rather than a duration form: the whole point is that logging
 * work costs no more effort than writing the note you were already writing.
 */

import type { Note } from "./types";

export const WORK_ACTIVITIES = [
  "Call",
  "Email",
  "Meeting",
  "Research",
  "Drafting",
  "Review",
  "Court",
  "Filing",
] as const;

export type WorkActivity = (typeof WORK_ACTIVITIES)[number];

/** Tenth-of-an-hour increments — the units legal invoices are actually written in. */
export const QUICK_MINUTES = [6, 12, 18, 30, 60] as const;

/**
 * Typical duration per activity, so picking "Call" also fills in the time.
 * One tap logs a complete entry; the attorney only intervenes when the
 * default is wrong, which is the difference between logging time and not.
 */
export const DEFAULT_MINUTES: Record<WorkActivity, number> = {
  Call: 12,
  Email: 6,
  Meeting: 30,
  Research: 30,
  Drafting: 60,
  Review: 18,
  Court: 60,
  Filing: 12,
};

export type NoteWorkEntry = {
  activity: WorkActivity;
  minutes: number;
  /** Attorney can log time as non-billable (internal admin, courtesy, write-off). */
  billable: boolean;
};

export function isWorkActivity(value: string): value is WorkActivity {
  return (WORK_ACTIVITIES as readonly string[]).includes(value);
}

/**
 * Round to the billing increment. Anything logged rounds UP to at least 0.1hr —
 * a two-minute call is still a billable event, and rounding it to zero is
 * exactly the unbilled-time leak this feature exists to close.
 */
export function roundToBillingIncrement(minutes: number): number {
  if (!Number.isFinite(minutes) || minutes <= 0) return 0;
  return Math.max(6, Math.ceil(minutes / 6) * 6);
}

/** Parse untrusted request/sheet input into a work entry, or null if absent/invalid. */
export function parseWorkEntry(input: unknown): NoteWorkEntry | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;

  const activity = typeof raw.activity === "string" ? raw.activity.trim() : "";
  if (!isWorkActivity(activity)) return null;

  const minutes = roundToBillingIncrement(Number(raw.minutes));
  if (minutes <= 0) return null;

  return {
    activity,
    minutes,
    // Billable unless explicitly marked otherwise.
    billable: raw.billable !== false,
  };
}

/** "1.5" — hours to one decimal, the form that goes on an invoice line. */
export function toBillableHours(minutes: number): string {
  return (Math.round((minutes / 60) * 10) / 10).toFixed(1);
}

/** "0.3 hr · 18 min" */
export function formatWorkDuration(minutes: number): string {
  return `${toBillableHours(minutes)} hr · ${minutes} min`;
}

export type WorkRollup = {
  billableMinutes: number;
  nonBillableMinutes: number;
  totalMinutes: number;
  entryCount: number;
  byActivity: { activity: WorkActivity; minutes: number }[];
};

export function rollUpWork(notes: Note[]): WorkRollup {
  let billableMinutes = 0;
  let nonBillableMinutes = 0;
  let entryCount = 0;
  const activityTotals = new Map<WorkActivity, number>();

  for (const note of notes) {
    const minutes = note.minutes ?? 0;
    if (minutes <= 0) continue;
    entryCount += 1;
    if (note.billable === false) {
      nonBillableMinutes += minutes;
    } else {
      billableMinutes += minutes;
    }
    if (note.activity && isWorkActivity(note.activity)) {
      activityTotals.set(note.activity, (activityTotals.get(note.activity) ?? 0) + minutes);
    }
  }

  return {
    billableMinutes,
    nonBillableMinutes,
    totalMinutes: billableMinutes + nonBillableMinutes,
    entryCount,
    byActivity: [...activityTotals.entries()]
      .map(([activity, minutes]) => ({ activity, minutes }))
      .sort((a, b) => b.minutes - a.minutes),
  };
}

/** Work logged since a cutoff — drives the dashboard's "this month" figure. */
export function rollUpWorkSince(notes: Note[], since: Date): WorkRollup {
  const cutoff = since.getTime();
  return rollUpWork(
    notes.filter((n) => {
      const at = Date.parse(n.createdAt);
      return Number.isFinite(at) && at >= cutoff;
    }),
  );
}

/**
 * Machine-written notes — agent output, system logs, structured payloads the
 * app stores as notes. None of these are attorney work, so none should ever
 * be counted as unbilled time. Matched loosely because note types are free
 * text and vary ("System", "System Log", "Agent", "Agent Output").
 */
function isMachineNote(note: Note): boolean {
  const haystack = `${note.type} ${note.author}`.toLowerCase();
  return (
    haystack.includes("system") ||
    haystack.includes("agent") ||
    haystack.includes("ocr") ||
    haystack.includes("facts")
  );
}

/**
 * Notes that recorded real work but carry no time — the unbilled-time leak,
 * surfaced so it can be fixed while the work is still fresh in memory.
 */
export function notesMissingTime(notes: Note[]): Note[] {
  return notes.filter((n) => (n.minutes ?? 0) <= 0 && !isMachineNote(n));
}
