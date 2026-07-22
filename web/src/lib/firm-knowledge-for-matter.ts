/**
 * Matter case type / practice area → Firm Knowledge (knowledge-map) topics.
 * Mirrors services/api firm_context topic selection so UI and agents align.
 */

import knowledgeMapData from "@/lib/knowledge-map/data.json";
import type { KnowledgeMapData, KnowledgeTopic } from "@/lib/knowledge-map/types";
import type { ExtractedFactRecord } from "@/lib/assessment-documents";
import { factDisplayLabel, factDisplayValue } from "@/lib/assessment-documents";
import type { LegalElementRow } from "@/lib/types";

export type FirmKnowledgeElement = {
  /** knowledge-map topic id / md stem */
  topicId: string;
  name: string;
  cite: string;
  description: string;
  neededFacts: string[];
  practiceAreas: string;
  /** Relative path for agent brain file */
  file: string;
};

export type NeededFactStatus = {
  fact: string;
  status: "present" | "needed";
  matchedFrom?: string;
};

const data = knowledgeMapData as KnowledgeMapData;

const TOPIC_BY_ID: Map<string, KnowledgeTopic> = (() => {
  const map = new Map<string, KnowledgeTopic>();
  for (const cat of data.categories) {
    for (const t of cat.topics) map.set(t.id, t);
  }
  return map;
})();

/** Topic bundles activated by case-type / deliverable signals (aligned with API _CORE_BY_TOPIC). */
const CORE_BY_TOPIC: Record<string, readonly string[]> = {
  aos: [
    "aos-discretionary-checklist",
    "aos-statutory-eligibility",
    "aos-filing-packet",
    "affidavit-of-support",
    "inadmissibility-overview",
  ],
  family: [
    "family-based-immigration",
    "marriage-based-aos",
    "aos-statutory-eligibility",
    "aos-discretionary-checklist",
    "affidavit-of-support",
  ],
  waiver: [
    "extreme-hardship-factors",
    "ina-212a-waiver",
    "unlawful-presence-bars",
    "misrepresentation-212i",
  ],
  asylum: ["asylum-elements", "asylum-bars", "withholding-cat"],
  removal: ["procedural-posture-removal", "cancellation-of-removal", "inadmissibility-overview"],
  criminal: ["criminal-grounds-overview", "aggravated-felony-overview"],
  vawa: ["vawa-u-t-overview", "family-based-immigration"],
};

const DEFAULT_IMMIGRATION_CORE = [
  "aos-discretionary-checklist",
  "aos-statutory-eligibility",
  "inadmissibility-overview",
] as const;

function haystack(caseType: string, deliverableId?: string, extra?: string): string {
  return [caseType, deliverableId ?? "", extra ?? ""].join(" ").toLowerCase();
}

/** Active topic keys for a matter (aos | family | waiver | asylum | removal | criminal | vawa). */
export function activeKnowledgeTopics(
  caseType: string,
  deliverableId?: string,
  extraQuery?: string,
): string[] {
  const h = haystack(caseType, deliverableId, extraQuery);
  const topics: string[] = [];

  if (
    /\baos\b|i-485|i485|adjustment|discretionary|discretion|family.?based|marriage|i-130|spouse|immediate relative/.test(
      h,
    ) ||
    /\baos[-_]/.test(h)
  ) {
    topics.push("aos");
  }
  if (
    /family|marriage|i-130|spouse|immediate relative|preference|petition|consular|k-1|fiance/.test(h)
  ) {
    topics.push("family");
  }
  if (/waiver|hardship|i-601|i-601a|i-212|212\(a\)|ulp|unlawful presence|provisional/.test(h)) {
    topics.push("waiver");
  }
  if (/asylum|refugee|withholding|convention against torture|\bcat\b/.test(h)) {
    topics.push("asylum");
  }
  if (/removal|nta|eoir|immigration court|cancellation|deport/.test(h)) {
    topics.push("removal");
  }
  if (/criminal|cimt|aggravated felony|conviction|crime involving/.test(h)) {
    topics.push("criminal");
  }
  if (/\bvawa\b|u.?visa|t.?visa|u-visa|t-visa/.test(h)) {
    topics.push("vawa");
  }

  // Broad immigration without a more specific signal → AOS/family default (RMV high-frequency).
  if (!topics.length && /immigra|visa|uscis|ina\b/.test(h)) {
    topics.push("aos", "family");
  }

  return [...new Set(topics)];
}

function factsThatProveIt(topic: KnowledgeTopic): string[] {
  const section = topic.sections.find((s) => {
    const h = s.heading.toLowerCase();
    return h.includes("facts that prove") || h.includes("facts that") || h.includes("prove it");
  });
  return section?.bullets ?? [];
}

function requiresSection(topic: KnowledgeTopic): string {
  const section = topic.sections.find((s) => {
    const h = s.heading.toLowerCase();
    return h.includes("require") || h.includes("element");
  });
  return section?.bullets?.[0] ?? topic.notes ?? "";
}

function topicIdsForMatter(caseType: string, deliverableId?: string, extraQuery?: string): string[] {
  const active = activeKnowledgeTopics(caseType, deliverableId, extraQuery);
  const ordered: string[] = [];
  const seen = new Set<string>();

  function push(id: string) {
    if (seen.has(id) || !TOPIC_BY_ID.has(id)) return;
    seen.add(id);
    ordered.push(id);
  }

  for (const key of active) {
    for (const id of CORE_BY_TOPIC[key] ?? []) push(id);
  }

  if (!ordered.length) {
    for (const id of DEFAULT_IMMIGRATION_CORE) push(id);
  }

  // Keyword boost: match topic id / practiceAreas / title against haystack.
  const h = haystack(caseType, deliverableId, extraQuery);
  for (const [id, topic] of TOPIC_BY_ID) {
    if (seen.has(id)) continue;
    const blob = `${id} ${topic.title} ${topic.practiceAreas} ${topic.notes}`.toLowerCase();
    const tokens = id.split("-").filter((t) => t.length >= 4);
    if (tokens.some((t) => h.includes(t)) || (h.length > 8 && blob.split(/\s+/).some((w) => w.length >= 5 && h.includes(w)))) {
      push(id);
    }
  }

  return ordered;
}

export function firmKnowledgeElementsForMatter(
  caseType: string,
  deliverableId?: string,
  extraQuery?: string,
): FirmKnowledgeElement[] {
  return topicIdsForMatter(caseType, deliverableId, extraQuery).map((id) => {
    const topic = TOPIC_BY_ID.get(id)!;
    return {
      topicId: id,
      name: topic.title || topic.topic,
      cite: topic.cite,
      description: requiresSection(topic),
      neededFacts: factsThatProveIt(topic),
      practiceAreas: topic.practiceAreas,
      file: topic.file,
    };
  });
}

export function knowledgeTopicById(topicId: string): KnowledgeTopic | undefined {
  return TOPIC_BY_ID.get(topicId);
}

/** Deep-link to knowledge map filtered/highlighted for this matter. */
export function firmKnowledgeBrowseHref(caseType: string, deliverableId?: string): string {
  const topics = firmKnowledgeElementsForMatter(caseType, deliverableId)
    .slice(0, 12)
    .map((e) => e.topicId);
  const params = new URLSearchParams();
  if (topics.length) params.set("topics", topics.join(","));
  const first = topics[0];
  const qs = params.toString();
  const hash = first ? `firm-knowledge&topic=${encodeURIComponent(first)}` : "firm-knowledge";
  return `/knowledge-map${qs ? `?${qs}` : ""}#${hash}`;
}

export function firmKnowledgeTopicHref(topicId: string): string {
  return `/knowledge-map?topics=${encodeURIComponent(topicId)}#firm-knowledge&topic=${encodeURIComponent(topicId)}`;
}

const SOURCE_PREFIX = "From firm knowledge:";

export function encodeFirmKnowledgeSource(topicId: string, cite?: string): string {
  const base = `${SOURCE_PREFIX} ${topicId}`;
  return cite?.trim() ? `${base} · ${cite.trim()}` : base;
}

export function parseFirmKnowledgeTopicId(supportingCases?: string): string | null {
  if (!supportingCases) return null;
  const m = supportingCases.match(/From firm knowledge:\s*([a-z0-9-]+)/i);
  return m?.[1] ?? null;
}

export function isFirmKnowledgeApplied(elements: LegalElementRow[]): boolean {
  return elements.some((e) => Boolean(parseFirmKnowledgeTopicId(e.supportingCases)));
}

export function firmKnowledgeAppliedCount(elements: LegalElementRow[]): number {
  return elements.filter((e) => Boolean(parseFirmKnowledgeTopicId(e.supportingCases))).length;
}

/** Heuristic: mark needed facts present when OCR/extracted fact text overlaps. */
export function scoreNeededFacts(
  neededFacts: string[],
  facts: ExtractedFactRecord[],
  supportingFactsText?: string,
): NeededFactStatus[] {
  const corpus = [
    ...facts.map((f) => `${factDisplayLabel(f)} ${factDisplayValue(f)} ${f.legalElement ?? ""}`),
    supportingFactsText ?? "",
  ]
    .join(" ")
    .toLowerCase();

  return neededFacts.map((fact) => {
    const tokens = fact
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length >= 4 && !["that", "with", "from", "this", "have", "when"].includes(t));
    const hits = tokens.filter((t) => corpus.includes(t));
    const present = hits.length >= Math.min(2, Math.max(1, Math.ceil(tokens.length * 0.35)));
    if (present) {
      const match = facts.find((f) => {
        const blob = `${factDisplayLabel(f)} ${factDisplayValue(f)}`.toLowerCase();
        return hits.some((h) => blob.includes(h));
      });
      return {
        fact,
        status: "present" as const,
        matchedFrom: match ? factDisplayLabel(match) : undefined,
      };
    }
    return { fact, status: "needed" as const };
  });
}

export function formatNeededFactsChecklist(statuses: NeededFactStatus[]): string {
  return statuses
    .map((s) => {
      const mark = s.status === "present" ? "[x]" : "[ ]";
      const hint = s.matchedFrom ? ` (from ${s.matchedFrom})` : "";
      return `${mark} ${s.fact}${hint}`;
    })
    .join("\n");
}

export function formatMissingFactsSummary(statuses: NeededFactStatus[]): string {
  const missing = statuses.filter((s) => s.status === "needed").map((s) => s.fact);
  if (!missing.length) return "";
  return `Still needed: ${missing.slice(0, 3).join("; ")}${missing.length > 3 ? "…" : ""}`;
}

/**
 * Merge mode: return knowledge elements not already on the matter
 * (by topic id in supportingCases or by element name).
 */
export function missingFirmKnowledgeElements(
  caseType: string,
  existing: LegalElementRow[],
  deliverableId?: string,
): FirmKnowledgeElement[] {
  const suggested = firmKnowledgeElementsForMatter(caseType, deliverableId);
  const existingTopics = new Set(
    existing.map((e) => parseFirmKnowledgeTopicId(e.supportingCases)).filter(Boolean) as string[],
  );
  const existingNames = new Set(existing.map((e) => e.element.toLowerCase().trim()));
  return suggested.filter(
    (el) =>
      !existingTopics.has(el.topicId) &&
      !existingNames.has(el.name.toLowerCase()) &&
      !existingNames.has(el.topicId.toLowerCase()),
  );
}
