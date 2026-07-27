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
  /**
   * Progressive disclosure for AOS architecture:
   * identity = applicant/petition first; architecture = theme/headings; factors = equities.
   */
  stage?: "identity" | "architecture" | "factors";
};

export type DraftingFactsPayload = {
  v: 1;
  practiceArea: PracticeAreaId;
  caseType?: string;
  deliverableId?: string;
  fields: Record<string, string | string[]>;
  /**
   * AOS argument-variant picks keyed by section
   * (section_a / section_d_adverse / section_e_balancing) with
   * "<library_key>.<variant_id>" values. Folded into `fields.paragraphSelections`
   * on serialize so the backend generator consumes them directly.
   */
  paragraphSelections?: Record<string, string>;
  /** Scorecard follow-up Q&A persisted for next case continuity. */
  followUpAnswers?: Record<string, string>;
  /** Prior matter used as fact template (schema only — PII cleared). */
  sourceMatterId?: string;
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

/** AOS discretionary brief — waiver/equities focus, not asylum persecution narrative. */
const AOS_DISCRETIONARY_BRIEF_FIELDS: FactFieldDef[] = [
  // ── Stage 1: Identity / petition ──────────────────────────────────────
  {
    id: "applicantName",
    label: "Applicant full legal name",
    feedsSection: "Caption / cover + statutory eligibility",
    kind: "text",
    required: true,
    stage: "identity",
  },
  {
    id: "aNumber",
    label: "A-Number (if known)",
    hint: "Format A-XXXXXXXXX",
    feedsSection: "Caption / cover",
    kind: "text",
    stage: "identity",
  },
  {
    id: "clientStatus",
    label: "Current immigration status",
    hint: "e.g. out of status, TPS, visa overstay, pending I-485",
    feedsSection: "FILL — statutory eligibility / background",
    kind: "text",
    required: true,
    stage: "identity",
  },
  {
    id: "entryDate",
    label: "Date of last entry to the U.S.",
    feedsSection: "FILL — statutory eligibility (inspected & admitted)",
    kind: "date",
    required: true,
    stage: "identity",
  },
  {
    id: "portOfEntry",
    label: "Port of entry",
    feedsSection: "FILL — statutory eligibility",
    kind: "text",
    required: true,
    stage: "identity",
  },
  {
    id: "entryVisaType",
    label: "Visa type at last entry",
    hint: "e.g. B-2 tourist, F-1 student, H-1B",
    feedsSection: "FILL — statutory eligibility",
    kind: "text",
    required: true,
    stage: "identity",
  },
  {
    id: "petitionerName",
    label: "U.S. citizen petitioner name",
    feedsSection: "FILL — statutory eligibility (I-130)",
    kind: "text",
    required: true,
    stage: "identity",
  },
  {
    id: "petitionerRelationship",
    label: "Petitioner relationship to applicant",
    hint: "daughter | son | spouse | parent",
    feedsSection: "FILL — statutory eligibility",
    kind: "text",
    required: true,
    stage: "identity",
  },
  {
    id: "qualifyingRelative",
    label: "Qualifying relative (if different from petitioner)",
    hint: "Optional — often same as petitioner for family-based AOS",
    feedsSection: "FILL — equities / hardship",
    kind: "text",
    stage: "identity",
  },
  {
    id: "i130ApprovedDate",
    label: "I-130 approval date",
    feedsSection: "FILL — statutory eligibility",
    kind: "date",
    required: true,
    stage: "identity",
  },
  {
    id: "i485FiledDate",
    label: "I-485 filing date",
    feedsSection: "FILL — statutory eligibility",
    kind: "date",
    required: true,
    stage: "identity",
  },
  {
    id: "reliefSought",
    label: "Relief requested",
    hint: "Usually: favorable discretion + approval of Form I-485",
    feedsSection: "Conclusion",
    kind: "text",
    required: true,
    stage: "identity",
  },
  // ── Stage 2: Case architecture (attorney-authored) ────────────────────
  {
    id: "caseTheme",
    label: "Case theme (one sentence)",
    hint:
      "Attorney-authored. Template: “This case concerns a [who] whose [most compelling equity] [stakes if denied].” Specific, factual, with stakes — not “strong family ties.”",
    feedsSection: "Cover subtitle + Argument opening + balancing close + Conclusion (4×)",
    kind: "textarea",
    required: true,
    stage: "architecture",
  },
  {
    id: "caseThemeBrief",
    label: "Case theme — brief restatement",
    hint: "Shorter form for the balancing closing sentence",
    feedsSection: "FILL — balancing close",
    kind: "text",
    required: true,
    stage: "architecture",
  },
  {
    id: "sectionAHeading",
    label: "Section A heading (primary equity — argument claim)",
    hint:
      "Not a category label. Wrong: “Family Unity.” Right: “[Name]’s 40-Year Nursing Career Makes Her Uniquely Qualified to Care for Her Autistic U.S. Citizen Grandson.”",
    feedsSection: "FILL — Argument §A",
    kind: "textarea",
    required: true,
    stage: "architecture",
  },
  {
    id: "sectionAFacts",
    label: "Section A facts (primary equity)",
    hint: "Who, what, when, why it matters — 2–4 paragraphs of raw facts for the associate",
    feedsSection: "FILL — Argument §A",
    kind: "textarea",
    required: true,
    stage: "architecture",
  },
  {
    id: "sectionBHeading",
    label: "Section B heading (secondary equities — argument claim)",
    hint: "Bundle supporting equities under one claim heading",
    feedsSection: "FILL — Argument §B",
    kind: "textarea",
    required: true,
    stage: "architecture",
  },
  {
    id: "sectionBFacts",
    label: "Section B facts (bundled secondary equities)",
    feedsSection: "FILL — Argument §B",
    kind: "textarea",
    required: true,
    stage: "architecture",
  },
  {
    id: "adverseHeading",
    label: "Adverse section heading (proportionality frame)",
    hint:
      "MUST NOT contain “Immigration Violations,” “Overstay,” or “Unlawful Presence.” Frame as proportionality — e.g. “The Circumstances of [Name]’s Continued Presence Do Not Diminish the Strength of This Application.”",
    feedsSection: "FILL — Argument §D",
    kind: "textarea",
    required: true,
    stage: "architecture",
  },
  {
    id: "adverseFactorBrief",
    label: "Adverse factor in one phrase",
    hint: "For balancing close — e.g. “an overstay”",
    feedsSection: "FILL — balancing close",
    kind: "text",
    required: true,
    stage: "architecture",
  },
  // ── Stage 3: Factors / equities detail ────────────────────────────────
  {
    id: "positiveEquities",
    label: "Positive discretionary factors (inventory)",
    hint: "Family ties, community, employment, residence, GMC — feeds balancing inventory",
    feedsSection: "FILL — equities + balancing",
    kind: "textarea",
    required: true,
    stage: "factors",
  },
  {
    id: "balancingInventory",
    label: "Balancing inventory (3–5 short declarative equities)",
    hint: "Tight list for Section E — drawn from Sections A–B",
    feedsSection: "FILL — Argument §E",
    kind: "textarea",
    stage: "factors",
  },
  {
    id: "adverseFacts",
    label: "Adverse facts with full context",
    hint: "What happened, when, why, rehabilitation — state plainly; no apology",
    feedsSection: "FILL — Argument §D",
    kind: "textarea",
    required: true,
    stage: "factors",
  },
  {
    id: "adverseFactors",
    label: "Other negative discretionary factors",
    hint: "Or “none known” beyond the primary adverse fact",
    feedsSection: "FILL — Argument §D",
    kind: "textarea",
    stage: "factors",
  },
  {
    id: "departureHarm",
    label: "Specific harm if applicant departed for consular processing",
    hint: "3/10-year bar, separation from dependent, health risk — for AOS mechanism §C",
    feedsSection: "PRESERVE+FILL — AOS mechanism §C",
    kind: "textarea",
    stage: "factors",
  },
  {
    id: "extremeHardshipFactors",
    label: "Hardship / humanitarian factors (if applicable)",
    hint: "Medical, financial, psychological, country conditions",
    feedsSection: "FILL — equities",
    kind: "textarea",
    stage: "factors",
  },
  {
    id: "inadmissibilityGrounds",
    label: "Grounds of inadmissibility (if any)",
    hint: "Or confirm none — e.g. unlawful presence not triggered without departure",
    feedsSection: "FILL — statutory eligibility / admissibility",
    kind: "textarea",
    stage: "factors",
  },
  {
    id: "priorFilings",
    label: "Prior immigration history",
    hint: "Prior AOS, removals, voluntary departure — with outcomes",
    feedsSection: "FILL — background",
    kind: "textarea",
    stage: "factors",
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
    // paragraphSelections may be stored inside fields (persisted form) or at the
    // top level (in-memory form). Lift it back out so `fields` stays fact-only.
    const parsedFields: Record<string, unknown> = { ...(parsed.fields ?? {}) };
    const foldedSelections = parsedFields.paragraphSelections as Record<string, string> | undefined;
    delete parsedFields.paragraphSelections;
    const paragraphSelections =
      parsed.paragraphSelections ??
      (foldedSelections && typeof foldedSelections === "object" ? foldedSelections : undefined);
    return {
      ...base,
      ...parsed,
      v: 1,
      fields: { ...base.fields, ...(parsedFields as Record<string, string | string[]>) },
      paragraphSelections,
    };
  } catch {
    return null;
  }
}

export function serializeDraftingFacts(payload: DraftingFactsPayload): string {
  const fields: Record<string, unknown> = { ...payload.fields };
  // Fold argument-variant picks into fields so the backend AOS generator reads
  // them from `fields.paragraphSelections`.
  if (payload.paragraphSelections && Object.keys(payload.paragraphSelections).length) {
    fields.paragraphSelections = payload.paragraphSelections;
  } else {
    delete fields.paragraphSelections;
  }
  return JSON.stringify({ ...payload, fields, updatedAt: new Date().toISOString() });
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
  const selections = payload.paragraphSelections ?? {};
  const selEntries = Object.entries(selections).filter(([, v]) => v);
  if (selEntries.length) {
    const labels: Record<string, string> = {
      section_a: "Primary equity (§A)",
      section_d_adverse: "Adverse framing (§D)",
      section_e_balancing: "Balancing (§E)",
    };
    lines.push("- Selected argument variants (AOS paragraph library):");
    for (const [key, value] of selEntries) {
      lines.push(`  - ${labels[key] ?? key}: ${value}`);
    }
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
