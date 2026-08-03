/**
 * Practice pulse — what actually needs the attorney's attention today.
 *
 * The dashboard previously measured an overflow-counsel marketplace (partner
 * submissions, deliverables in review, assignment pipeline). This firm is a
 * solo practice, so every one of those read zero while real cases sat quiet
 * for months. These aggregates answer the questions a solo attorney actually
 * asks: whose case has gone quiet, what has no deadline on it, what is due.
 */

import type { Matter, Note, Task } from "./types";

/** Open matters only — closed ones are not "attention" candidates. */
function isOpen(matter: Matter): boolean {
  return (matter.status ?? "").toLowerCase() !== "closed";
}

/**
 * Machine-written notes (import summaries, agent output, system logs) are not
 * evidence the attorney touched the case. An imported matter whose only note
 * is the import summary has had *no* attorney activity, and saying otherwise
 * would hide exactly the cases that need picking up.
 */
function isAttorneyNote(note: Note): boolean {
  const haystack = `${note.type} ${note.author}`.toLowerCase();
  return !(
    haystack.includes("system") ||
    haystack.includes("agent") ||
    haystack.includes("import") ||
    haystack.includes("ocr") ||
    haystack.includes("facts")
  );
}

/** Most recent attorney-authored note for a matter, or null if never touched. */
export function lastAttorneyActivityAt(matterId: string, notes: Note[]): string | null {
  let latest: string | null = null;
  for (const note of notes) {
    if (note.matterId !== matterId || !isAttorneyNote(note)) continue;
    const at = Date.parse(note.createdAt);
    if (!Number.isFinite(at)) continue;
    if (latest === null || at > Date.parse(latest)) latest = note.createdAt;
  }
  return latest;
}

export type AttentionReason = "never_touched" | "quiet" | "no_deadline";

export type MatterAttention = {
  matter: Matter;
  reason: AttentionReason;
  /** Days since the last attorney note; null when there has never been one. */
  daysQuiet: number | null;
  /** Short human-readable explanation, e.g. "quiet 182 days". */
  label: string;
};

/** A matter is "quiet" once this many days pass with no attorney activity. */
export const QUIET_AFTER_DAYS = 30;

function daysBetween(fromIso: string, now: Date): number {
  return Math.floor((now.getTime() - Date.parse(fromIso)) / 86_400_000);
}

function hasOpenDeadline(matterId: string, tasks: Task[], matter: Matter): boolean {
  if (matter.nextDeadline) return true;
  return tasks.some(
    (t) => t.matterId === matterId && t.status !== "Done" && Boolean(t.dueDate),
  );
}

/**
 * Matters that need the attorney to do something, most-urgent first.
 *
 * Ordering puts never-touched matters first (a case in the system that has
 * never been worked is the sharpest signal), then longest-quiet, then matters
 * that are being worked but have nothing scheduled.
 */
export function mattersNeedingAttention(
  matters: Matter[],
  notes: Note[],
  tasks: Task[],
  now = new Date(),
): MatterAttention[] {
  const out: MatterAttention[] = [];

  for (const matter of matters) {
    if (!isOpen(matter)) continue;

    const lastActivity = lastAttorneyActivityAt(matter.matterId, notes);

    if (lastActivity === null) {
      out.push({
        matter,
        reason: "never_touched",
        daysQuiet: null,
        label: "no activity logged yet",
      });
      continue;
    }

    const daysQuiet = daysBetween(lastActivity, now);
    if (daysQuiet >= QUIET_AFTER_DAYS) {
      out.push({
        matter,
        reason: "quiet",
        daysQuiet,
        label: `quiet ${daysQuiet} days`,
      });
      continue;
    }

    if (!hasOpenDeadline(matter.matterId, tasks, matter)) {
      out.push({
        matter,
        reason: "no_deadline",
        daysQuiet,
        label: "no deadline scheduled",
      });
    }
  }

  const rank: Record<AttentionReason, number> = {
    never_touched: 0,
    quiet: 1,
    no_deadline: 2,
  };

  return out.sort((a, b) => {
    if (rank[a.reason] !== rank[b.reason]) return rank[a.reason] - rank[b.reason];
    return (b.daysQuiet ?? 0) - (a.daysQuiet ?? 0);
  });
}

export type PracticePulse = {
  openMatters: number;
  needsAttention: number;
  /** Open matters with a deadline inside the window. */
  dueSoon: number;
  /** Open matters that are moving and scheduled — nothing to do about them. */
  onTrack: number;
};

export function practicePulse(
  matters: Matter[],
  notes: Note[],
  tasks: Task[],
  now = new Date(),
  dueWindowDays = 14,
): PracticePulse {
  const open = matters.filter(isOpen);
  const attention = mattersNeedingAttention(matters, notes, tasks, now);
  const attentionIds = new Set(attention.map((a) => a.matter.matterId));

  const horizon = now.getTime() + dueWindowDays * 86_400_000;
  const dueSoonIds = new Set<string>();
  for (const matter of open) {
    const dates: string[] = [];
    if (matter.nextDeadline) dates.push(matter.nextDeadline);
    for (const t of tasks) {
      if (t.matterId === matter.matterId && t.status !== "Done" && t.dueDate) {
        dates.push(t.dueDate);
      }
    }
    if (
      dates.some((d) => {
        const at = Date.parse(d);
        return Number.isFinite(at) && at >= now.getTime() && at <= horizon;
      })
    ) {
      dueSoonIds.add(matter.matterId);
    }
  }

  return {
    openMatters: open.length,
    needsAttention: attention.length,
    dueSoon: dueSoonIds.size,
    // "On track" is the residual: open, not flagged, nothing imminent.
    onTrack: open.filter(
      (m) => !attentionIds.has(m.matterId) && !dueSoonIds.has(m.matterId),
    ).length,
  };
}
