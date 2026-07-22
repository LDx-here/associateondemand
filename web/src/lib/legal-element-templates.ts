/**
 * Standard legal elements by practice area — feeds Legal Elements tab seeding
 * and mapping to extracted assessment facts.
 */

import { fieldsForDeliverable, resolvePracticeArea } from "./practice-area-facts";
import type { ExtractedFactRecord } from "./assessment-documents";
import { factDisplayValue } from "./assessment-documents";

export type LegalElementTemplate = {
  id: string;
  name: string;
  description?: string;
  /** practice-area-facts field id when linked to extracted facts */
  fieldId?: string;
  feedsSection?: string;
  /** Firm Memory / immigration reference slug */
  referenceSlug?: string;
};

const IMMIGRATION_CORE: LegalElementTemplate[] = [
  {
    id: "statutory-eligibility",
    name: "Statutory eligibility",
    description: "Relief type and INA/CFR basis for the requested outcome (§ 245(a)/(i), etc.).",
    referenceSlug: "immigration-statutory-eligibility",
  },
  {
    id: "admissibility",
    name: "Admissibility / inadmissibility grounds",
    description: "INA §212(a) / §237(a) triggers and waiver strategy.",
    referenceSlug: "immigration-admissibility",
  },
  {
    id: "unlawful-presence",
    name: "Unlawful presence bars (§ 212(a)(9)(B)/(C))",
    description: "3/10-year bars, permanent bar, and provisional waiver posture.",
    referenceSlug: "immigration-unlawful-presence",
  },
  {
    id: "extreme-hardship",
    name: "Extreme hardship to qualifying relative",
    fieldId: "extremeHardshipFactors",
    feedsSection: "Extreme hardship analysis",
    referenceSlug: "immigration-extreme-hardship",
  },
  {
    id: "waiver-strategy",
    name: "Waiver strategy (I-601 / I-601A / I-212)",
    description: "Match ground → waiver form → qualifying relative → discretion.",
    referenceSlug: "immigration-waiver-strategy",
  },
  {
    id: "discretionary-factors",
    name: "Positive and negative discretionary factors",
    fieldId: "adverseFactors",
    feedsSection: "Discretionary Factors / equities analysis",
    referenceSlug: "immigration-discretion",
  },
  {
    id: "procedural-posture",
    name: "Procedural posture and filing history",
    feedsSection: "Procedural posture",
    referenceSlug: "immigration-procedure",
  },
  {
    id: "criminal-grounds",
    name: "Criminal grounds (CIMT / controlled substances / AF)",
    description: "Categorical analysis and relief impact.",
    referenceSlug: "immigration-criminal-grounds",
  },
];

const ASYLUM_ELEMENTS: LegalElementTemplate[] = [
  { id: "persecution", name: "Past persecution or well-founded fear", referenceSlug: "asylum-persecution" },
  { id: "nexus", name: "Nexus to a protected ground", referenceSlug: "asylum-nexus" },
  { id: "psg", name: "Particular social group (if applicable)", referenceSlug: "asylum-psg" },
  { id: "firm-resettlement", name: "Internal relocation / firm resettlement", referenceSlug: "asylum-relocation" },
  { id: "bars", name: "Bars to asylum / withholding", referenceSlug: "asylum-bars" },
  { id: "withholding-cat", name: "Withholding of removal / CAT", referenceSlug: "asylum-withholding-cat" },
];

const PI_CORE: LegalElementTemplate[] = [
  { id: "duty", name: "Duty of care", referenceSlug: "pi-duty" },
  { id: "breach", name: "Breach of duty", fieldId: "liabilityTheory", feedsSection: "Liability section" },
  { id: "causation", name: "Causation", referenceSlug: "pi-causation" },
  { id: "damages", name: "Damages", fieldId: "damagesSketch", feedsSection: "Damages overview" },
];

function caseTypeLower(caseType: string): string {
  return caseType.toLowerCase();
}

export function legalElementTemplatesForMatter(caseType: string, deliverableId?: string): LegalElementTemplate[] {
  const area = resolvePracticeArea(caseType);
  const lower = caseTypeLower(caseType);

  if (area === "immigration") {
    const fromFacts = fieldsForDeliverable(deliverableId, area)
      .filter((d) => d.feedsSection || d.required)
      .map((d) => ({
        id: d.id,
        name: d.label,
        fieldId: d.id,
        feedsSection: d.feedsSection,
        referenceSlug: `immigration-${d.id}`,
      }));

    const core = [...IMMIGRATION_CORE];
    if (lower.includes("asylum") || lower.includes("withholding")) {
      core.push(...ASYLUM_ELEMENTS);
    }

    const seen = new Set<string>();
    return [...core, ...fromFacts].filter((t) => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });
  }

  if (area === "personal_injury") {
    return PI_CORE;
  }

  return fieldsForDeliverable(deliverableId, area)
    .filter((d) => d.required || d.feedsSection)
    .map((d) => ({
      id: d.id,
      name: d.label,
      fieldId: d.id,
      feedsSection: d.feedsSection,
    }));
}

export function linkFactsToElement(
  template: LegalElementTemplate,
  facts: ExtractedFactRecord[],
): ExtractedFactRecord[] {
  if (!template.fieldId) {
    return facts.filter(
      (f) =>
        f.legalElement?.toLowerCase() === template.name.toLowerCase() ||
        f.legalElementId === template.id,
    );
  }
  return facts.filter(
    (f) =>
      f.fieldId === template.fieldId ||
      f.fact_type === template.fieldId ||
      f.legalElementId === template.id ||
      f.legalElement?.toLowerCase() === template.name.toLowerCase(),
  );
}

export function formatLinkedFacts(facts: ExtractedFactRecord[]): string {
  return facts.map((f) => factDisplayValue(f)).filter(Boolean).join("; ");
}

/**
 * Prefer Firm Knowledge map for legal-element reference.
 * Legacy immigration-* slugs map onto knowledge-map topic stems when possible.
 */
export function firmMemoryReferenceHref(slug?: string): string | null {
  if (!slug) return null;
  const topicId = slug
    .replace(/^immigration-/, "")
    .replace(/^asylum-/, "asylum-")
    .replace(/^pi-/, "");
  // Known knowledge-map stems (see brain/.../immigration/00-index.md).
  const KNOWN = new Set([
    "aos-discretionary-checklist",
    "aos-statutory-eligibility",
    "aos-filing-packet",
    "affidavit-of-support",
    "extreme-hardship-factors",
    "ina-212a-waiver",
    "inadmissibility-overview",
    "unlawful-presence-bars",
    "misrepresentation-212i",
    "false-claim-usc",
    "criminal-grounds-overview",
    "aggravated-felony-overview",
    "asylum-elements",
    "asylum-bars",
    "withholding-cat",
    "family-based-immigration",
    "marriage-based-aos",
    "vawa-u-t-overview",
    "procedural-posture-removal",
    "cancellation-of-removal",
  ]);
  const mapped: Record<string, string> = {
    "extreme-hardship": "extreme-hardship-factors",
    "statutory-eligibility": "aos-statutory-eligibility",
    admissibility: "inadmissibility-overview",
    "unlawful-presence": "unlawful-presence-bars",
    "waiver-strategy": "ina-212a-waiver",
    discretion: "aos-discretionary-checklist",
    procedure: "procedural-posture-removal",
    "criminal-grounds": "criminal-grounds-overview",
    persecution: "asylum-elements",
    nexus: "asylum-elements",
    psg: "asylum-elements",
    relocation: "asylum-bars",
    bars: "asylum-bars",
    "withholding-cat": "withholding-cat",
  };
  const stem = mapped[topicId] ?? (KNOWN.has(topicId) ? topicId : mapped[slug] ?? null);
  if (stem) {
    return `/knowledge-map?topics=${encodeURIComponent(stem)}#firm-knowledge&topic=${encodeURIComponent(stem)}`;
  }
  return `/firm-memory?ref=${encodeURIComponent(slug)}`;
}
