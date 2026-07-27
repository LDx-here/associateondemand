/**
 * Matter continuity — reuse fact schema from prior matters without copying PII.
 */

import {
  emptyDraftingFacts,
  type DraftingFactsPayload,
} from "./practice-area-facts";

/** Field ids that must never copy from a prior client matter. */
const PII_FIELD_IDS = new Set([
  "applicantName",
  "aNumber",
  "petitionerName",
  "qualifyingRelative",
  "portOfEntry",
]);

export type FactTemplateSummary = {
  matterId: string;
  title: string;
  deliverableId?: string;
  updatedAt?: string;
  completenessPercent: number;
  /** Safe structural hints (e.g. paragraph variant picks). */
  paragraphSelections?: Record<string, string>;
};

/** Copy schema + deliverable type; clear PII; optionally preserve library variant picks. */
export function cloneDraftingFactsSchema(
  source: DraftingFactsPayload,
  targetMatterId: string,
  targetCaseType: string,
  options?: { keepParagraphSelections?: boolean },
): DraftingFactsPayload {
  const deliverableId = source.deliverableId ?? "aos-discretionary-brief";
  const empty = emptyDraftingFacts(targetMatterId, targetCaseType, deliverableId);
  const fields: Record<string, string | string[]> = { ...empty.fields };

  for (const key of Object.keys(source.fields)) {
    if (PII_FIELD_IDS.has(key)) continue;
    const val = source.fields[key];
    if (Array.isArray(val)) {
      if (val.length && !PII_FIELD_IDS.has(key)) fields[key] = [];
    } else if (typeof val === "string" && val.trim() && !PII_FIELD_IDS.has(key)) {
      // Keep non-PII structural hints only for architecture headings if attorney reused template
      if (key.endsWith("Heading") && val.length < 120) {
        fields[key] = "";
      }
    }
  }

  return {
    ...empty,
    deliverableId,
    practiceArea: source.practiceArea,
    paragraphSelections: options?.keepParagraphSelections
      ? { ...(source.paragraphSelections ?? {}) }
      : {},
    additionalNotes: `Template structure from prior matter (PII cleared). Deliverable: ${deliverableId}.`,
    updatedAt: new Date().toISOString(),
  };
}

export function cloneFromPriorMatter(
  source: DraftingFactsPayload,
  sourceMatterId: string,
  targetMatterId: string,
  targetCaseType: string,
  options?: { keepParagraphSelections?: boolean },
): DraftingFactsPayload {
  const cloned = cloneDraftingFactsSchema(source, targetMatterId, targetCaseType, options);
  return {
    ...cloned,
    sourceMatterId,
    additionalNotes: `Started from matter ${sourceMatterId} template (client-specific fields cleared).`,
  };
}
