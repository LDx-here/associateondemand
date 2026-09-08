/**
 * Which notes are things she wrote, and which are machine payloads.
 *
 * Several features persist structured JSON in the Notes tab rather than adding
 * columns — drafting facts, the procedural timeline, assessment OCR, and the
 * Five Anchors intake. That keeps the schema stable, but those rows are data,
 * not activity: rendering their first line in a human timeline shows a bare
 * type word or a slab of JSON where a sentence belongs.
 */

import { ANCHOR_NOTE_TYPE } from "./five-anchors";
import { JOURNEY_NOTE_TYPE } from "./case-journey";
import { ASSESSMENT_DOCUMENT_NOTE_TYPE } from "./assessment-documents";
import { DRAFTING_FACTS_NOTE_TYPE } from "./practice-area-facts";

export const PROCEDURAL_NOTE_TYPE = "Procedural";

/** Note types whose content is a payload, never prose. */
export const STRUCTURED_NOTE_TYPES: readonly string[] = [
  DRAFTING_FACTS_NOTE_TYPE,
  PROCEDURAL_NOTE_TYPE,
  ASSESSMENT_DOCUMENT_NOTE_TYPE,
  ANCHOR_NOTE_TYPE,
  JOURNEY_NOTE_TYPE,
];

export function isStructuredNote(note: { type?: string | null }): boolean {
  return STRUCTURED_NOTE_TYPES.includes(note.type ?? "");
}

/** Notes fit to read — the ones that belong in an activity feed or timeline. */
export function readableNotes<T extends { type?: string | null }>(notes: T[]): T[] {
  return notes.filter((n) => !isStructuredNote(n));
}
