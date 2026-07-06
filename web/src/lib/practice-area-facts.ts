/**
 * Practice-area guided fact intake — structured JSON saved to Notes (type Facts)
 * and merged into agent dispatch context alongside freeform text.
 *
 * v2: deliverable-aware prompts with feedsSection helper text (B2B overflow pivot).
 */

export type PracticeAreaId = "immigration" | "personal_injury" | "generic";

export type FactFieldKind = "text" | "textarea" | "date" | "checkboxes";

export type FactFieldDef = {
  id: string;
  label: string;
  hint?: string;
  /** Plain English: which draft section this fact feeds. */
  feedsSection?: string;
  kind: FactFieldKind;
  required?: boolean;
  /** For checkbox groups — option labels. */
  options?: string[];
};

export type DraftingFactsPayload = {
  v: 1;
  practiceArea: PracticeAreaId;
  caseType?: string;
  deliverableId?: string;
  fields: Record<string, string | string[]>;
  additionalNotes?: string;
  updatedAt?: string;
};

export const DRAFTING_FACTS_NOTE_TYPE = "Facts";

/** Sample discount: 20% when firm provides prior work (Production Cost Pricing). */
export const SAMPLE_DISCOUNT_PERCENT = 20;

const IMMIGRATION_BASE: FactFieldDef[] = [
  {
    id: "clientStatus",
    label: "Current immigration status",
    hint: "e.g. pending asylum, out of status, TPS, lawful permanent resident",
    kind: "text",
    required: true,
  },
  {
    id: "reliefSought",
    label: "Relief or outcome sought",
    hint: "e.g. AOS approval, asylum grant, cancellation of removal",
    kind: "text",
    required: true,
  },
  {
    id: "entryDate",
    label: "Date of entry to the U.S.",
    kind: "date",
    required: true,
  },
  {
    id: "priorityDate",
    label: "Priority date (if applicable)",
    kind: "date",
  },
  {
    id: "adverseFactors",
    label: "Adverse factors or derogatory information",
    hint: "Criminal history, prior denials, unlawful presence — or “none known”",
    feedsSection: "Discretionary Factors / equities analysis",
    kind: "textarea",
  },
  {
    id: "supportingDocs",
    label: "Supporting documents on file or needed",
    kind: "checkboxes",
    options: [
      "Passport or national ID",
      "I-94 / entry record",
      "Prior USCIS or court filings",
      "Country conditions evidence",
      "Medical or psychological records",
      "Affidavits or declarations",
      "Court or BIA orders",
    ],
  },
];

const AOS_DISCRETIONARY_BRIEF_FIELDS: FactFieldDef[] = [
  {
    id: "clientStatus",
    label: "Current immigration status",
    hint: "e.g. pending asylum, out of status, TPS",
    feedsSection: "Introduction & client background",
    kind: "text",
    required: true,
  },
  {
    id: "reliefSought",
    label: "Relief or outcome sought",
    hint: "e.g. AOS approval with waiver of inadmissibility",
    feedsSection: "Relief requested",
    kind: "text",
    required: true,
  },
  {
    id: "persecutionNarrative",
    label: "Client's persecution or hardship narrative",
    hint: "Key events, dates, locations, perpetrators — or upload declaration",
    feedsSection: "Credibility Assessment",
    kind: "textarea",
    required: true,
  },
  {
    id: "protectedGround",
    label: "Protected ground and nexus to harm",
    hint: "Race, religion, nationality, political opinion, PSG — explain connection",
    feedsSection: "Nexus section",
    kind: "textarea",
    required: true,
  },
  {
    id: "countryConditions",
    label: "Country conditions relevant to the claim",
    hint: "Summarize or note reports on file (State Dept, NGO, expert)",
    feedsSection: "Country Conditions for Nexus",
    kind: "textarea",
    required: true,
  },
  {
    id: "adverseFactors",
    label: "Adverse factors (criminal, immigration violations, prior denials)",
    hint: "List each factor — or “none known”",
    feedsSection: "Discretionary Factors / 212(h) or waiver analysis",
    kind: "textarea",
    required: true,
  },
  {
    id: "positiveEquities",
    label: "Positive discretionary factors",
    hint: "Family ties, community service, rehabilitation, length of residence",
    feedsSection: "Positive discretionary factors",
    kind: "textarea",
  },
  {
    id: "priorFilings",
    label: "Prior asylum, AOS, or removal filings and outcomes",
    feedsSection: "Procedural history",
    kind: "textarea",
  },
];

const RESEARCH_MEMO_IMMIGRATION_FIELDS: FactFieldDef[] = [
  {
    id: "researchQuestion",
    label: "Primary legal question to research",
    hint: "e.g. Does particular social group X qualify under Matter of A-B-?",
    feedsSection: "Issue presented",
    kind: "textarea",
    required: true,
  },
  {
    id: "jurisdiction",
    label: "Controlling jurisdiction or forum",
    hint: "e.g. Ninth Circuit, BIA, USCIS policy",
    feedsSection: "Applicable law section",
    kind: "text",
    required: true,
  },
  {
    id: "clientStatus",
    label: "Client posture / procedural context",
    feedsSection: "Background",
    kind: "text",
    required: true,
  },
  {
    id: "keyFacts",
    label: "Undisputed or assumed facts for the memo",
    feedsSection: "Facts / background",
    kind: "textarea",
    required: true,
  },
  {
    id: "preferredAuthorities",
    label: "Cases or sources the firm prefers cited",
    hint: "Optional — feeds Firm Memory alignment",
    feedsSection: "Authorities / analysis",
    kind: "textarea",
  },
];

const HEARING_PACKET_FIELDS: FactFieldDef[] = [
  {
    id: "hearingDate",
    label: "Hearing date and time",
    feedsSection: "Cover sheet / hearing notice",
    kind: "date",
    required: true,
  },
  {
    id: "hearingType",
    label: "Hearing type and forum",
    hint: "e.g. individual merits hearing, master calendar, USCIS interview",
    feedsSection: "Procedural posture",
    kind: "text",
    required: true,
  },
  {
    id: "exhibitList",
    label: "Exhibits to include (list or describe)",
    hint: "Declaration, medical records, country conditions — with exhibit letters if known",
    feedsSection: "Exhibit index",
    kind: "textarea",
    required: true,
  },
  {
    id: "witnessList",
    label: "Witnesses (if any)",
    feedsSection: "Witness list",
    kind: "textarea",
  },
  {
    id: "reliefSought",
    label: "Relief sought at hearing",
    feedsSection: "Hearing brief / statement of issues",
    kind: "text",
    required: true,
  },
  {
    id: "supportingDocs",
    label: "Documents already on file",
    kind: "checkboxes",
    options: [
      "Notice of hearing",
      "Client declaration",
      "Medical records",
      "Country conditions reports",
      "Prior filings / decisions",
      "Expert affidavits",
    ],
  },
];

const PI_BASE: FactFieldDef[] = [
  {
    id: "incidentDate",
    label: "Date of incident",
    kind: "date",
    required: true,
  },
  {
    id: "liabilityTheory",
    label: "Who is at fault and why",
    hint: "Brief liability theory — e.g. rear-end collision, negligent maintenance",
    kind: "textarea",
    required: true,
  },
  {
    id: "injuries",
    label: "Injuries claimed",
    kind: "textarea",
    required: true,
  },
  {
    id: "treatmentSummary",
    label: "Treatment so far",
    hint: "Providers, procedures, ongoing care",
    kind: "textarea",
  },
  {
    id: "damagesSketch",
    label: "Damages overview",
    hint: "Medical bills, lost wages, pain and suffering — rough numbers OK",
    kind: "textarea",
  },
];

const DEMAND_LETTER_FIELDS: FactFieldDef[] = [
  {
    id: "incidentDate",
    label: "Date, time, and location of incident",
    feedsSection: "Incident narrative",
    kind: "textarea",
    required: true,
  },
  {
    id: "liabilityTheory",
    label: "Liability theory — who is at fault and why",
    hint: "Negligence, statutory violation, respondeat superior",
    feedsSection: "Liability section",
    kind: "textarea",
    required: true,
  },
  {
    id: "injuries",
    label: "Injuries and diagnoses",
    feedsSection: "Injuries & treatment",
    kind: "textarea",
    required: true,
  },
  {
    id: "treatmentSummary",
    label: "Medical treatment chronology",
    hint: "ER, hospital, specialists, therapy — with dates",
    feedsSection: "Medical damages",
    kind: "textarea",
    required: true,
  },
  {
    id: "economicDamages",
    label: "Economic damages (bills, lost wages, out-of-pocket)",
    hint: "Rough totals OK — itemize if available",
    feedsSection: "Special damages",
    kind: "textarea",
    required: true,
  },
  {
    id: "nonEconomicDamages",
    label: "Non-economic damages (pain, suffering, loss of enjoyment)",
    feedsSection: "General damages",
    kind: "textarea",
  },
  {
    id: "demandAmount",
    label: "Demand amount and rationale",
    feedsSection: "Demand & settlement section",
    kind: "text",
    required: true,
  },
  {
    id: "insuranceCarrier",
    label: "Insurance carrier and claim number (if known)",
    feedsSection: "Addressee block",
    kind: "text",
  },
];

/** Deliverable × practice-area fact schemas (Practice Fact Mapping). */
const DELIVERABLE_FACT_SCHEMAS: Partial<
  Record<string, Partial<Record<PracticeAreaId, FactFieldDef[]>>>
> = {
  "aos-discretionary-brief": { immigration: AOS_DISCRETIONARY_BRIEF_FIELDS },
  "research-memo": { immigration: RESEARCH_MEMO_IMMIGRATION_FIELDS },
  "hearing-packet": { immigration: HEARING_PACKET_FIELDS },
  "demand-letter": { personal_injury: DEMAND_LETTER_FIELDS },
};

export function deliverableFactGuideTitle(deliverableId?: string): string | null {
  const titles: Record<string, string> = {
    "aos-discretionary-brief": "AOS Discretionary Brief",
    "research-memo": "Research Memo",
    "hearing-packet": "Hearing Packet",
    "demand-letter": "Demand Letter",
  };
  return deliverableId ? titles[deliverableId] ?? null : null;
}

export function resolvePracticeArea(caseType: string): PracticeAreaId {
  const lower = (caseType || "").toLowerCase();
  if (
    lower.includes("immigration") ||
    lower.includes("asylum") ||
    lower.includes("adjustment") ||
    lower.includes("cancellation") ||
    lower.includes("uscis") ||
    lower.includes("removal")
  ) {
    return "immigration";
  }
  if (
    lower.includes("personal injury") ||
    lower.includes("pi ") ||
    lower.includes("auto") ||
    lower.includes("slip") ||
    lower.includes("negligen")
  ) {
    return "personal_injury";
  }
  return "generic";
}

export function fieldsForPracticeArea(area: PracticeAreaId): FactFieldDef[] {
  if (area === "immigration") return IMMIGRATION_BASE;
  if (area === "personal_injury") return PI_BASE;
  return [];
}

/** Deliverable-aware field set; falls back to practice-area defaults. */
export function fieldsForDeliverable(
  deliverableId: string | undefined,
  area: PracticeAreaId,
): FactFieldDef[] {
  if (deliverableId) {
    const schema = DELIVERABLE_FACT_SCHEMAS[deliverableId]?.[area];
    if (schema?.length) return schema;
  }
  return fieldsForPracticeArea(area);
}

export function emptyDraftingFacts(
  matterId: string,
  caseType: string,
  deliverableId?: string,
): DraftingFactsPayload {
  const practiceArea = resolvePracticeArea(caseType);
  const fields: Record<string, string | string[]> = {};
  for (const def of fieldsForDeliverable(deliverableId, practiceArea)) {
    fields[def.id] = def.kind === "checkboxes" ? [] : "";
  }
  return {
    v: 1,
    practiceArea,
    caseType,
    deliverableId,
    fields,
    additionalNotes: "",
    updatedAt: new Date().toISOString(),
  };
}

function fieldFilled(value: string | string[] | undefined): boolean {
  if (Array.isArray(value)) return value.length > 0;
  return Boolean(value?.trim());
}

export function draftingFactsCompleteness(
  payload: DraftingFactsPayload,
  deliverableId?: string,
): { filled: number; total: number; percent: number } {
  const defs = fieldsForDeliverable(deliverableId ?? payload.deliverableId, payload.practiceArea);
  if (defs.length === 0) {
    const notes = payload.additionalNotes?.trim() ?? "";
    return { filled: notes ? 1 : 0, total: 1, percent: notes ? 100 : 0 };
  }
  const keyDefs = defs.filter((d) => d.required || d.kind !== "checkboxes");
  const total = keyDefs.length;
  let filled = 0;
  for (const def of keyDefs) {
    if (fieldFilled(payload.fields[def.id])) filled += 1;
  }
  const percent = total === 0 ? 0 : Math.round((filled / total) * 100);
  return { filled, total, percent };
}

export function parseDraftingFactsNote(
  content: string,
  matterId: string,
  caseType: string,
  deliverableId?: string,
): DraftingFactsPayload | null {
  const trimmed = content.trim();
  if (!trimmed) return null;
  try {
    const parsed = JSON.parse(trimmed) as Partial<DraftingFactsPayload>;
    if (parsed.v !== 1 || !parsed.practiceArea) return null;
    const base = emptyDraftingFacts(matterId, caseType, deliverableId ?? parsed.deliverableId);
    return {
      ...base,
      ...parsed,
      v: 1,
      fields: { ...base.fields, ...(parsed.fields ?? {}) },
    };
  } catch {
    return null;
  }
}

export function serializeDraftingFacts(payload: DraftingFactsPayload): string {
  return JSON.stringify({ ...payload, updatedAt: new Date().toISOString() });
}

const FIELD_LABELS: Record<string, string> = {};
for (const def of [
  ...IMMIGRATION_BASE,
  ...AOS_DISCRETIONARY_BRIEF_FIELDS,
  ...RESEARCH_MEMO_IMMIGRATION_FIELDS,
  ...HEARING_PACKET_FIELDS,
  ...PI_BASE,
  ...DEMAND_LETTER_FIELDS,
]) {
  FIELD_LABELS[def.id] = def.label;
}

/** Human-readable block for PM dispatch and assignment intake notes. */
export function formatDraftingFactsForPrompt(payload: DraftingFactsPayload | null | undefined): string {
  if (!payload) return "";
  const defs = fieldsForDeliverable(payload.deliverableId, payload.practiceArea);
  const guideTitle = deliverableFactGuideTitle(payload.deliverableId);
  const lines: string[] = ["## Structured facts for drafting"];
  if (guideTitle) lines.push(`- Deliverable: ${guideTitle}`);
  if (payload.caseType) lines.push(`- Practice area: ${payload.caseType}`);
  for (const def of defs) {
    const val = payload.fields[def.id];
    if (!fieldFilled(val)) continue;
    const sectionNote = def.feedsSection ? ` (→ ${def.feedsSection})` : "";
    if (Array.isArray(val)) {
      lines.push(`- ${def.label}${sectionNote}: ${val.join("; ")}`);
    } else {
      lines.push(`- ${def.label}${sectionNote}: ${String(val).trim()}`);
    }
  }
  if (payload.additionalNotes?.trim()) {
    lines.push(`- Additional notes: ${payload.additionalNotes.trim()}`);
  }
  return lines.length > 1 ? lines.join("\n") : "";
}

/** Merge structured + freeform facts into one narrative for agents. */
export function mergeFactsForDispatch(
  structured: DraftingFactsPayload | null | undefined,
  freeform: string,
): string {
  const parts: string[] = [];
  const block = formatDraftingFactsForPrompt(structured);
  if (block) parts.push(block);
  const trimmed = freeform.trim();
  if (trimmed) {
    parts.push(trimmed.startsWith("##") ? trimmed : `## Attorney fact summary\n${trimmed}`);
  }
  return parts.join("\n\n").trim();
}

export function isDraftingFactsCompleteEnough(
  structured: DraftingFactsPayload | null | undefined,
  freeform: string,
  minFreeform = 20,
): boolean {
  const merged = mergeFactsForDispatch(structured, freeform);
  if (merged.length >= minFreeform) return true;
  if (!structured) return false;
  const { filled, total } = draftingFactsCompleteness(structured);
  return total > 0 && filled >= Math.min(3, total);
}

/** Discounted price when sample prior work is provided. */
export function applySampleDiscount(usd: number, percent = SAMPLE_DISCOUNT_PERCENT): number {
  return Math.round(usd * (1 - percent / 100));
}

export function formatSampleDiscountNote(percent = SAMPLE_DISCOUNT_PERCENT): string {
  return `Provide a sample of your firm's prior work and save ${percent}% — your style helps us deliver faster and closer to your firm's voice.`;
}
