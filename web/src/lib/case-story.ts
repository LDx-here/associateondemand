/**
 * Case story — the matter rendered as prose, not a form.
 *
 * The attorney's framing: she wants the client page to read "like I am looking
 * at my notes about someone," so that picking a case back up does not mean
 * reconstructing it from six tabs of fields. Her words: "release as much
 * friction from reconstructing a case again."
 *
 * So this composes sentences, not key-value pairs. Each sentence is assembled
 * only from data that actually exists — a matter with no deadline says nothing
 * about deadlines rather than printing "Next deadline: —", because a page of
 * em-dashes is what made the old view unreadable.
 *
 * Pure functions over data already loaded for the page. No AI: this must work
 * while the API key is dead, and it is describing facts rather than
 * interpreting them.
 */

import type { Contact, Matter, Note, Task } from "./types";
import { lastAttorneyActivityAt } from "./practice-pulse";
import { rollUpWork, toBillableHours } from "./work-entry";

function daysAgo(iso: string, now: Date): number {
  return Math.floor((now.getTime() - Date.parse(iso)) / 86_400_000);
}

/** "today", "yesterday", "5 days ago", "3 months ago" — how a person says it. */
export function humanAge(iso: string, now: Date): string {
  const days = daysAgo(iso, now);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months === 1) return "about a month ago";
  if (months < 12) return `${months} months ago`;
  const years = Math.floor(days / 365);
  return years === 1 ? "about a year ago" : `${years} years ago`;
}

function formatDate(iso: string): string {
  // A date-only string ("2026-08-14") parses as UTC midnight, which then
  // renders as the *previous* day in any timezone behind UTC. On a filing
  // deadline that off-by-one is dangerous, so date-only values are built as
  // local dates and only true timestamps go through Date parsing.
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  const d = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export type StorySentence = {
  text: string;
  /** Drives emphasis: something needing action reads differently from context. */
  tone: "neutral" | "attention";
};

export type CaseStory = {
  /** One-line identity: who this is and what kind of case. */
  headline: string;
  /** The narrative body, in reading order. */
  sentences: StorySentence[];
};

function describePosture(matter: Matter): string | null {
  const posture = (matter.posture ?? "").trim();
  if (!posture) return null;
  const phrasing: Record<string, string> = {
    Intake: "still in intake",
    "Representation Filed": "at the representation stage",
    Filed: "filed",
    "Responsive Pleading Filed": "past the responsive pleading",
    "Awaiting Scheduling": "awaiting scheduling",
    "Hearing Scheduled": "set for hearing",
    "Awaiting Decision": "awaiting a decision",
  };
  return phrasing[posture] ?? posture.toLowerCase();
}

/**
 * Compose the story.
 *
 * Ordering is deliberate — it answers, in order, the questions an attorney
 * asks when reopening a file she has not touched in weeks: where does this
 * stand, when did I last work it, what is coming, what have I put into it.
 */
export function buildCaseStory(
  matter: Matter,
  notes: Note[],
  tasks: Task[],
  contacts: Contact[] = [],
  now = new Date(),
): CaseStory {
  const name = matter.title || matter.clientName || matter.matterId;
  const matterNotes = notes.filter((n) => n.matterId === matter.matterId);
  const matterTasks = tasks.filter((t) => t.matterId === matter.matterId);
  const sentences: StorySentence[] = [];

  // Where it stands.
  const posture = describePosture(matter);
  const standing: string[] = [];
  if (posture) standing.push(`This matter is ${posture}`);
  if (matter.court?.trim()) standing.push(`before ${matter.court.trim()}`);
  if (matter.judge?.trim()) standing.push(`with ${matter.judge.trim()} presiding`);
  if (standing.length > 0) sentences.push({ text: `${standing.join(", ")}.`, tone: "neutral" });

  // When it was last actually worked — the question that decides whether she
  // needs to catch up before doing anything else.
  const lastTouch = lastAttorneyActivityAt(matter.matterId, notes);
  if (lastTouch) {
    const age = daysAgo(lastTouch, now);
    sentences.push({
      text: `You last worked it ${humanAge(lastTouch, now)}.`,
      tone: age >= 30 ? "attention" : "neutral",
    });
  } else {
    sentences.push({
      text: "You have not logged any work on it yet.",
      tone: "attention",
    });
  }

  // What is coming.
  const openDated = matterTasks
    .filter((t) => t.status !== "Done" && t.dueDate)
    .sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)));
  const nextDue = matter.nextDeadline ?? openDated[0]?.dueDate ?? null;

  if (nextDue) {
    const days = Math.ceil((Date.parse(nextDue) - now.getTime()) / 86_400_000);
    if (days < 0) {
      sentences.push({
        text: `A deadline passed on ${formatDate(nextDue)}.`,
        tone: "attention",
      });
    } else {
      sentences.push({
        text: `Next deadline is ${formatDate(nextDue)}, ${days === 0 ? "today" : `in ${days} day${days === 1 ? "" : "s"}`}.`,
        tone: days <= 14 ? "attention" : "neutral",
      });
    }
  } else {
    sentences.push({ text: "Nothing is scheduled on it.", tone: "attention" });
  }

  const openTasks = matterTasks.filter((t) => t.status !== "Done");
  if (openTasks.length > 0) {
    const undated = openTasks.filter((t) => !t.dueDate).length;
    sentences.push({
      text:
        `${openTasks.length} open task${openTasks.length === 1 ? "" : "s"}` +
        (undated > 0 ? `, ${undated} without a date.` : "."),
      tone: undated > 0 ? "attention" : "neutral",
    });
  }

  // What has gone into it.
  const work = rollUpWork(matterNotes);
  if (work.billableMinutes > 0) {
    sentences.push({
      text: `You have logged ${toBillableHours(work.billableMinutes)} billable hours across ${work.entryCount} entr${work.entryCount === 1 ? "y" : "ies"}.`,
      tone: "neutral",
    });
  }

  // Who else is on it — only when there is someone besides the client.
  const others = contacts.filter((c) => (c.role ?? "").toLowerCase() !== "client");
  if (others.length > 0) {
    const names = others.map(
      (c) => `${c.displayName}${c.role ? ` (${c.role.toLowerCase()})` : ""}`,
    );
    sentences.push({
      text: `Also on this matter: ${names.join(", ")}.`,
      tone: "neutral",
    });
  }

  const headlineBits = [matter.caseType].filter((v): v is string => Boolean(v?.trim()));
  if (matter.country?.trim()) headlineBits.push(matter.country.trim());

  return {
    headline: headlineBits.length > 0 ? `${name} — ${headlineBits.join(" · ")}` : name,
    sentences,
  };
}

export type StoryEvent = {
  at: string;
  label: string;
  kind: "note" | "document" | "task";
};

/**
 * The case's recent history in one chronological list, newest first.
 *
 * Merges notes, documents, and completed tasks so "what happened here" is one
 * read rather than three tabs. Machine-written notes are included — they are
 * real events — but rendered plainly so they do not masquerade as her work.
 */
export function buildStoryTimeline(
  matter: Matter,
  notes: Note[],
  tasks: Task[],
  documents: { title: string; uploadedAt?: string | null }[] = [],
  limit = 8,
): StoryEvent[] {
  const events: StoryEvent[] = [];

  for (const note of notes) {
    if (note.matterId !== matter.matterId) continue;
    const firstLine = note.content.split("\n")[0]?.trim() ?? "";
    events.push({
      at: note.createdAt,
      kind: "note",
      label: firstLine.length > 96 ? `${firstLine.slice(0, 96)}…` : firstLine || "(empty note)",
    });
  }

  for (const task of tasks) {
    if (task.matterId !== matter.matterId || task.status !== "Done") continue;
    // Completed tasks have no completion timestamp on the model, so the due
    // date is the only anchor available; skip undated ones rather than
    // inventing a position in the timeline.
    if (!task.dueDate) continue;
    events.push({ at: task.dueDate, kind: "task", label: `Completed: ${task.description}` });
  }

  for (const doc of documents) {
    if (!doc.uploadedAt) continue;
    events.push({ at: doc.uploadedAt, kind: "document", label: doc.title });
  }

  return events
    .filter((e) => Number.isFinite(Date.parse(e.at)))
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    .slice(0, limit);
}
