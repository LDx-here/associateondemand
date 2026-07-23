/**
 * AOS paragraph-library types + pure helpers shared by the API route
 * (`GET /api/aos/library`) and the native variant-selection UI
 * (`AosVariantSelector`).
 *
 * The backend generator (`services/api/app/services/aos_paragraph_library.py`)
 * remains the source of truth for FILL prose. Variant selections are stored on
 * a matter's drafting facts under `fields.paragraphSelections` using
 * `"<library_key>.<variant_id>"` values keyed by section:
 *   - section_a         → primary equity  (library.equity)
 *   - section_d_adverse → adverse framing (library.adverse)
 *   - section_e_balancing → balancing     (library.balancing)
 */

export type AosSectionKey = "section_a" | "section_d_adverse" | "section_e_balancing";

export type AosVariant = {
  /** Full selection id, e.g. "caregiver_autistic_dependent.v3". */
  id: string;
  key: string;
  variantId: string;
  label: string;
  description?: string;
  paragraph: string;
  citations?: string[];
};

export type AosVariantGroup = {
  key: string;
  displayName: string;
  triggerConditions?: Record<string, unknown>;
  variants: AosVariant[];
};

export type AosCaseTheme = {
  group: string;
  text: string;
};

export type AosNovelAlert = {
  condition: string;
  alert: string;
};

export type AosLibraryResponse = {
  version: string;
  firm?: string;
  briefType?: string;
  caseThemes: AosCaseTheme[];
  equity: AosVariantGroup[];
  adverse: AosVariantGroup[];
  balancing: AosVariantGroup[];
  novelCombinationAlerts: AosNovelAlert[];
};

/** Which drafting-facts field feeds each ##SLOT## token used in library prose. */
const SLOT_FIELD_MAP: Record<string, string[]> = {
  APPLICANT_FULL_NAME: ["applicantName"],
  DEPENDENT_NAME: ["dependentName", "qualifyingRelative"],
  CARE_SPECIFICS: ["sectionAFacts"],
  CARE_DESCRIPTION: ["sectionAFacts"],
  ADVERSE_CONTEXT: ["adverseFacts"],
  ADVERSE_DESCRIPTION: ["adverseFacts"],
  ENTRY_DATE: ["entryDate"],
  ENTRY_VISA_TYPE: ["entryVisaType"],
  BALANCING_INVENTORY: ["balancingInventory", "positiveEquities"],
  ADVERSE_FACTOR_BRIEF: ["adverseFactorBrief"],
  CASE_THEME_BRIEF: ["caseThemeBrief", "caseTheme"],
  DEPENDENT_CONDITION: ["dependentCondition"],
  SERVICE_SUMMARY: ["sectionBFacts"],
  PROFESSIONAL_CARE_SPECIFICS: ["sectionBFacts", "sectionAFacts"],
};

/** Neutral pronoun defaults mirror the backend generator fallbacks. */
const SLOT_DEFAULTS: Record<string, string> = {
  APPLICANT_PRONOUN_SUBJECT: "the applicant",
  APPLICANT_PRONOUN_SUBJECT_CAP: "The applicant",
  APPLICANT_PRONOUN_OBJECT: "the applicant",
  APPLICANT_PRONOUN_POSSESSIVE: "the applicant's",
  DEPENDENT_PRONOUN_OBJECT: "them",
  DEPENDENT_PRONOUN_POSSESSIVE: "their",
};

type FactValue = string | string[] | undefined;

function readField(fields: Record<string, FactValue>, id: string): string {
  const v = fields[id];
  if (Array.isArray(v)) return v.filter(Boolean).join("; ");
  return (v ?? "").toString().trim();
}

/**
 * Substitute ##SLOT## tokens in a library paragraph for live preview.
 * Unknown / unfilled slots render as a readable `[slot name]` placeholder so the
 * attorney can see exactly what the associate still needs to fill.
 */
export function substituteAosSlots(text: string, fields: Record<string, FactValue>): string {
  return text.replace(/##([A-Z0-9_]+)##/g, (_match, token: string) => {
    const feeders = SLOT_FIELD_MAP[token];
    if (feeders) {
      for (const fieldId of feeders) {
        const val = readField(fields, fieldId);
        if (val) return val;
      }
    }
    if (SLOT_DEFAULTS[token]) return SLOT_DEFAULTS[token];
    return `[${token.toLowerCase().replace(/_/g, " ")}]`;
  });
}

/**
 * Client-side novel-combination detection mirroring the backend
 * `evaluate_selection_logic` alerts + the HTML tool's heuristics. Scans the
 * attorney-authored narrative fields for the signals the backend keys on.
 */
export function detectNovelCombinationAlerts(fields: Record<string, FactValue>): string[] {
  const blob = [
    readField(fields, "caseTheme"),
    readField(fields, "sectionAHeading"),
    readField(fields, "sectionAFacts"),
    readField(fields, "sectionBHeading"),
    readField(fields, "sectionBFacts"),
    readField(fields, "positiveEquities"),
    readField(fields, "extremeHardshipFactors"),
    readField(fields, "clientStatus"),
  ]
    .join(" \n ")
    .toLowerCase();

  const hasAutism = /autis/.test(blob);
  const hasCredential = /nurse|licensed|credential|physician|therapist|doctor|rn\b|lvn\b|social worker/.test(blob);
  const hasCommunityLeader = /pastor|deacon|imam|elder|founder|president|director|chair|leader/.test(blob);
  const hasOwnMedical = /(applicant|her own|his own|own) (health|medical|condition|illness|diagnos)/.test(blob);
  const isElderly = /\b(6[0-9]|7[0-9]|8[0-9]|9[0-9])[- ]?(years|yrs|yo|year)/.test(blob) || /elderly|retired/.test(blob);

  const alerts: string[] = [];
  if (isElderly && hasAutism && hasCredential) {
    alerts.push(
      "Novel combination detected: elderly + caregiver + professional credentials. Consider the dual-angle primary-equity variant (caregiver_autistic_dependent.v3) for one integrated argument rather than three separate paragraphs.",
    );
  }
  if (hasAutism && hasCredential) {
    alerts.push(
      "Caregiver + professional credentials detected. The dual-angle variant (caregiver_autistic_dependent.v3) fuses the professional expertise and the attachment relationship into a single, stronger equity.",
    );
  } else if (hasAutism) {
    alerts.push(
      "Autistic U.S. citizen dependent detected — prefer the caregiver_autistic_dependent primary-equity variants for Section A.",
    );
  }
  if (hasOwnMedical && hasAutism) {
    alerts.push(
      "Dual vulnerability detected: the applicant's own medical condition plus a caregiver role. Consider an integrated argument covering both.",
    );
  }
  if (hasCommunityLeader) {
    alerts.push(
      "Community-leadership signal detected — the community_service leadership variant and the community-pillar balancing variant elevate this beyond ordinary community ties.",
    );
  }
  return alerts;
}

export const AOS_SECTION_LABELS: Record<AosSectionKey, string> = {
  section_a: "Section A — Primary equity",
  section_d_adverse: "Section D — Adverse factors",
  section_e_balancing: "Section E — Balancing",
};
