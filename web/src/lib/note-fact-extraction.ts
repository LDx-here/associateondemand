/**
 * Note → case facts + readable case narrative (Journal pass 1 arc, tasks #23–24).
 *
 * One note can feed structured drafting facts without a separate data entry step.
 * Heuristic extraction reuses the Strong Reader / intake prefill pipeline — no LLM required.
 */

import {
  extractHeuristicFactsFromText,
  mergeOcrIntoDraftingFacts,
  type OcrFact,
} from "./intake-prefill";
import {
  emptyDraftingFacts,
  fieldsForDeliverable,
  resolvePracticeArea,
  type DraftingFactsPayload,
} from "./practice-area-facts";
import type { Note } from "./types";

export type CaseNarrativeEntry = {
  id: string;
  timestamp: string;
  author: string;
  activity?: string;
  minutes?: number;
  billable?: boolean;
  /** Human-readable paragraph for the case story view. */
  paragraph: string;
};

const MACHINE_NOTE_PATTERN = /system|agent|ocr|facts/i;

/** Attorney-authored notes suitable for a readable case story (not JSON payloads or agent output). */
export function isNarrativeNote(note: Note): boolean {
  if (note.type === "Facts" || note.type === "Procedural") return false;
  const haystack = `${note.type} ${note.author}`.trim();
  if (MACHINE_NOTE_PATTERN.test(haystack)) return false;
  if (!note.content?.trim()) return false;
  // Structured Facts JSON stored as note body — not narrative.
  if (note.type === "Facts") return false;
  const trimmed = note.content.trim();
  if (trimmed.startsWith("{") && trimmed.includes('"v":1')) return false;
  return true;
}

function formatNarrativeTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/** Chronological human-readable story from attorney work notes. */
export function buildCaseNarrative(notes: Note[], matterTitle?: string): CaseNarrativeEntry[] {
  return notes
    .filter(isNarrativeNote)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((note) => {
      const when = formatNarrativeTimestamp(note.createdAt);
      const workTag =
        note.activity && note.minutes
          ? ` (${note.activity.toLowerCase()}, ${(note.minutes / 60).toFixed(1)} hr${note.billable === false ? ", no charge" : ""})`
          : "";
      const lead = matterTitle
        ? `${when} — ${note.author}${workTag}: ${note.content.trim()}`
        : `${when} — ${note.author}${workTag}: ${note.content.trim()}`;
      return {
        id: note.id,
        timestamp: note.createdAt,
        author: note.author,
        activity: note.activity,
        minutes: note.minutes,
        billable: note.billable,
        paragraph: lead,
      };
    });
}

export function extractFactsFromNoteContent(content: string): OcrFact[] {
  return extractHeuristicFactsFromText(content);
}

function defaultDeliverableForCaseType(caseType: string): string {
  const area = resolvePracticeArea(caseType);
  if (area === "personal_injury") return "demand-letter";
  if (area === "immigration_asylum") return "custom-other-free-text";
  if (area === "immigration_family") return "custom-other-free-text";
  return "aos-discretionary-brief";
}

export type NoteFactSuggestion = {
  facts: OcrFact[];
  /** Field labels that would be filled on merge (empty fields only). */
  fieldLabels: string[];
  filledFieldIds: string[];
  mergedPayload: DraftingFactsPayload;
};

/**
 * Preview which drafting-facts fields a note would populate without overwriting edits.
 */
export function suggestFactMergeFromNote(
  content: string,
  matterId: string,
  existing: DraftingFactsPayload | null | undefined,
  caseType: string,
  deliverableId?: string,
): NoteFactSuggestion | null {
  const trimmed = content.trim();
  if (!trimmed) return null;

  const facts = extractFactsFromNoteContent(trimmed);
  if (facts.length === 0) return null;

  const resolvedDeliverable = deliverableId ?? existing?.deliverableId ?? defaultDeliverableForCaseType(caseType);
  const base =
    existing?.v === 1
      ? { ...existing, deliverableId: resolvedDeliverable, caseType: existing.caseType ?? caseType }
      : emptyDraftingFacts(matterId, caseType, resolvedDeliverable);

  const { payload, filledFieldIds } = mergeOcrIntoDraftingFacts(base, facts, trimmed);
  if (filledFieldIds.length === 0) return null;

  const defs = fieldsForDeliverable(payload.deliverableId, payload.practiceArea);
  const fieldLabels = filledFieldIds
    .map((id) => defs.find((d) => d.id === id)?.label ?? id)
    .filter(Boolean);

  return { facts, fieldLabels, filledFieldIds, mergedPayload: payload };
}
