/**
 * Practice-area guided fact intake — structured JSON saved to Notes (type Facts)
 * and merged into agent dispatch context alongside freeform text.
 *
 * v2: deliverable-aware prompts with feedsSection helper text (B2B overflow pivot).
 */

/**
 * `immigration_asylum` / `immigration_family` are finer-grained than
 * `immigration` — asylum/withholding/CAT and family-based petitions get
 * their own guided intake depth (matching AOS's staging), while `immigration`
 * stays the fallback for AOS/other immigration case types. Callers that only
 * care about "is this an immigration matter at all" should use
 * `isImmigrationPracticeArea()` rather than checking `=== "immigration"`.
 */
export type PracticeAreaId =
  | "immigration"
  | "immigration_asylum"
  | "immigration_family"
  | "personal_injury"
  | "generic";

export function isImmigrationPracticeArea(area: PracticeAreaId): boolean {
  return area === "immigration" || area === "immigration_asylum" || area === "immigration_family";
}

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

/**
 * Asylum / withholding / CAT — same staged depth as AOS Discretionary Brief
 * (identity → attorney-authored case architecture → detailed factors).
 */
const ASYLUM_WITHHOLDING_CAT_FIELDS: FactFieldDef[] = [
  // ── Stage 1: Identity / posture ────────────────────────────────────────
  {
    id: "applicantName",
    label: "Applicant full legal name",
    feedsSection: "Caption / cover",
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
    id: "countryOfOrigin",
    label: "Country of origin / feared return country",
    feedsSection: "Statement of the case",
    kind: "text",
    required: true,
    stage: "identity",
  },
  {
    id: "filingType",
    label: "Affirmative or defensive filing",
    hint: "Affirmative (Asylum Office) or defensive (in removal proceedings before an IJ)",
    feedsSection: "Procedural posture",
    kind: "text",
    required: true,
    stage: "identity",
  },
  {
    id: "entryDate",
    label: "Date of last entry to the U.S.",
    feedsSection: "Procedural posture",
    kind: "date",
    required: true,
    stage: "identity",
  },
  {
    id: "oneYearDeadlineStatus",
    label: "One-year filing deadline status",
    hint: "Filed within one year of entry, or explain the exception (changed/extraordinary circumstances)",
    feedsSection: "Procedural posture — timeliness",
    kind: "textarea",
    required: true,
    stage: "identity",
  },
  {
    id: "currentProceedingsPosture",
    label: "Current posture",
    hint: "Asylum Office interview scheduled, referred to EOIR, individual hearing set, etc.",
    feedsSection: "Procedural posture",
    kind: "textarea",
    required: true,
    stage: "identity",
  },
  {
    id: "reliefSought",
    label: "Relief sought",
    hint: "Asylum, withholding of removal, CAT protection — or all three in the alternative",
    feedsSection: "Conclusion",
    kind: "text",
    required: true,
    stage: "identity",
  },
  // ── Stage 2: Case architecture (attorney-authored) ─────────────────────
  {
    id: "caseTheme",
    label: "Case theme (one sentence)",
    hint:
      "Attorney-authored. Template: “This case concerns a [who] who was [harm] because of [protected ground], and who continues to face [ongoing risk] if returned to [country].”",
    feedsSection: "Statement of the case + Conclusion",
    kind: "textarea",
    required: true,
    stage: "architecture",
  },
  {
    id: "protectedGroundTheory",
    label: "Protected-ground / nexus theory",
    hint: "Race, religion, nationality, political opinion, or particular social group (PSG) — and why the persecution was ON ACCOUNT OF that ground",
    feedsSection: "Legal argument — nexus",
    kind: "textarea",
    required: true,
    stage: "architecture",
  },
  {
    id: "particularSocialGroupFormulation",
    label: "Particular social group formulation (if PSG-based)",
    hint: "Must be socially distinct + defined with particularity — not just “people who fear X”",
    feedsSection: "Legal argument — PSG cognizability",
    kind: "textarea",
    stage: "architecture",
  },
  {
    id: "persecutorIdentity",
    label: "Who is the persecutor",
    hint: "Government actor, or non-state actor the government is unable/unwilling to control",
    feedsSection: "Legal argument — government nexus",
    kind: "textarea",
    required: true,
    stage: "architecture",
  },
  // ── Stage 3: Factors / evidentiary detail ──────────────────────────────
  {
    id: "pastPersecutionNarrative",
    label: "Past persecution narrative",
    hint: "What happened, when, by whom — severity and pattern, not just a single bad incident",
    feedsSection: "Statement of facts",
    kind: "textarea",
    required: true,
    stage: "factors",
  },
  {
    id: "wellFoundedFearNarrative",
    label: "Well-founded fear of future persecution",
    hint: "Why the client reasonably fears return today — specific, not general country instability",
    feedsSection: "Legal argument — well-founded fear",
    kind: "textarea",
    required: true,
    stage: "factors",
  },
  {
    id: "countryConditionsEvidence",
    label: "Country conditions evidence on file or needed",
    hint: "State Dept reports, NGO reports, news articles corroborating the pattern of harm",
    feedsSection: "Evidence — country conditions",
    kind: "textarea",
    stage: "factors",
  },
  {
    id: "corroboratingEvidence",
    label: "Corroborating evidence and witnesses",
    hint: "Affidavits, medical/psychological records, photos, police reports — or explain why unavailable",
    feedsSection: "Evidence — corroboration",
    kind: "textarea",
    stage: "factors",
  },
  {
    id: "internalRelocationAnalysis",
    label: "Internal relocation — why it isn't a safe alternative",
    hint: "Anticipate this argument; address it directly if raised",
    feedsSection: "Legal argument — internal relocation",
    kind: "textarea",
    stage: "factors",
  },
  {
    id: "firmResettlementIssues",
    label: "Firm resettlement in a third country",
    hint: "Any time spent in another country that could raise a firm-resettlement bar — or confirm none",
    feedsSection: "Legal argument — bars to relief",
    kind: "textarea",
    stage: "factors",
  },
  {
    id: "credibilityCorroboration",
    label: "Credibility — consistency and corroboration strategy",
    hint: "How the record supports credibility (consistency across statements, corroborating documents) — address any inconsistencies proactively",
    feedsSection: "Legal argument — credibility",
    kind: "textarea",
    stage: "factors",
  },
  {
    id: "catTortureFactors",
    label: "CAT-specific: likelihood of torture and government acquiescence",
    hint: "Only if CAT protection is sought in the alternative — torture standard differs from persecution",
    feedsSection: "Legal argument — CAT (if applicable)",
    kind: "textarea",
    stage: "factors",
  },
  {
    id: "priorImmigrationHistory",
    label: "Prior immigration history",
    hint: "Prior filings, denials, removals, voluntary departure — with outcomes",
    feedsSection: "Procedural background",
    kind: "textarea",
    stage: "factors",
  },
];

/**
 * Family-based petitions (I-130 and downstream AOS/consular processing) —
 * same staged depth as AOS Discretionary Brief.
 */
const FAMILY_BASED_FIELDS: FactFieldDef[] = [
  // ── Stage 1: Identity / petition ───────────────────────────────────────
  {
    id: "petitionerName",
    label: "Petitioner full legal name",
    hint: "U.S. citizen or lawful permanent resident filing the I-130",
    feedsSection: "Caption / cover",
    kind: "text",
    required: true,
    stage: "identity",
  },
  {
    id: "petitionerStatus",
    label: "Petitioner status",
    hint: "U.S. citizen or lawful permanent resident — affects category and wait time",
    feedsSection: "Statutory eligibility",
    kind: "text",
    required: true,
    stage: "identity",
  },
  {
    id: "beneficiaryName",
    label: "Beneficiary full legal name",
    feedsSection: "Caption / cover",
    kind: "text",
    required: true,
    stage: "identity",
  },
  {
    id: "relationshipType",
    label: "Relationship type",
    hint: "Spouse, parent, child, sibling, fiancé(e) — determines category and visa availability",
    feedsSection: "Statutory eligibility",
    kind: "text",
    required: true,
    stage: "identity",
  },
  {
    id: "i130Status",
    label: "I-130 filing / approval status",
    hint: "Not yet filed, pending, or approved — with dates",
    feedsSection: "Procedural posture",
    kind: "textarea",
    required: true,
    stage: "identity",
  },
  {
    id: "processingPath",
    label: "Processing path",
    hint: "Adjustment of status (in the U.S.) or consular processing (abroad)",
    feedsSection: "Procedural posture",
    kind: "text",
    required: true,
    stage: "identity",
  },
  {
    id: "priorityDate",
    label: "Priority date and visa availability",
    hint: "Immediate relative (always current) or preference category (check visa bulletin)",
    feedsSection: "Statutory eligibility",
    kind: "text",
    stage: "identity",
  },
  // ── Stage 2: Case architecture (attorney-authored) ─────────────────────
  {
    id: "relationshipTheme",
    label: "Relationship theme (one sentence, if marriage-based)",
    hint: "Attorney-authored framing of the bona fide relationship — not required for parent/child petitions",
    feedsSection: "Cover letter / bona fide relationship argument",
    kind: "textarea",
    stage: "architecture",
  },
  {
    id: "redFlagsToAddress",
    label: "Red flags to proactively address",
    hint: "Short courtship, large age gap, no shared address history, prior petitions for others — frame directly rather than let USCIS raise it first, or confirm none",
    feedsSection: "Cover letter — anticipated RFE issues",
    kind: "textarea",
    stage: "architecture",
  },
  // ── Stage 3: Factors / evidentiary detail ──────────────────────────────
  {
    id: "relationshipEvidence",
    label: "Relationship evidence inventory (if marriage-based)",
    hint: "Joint finances, joint lease/mortgage, photos over time, affidavits from friends/family, joint insurance",
    feedsSection: "Evidence — bona fide relationship",
    kind: "textarea",
    stage: "factors",
  },
  {
    id: "priorMaritalHistory",
    label: "Prior marriages / immigration petitions by either party",
    hint: "Prior marriages (with proof of termination), prior I-130s filed for other beneficiaries — or confirm none",
    feedsSection: "Statutory eligibility — prior history",
    kind: "textarea",
    stage: "factors",
  },
  {
    id: "priorDenialsOrRfes",
    label: "Prior denials or RFEs on this or a related petition",
    hint: "What was raised and how it's being addressed now — or confirm none",
    feedsSection: "Procedural background",
    kind: "textarea",
    stage: "factors",
  },
  {
    id: "inadmissibilityGrounds",
    label: "Grounds of inadmissibility (if any)",
    hint: "Unlawful presence, prior removal, criminal history, public charge — or confirm none",
    feedsSection: "Statutory eligibility — admissibility",
    kind: "textarea",
    stage: "factors",
  },
  {
    id: "publicChargeConsiderations",
    label: "Public charge considerations",
    hint: "Affidavit of Support (I-864) sponsor, household income — or confirm not applicable",
    feedsSection: "Statutory eligibility — public charge",
    kind: "textarea",
    stage: "factors",
  },
  {
    id: "medicalExamStatus",
    label: "Medical exam (I-693) status",
    hint: "Not yet scheduled, completed, or results pending",
    feedsSection: "Procedural checklist",
    kind: "text",
    stage: "factors",
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
  {
    id: "insuranceCarrier",
    label: "Insurance carrier (if known)",
    kind: "text",
  },
  {
    id: "claimNumber",
    label: "Claim number (if already opened)",
    kind: "text",
  },
  {
    id: "lienInformation",
    label: "Known liens (health insurance, Medicare/Medicaid, hospital)",
    hint: "Or confirm none identified yet",
    kind: "textarea",
  },
];

/**
 * Personal injury demand letter — same staged depth as the AOS discretionary
 * brief (identity → attorney-authored case architecture → detailed
 * factors), mirroring Clio's PI-specific damages/medical/lien fields
 * instead of borrowing immigration-shaped generic ones.
 */
const DEMAND_LETTER_FIELDS: FactFieldDef[] = [
  // ── Stage 1: Identity / incident / parties ─────────────────────────────
  {
    id: "clientName",
    label: "Client full legal name",
    feedsSection: "Letterhead / addressee block",
    kind: "text",
    required: true,
    stage: "identity",
  },
  {
    id: "incidentDate",
    label: "Date and time of incident",
    feedsSection: "Incident narrative",
    kind: "date",
    required: true,
    stage: "identity",
  },
  {
    id: "incidentLocation",
    label: "Location of incident",
    hint: "Intersection, business name, or address — as specific as possible",
    feedsSection: "Incident narrative",
    kind: "text",
    required: true,
    stage: "identity",
  },
  {
    id: "incidentDescription",
    label: "What happened — factual narrative",
    hint: "Plain, chronological account: who did what, in what order",
    feedsSection: "Incident narrative",
    kind: "textarea",
    required: true,
    stage: "identity",
  },
  {
    id: "defendantName",
    label: "At-fault party name",
    feedsSection: "Addressee block / liability section",
    kind: "text",
    required: true,
    stage: "identity",
  },
  {
    id: "insuranceCarrier",
    label: "Insurance carrier (if known)",
    feedsSection: "Addressee block",
    kind: "text",
    stage: "identity",
  },
  {
    id: "claimNumber",
    label: "Claim number (if already opened)",
    feedsSection: "Addressee block",
    kind: "text",
    stage: "identity",
  },
  {
    id: "policeReportNumber",
    label: "Police / incident report number",
    hint: "Or confirm none filed",
    feedsSection: "Liability section — supporting evidence",
    kind: "text",
    stage: "identity",
  },
  // ── Stage 2: Case architecture (attorney-authored) ─────────────────────
  {
    id: "caseTheme",
    label: "Case theme (one sentence)",
    hint:
      "Attorney-authored. Template: “This case concerns a [who] who suffered [injury] because [defendant] [breach], resulting in [stakes].” Specific and factual, not “clear liability.”",
    feedsSection: "Opening + demand rationale (2×)",
    kind: "textarea",
    required: true,
    stage: "architecture",
  },
  {
    id: "liabilityTheory",
    label: "Liability theory — who is at fault and why",
    hint: "Negligence, statutory violation, respondeat superior, product defect",
    feedsSection: "Liability section",
    kind: "textarea",
    required: true,
    stage: "architecture",
  },
  {
    id: "comparativeFaultDefense",
    label: "Anticipated comparative-fault argument, and the rebuttal",
    hint: "What the carrier will likely argue about your client's own fault — and why it doesn't hold up. Or “none anticipated.”",
    feedsSection: "Liability section — anticipated defenses",
    kind: "textarea",
    stage: "architecture",
  },
  {
    id: "injurySeverityFraming",
    label: "How to frame the injury's severity and life impact",
    hint: "Permanent vs. resolved, functional limitations, impact on work/family — the persuasive angle, not just the medical facts",
    feedsSection: "Injuries & damages framing",
    kind: "textarea",
    stage: "architecture",
  },
  // ── Stage 3: Damages / treatment / evidence detail ─────────────────────
  {
    id: "injuries",
    label: "Injuries and diagnoses",
    feedsSection: "Injuries & treatment",
    kind: "textarea",
    required: true,
    stage: "factors",
  },
  {
    id: "treatmentSummary",
    label: "Medical treatment chronology",
    hint: "ER, hospital, specialists, therapy — with dates",
    feedsSection: "Medical damages",
    kind: "textarea",
    required: true,
    stage: "factors",
  },
  {
    id: "futureMedicalNeeds",
    label: "Future / ongoing medical needs",
    hint: "Anticipated treatment, surgery, therapy — or confirm client is at MMI (maximum medical improvement)",
    feedsSection: "Special damages — future medical",
    kind: "textarea",
    stage: "factors",
  },
  {
    id: "priorInjuries",
    label: "Prior injuries or pre-existing conditions to the same body part(s)",
    hint: "Address directly rather than leave for the carrier to raise — or confirm none",
    feedsSection: "Liability / damages — anticipated defenses",
    kind: "textarea",
    stage: "factors",
  },
  {
    id: "economicDamages",
    label: "Economic damages — itemized",
    hint: "Medical bills by provider, lost wages, out-of-pocket — itemize if available, rough totals OK",
    feedsSection: "Special damages",
    kind: "textarea",
    required: true,
    stage: "factors",
  },
  {
    id: "lostWagesDetail",
    label: "Lost wages detail",
    hint: "Employer, wage/salary rate, days or hours missed",
    feedsSection: "Special damages — lost wages",
    kind: "textarea",
    stage: "factors",
  },
  {
    id: "nonEconomicDamages",
    label: "Non-economic damages (pain, suffering, loss of enjoyment, consortium)",
    feedsSection: "General damages",
    kind: "textarea",
    stage: "factors",
  },
  {
    id: "lienInformation",
    label: "Known liens (health insurance, Medicare/Medicaid, hospital)",
    hint: "Identify now so the demand accounts for net recovery — or confirm none identified yet",
    feedsSection: "Special damages — liens",
    kind: "textarea",
    stage: "factors",
  },
  {
    id: "witnessInformation",
    label: "Witnesses",
    hint: "Names and what they observed — or confirm none",
    feedsSection: "Liability section — supporting evidence",
    kind: "textarea",
    stage: "factors",
  },
  {
    id: "demandAmount",
    label: "Demand amount and rationale",
    feedsSection: "Demand & settlement section",
    kind: "text",
    required: true,
    stage: "factors",
  },
  {
    id: "responseDeadline",
    label: "Response deadline to set in the letter",
    hint: "Typical: 30 days from letter date",
    feedsSection: "Demand & settlement section",
    kind: "date",
    stage: "factors",
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
  // Check the finer immigration sub-areas before the generic immigration
  // catch-all, so e.g. "Immigration - Asylum" resolves to the deeper schema.
  if (
    lower.includes("asylum") ||
    lower.includes("withholding") ||
    lower.includes("cat claim") ||
    lower.includes("convention against torture") ||
    lower.includes("credible fear") ||
    lower.includes("reasonable fear")
  ) {
    return "immigration_asylum";
  }
  if (
    lower.includes("family") ||
    lower.includes("marriage") ||
    lower.includes("i-130") ||
    lower.includes("i130") ||
    lower.includes("spousal petition") ||
    lower.includes("fiance") ||
    lower.includes("fiancé")
  ) {
    return "immigration_family";
  }
  if (
    lower.includes("immigration") ||
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
  if (area === "immigration_asylum") return ASYLUM_WITHHOLDING_CAT_FIELDS;
  if (area === "immigration_family") return FAMILY_BASED_FIELDS;
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
    const byDeliverable = DELIVERABLE_FACT_SCHEMAS[deliverableId];
    // A specific deliverable (e.g. AOS Discretionary Brief) keeps its own
    // dedicated schema regardless of which immigration sub-area the case
    // type resolves to — the asylum/family sub-areas only change the
    // *generic* fallback below, not a deliverable that already has its own
    // guided intake. Falls back from the sub-area to the coarse
    // "immigration" key so e.g. an "Asylum" case type selecting AOS
    // Discretionary Brief still gets AOS_DISCRETIONARY_BRIEF_FIELDS.
    const schema =
      byDeliverable?.[area] ??
      (isImmigrationPracticeArea(area) ? byDeliverable?.immigration : undefined);
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
  ...ASYLUM_WITHHOLDING_CAT_FIELDS,
  ...FAMILY_BASED_FIELDS,
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
