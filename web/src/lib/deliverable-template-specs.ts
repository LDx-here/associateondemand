/**
 * Per-SKU template structure — required sections, built-in vs firm-editable blocks, export format.
 * Wired into Smart Templates and deliverable catalog cards on /templates.
 *
 * Product model (eImmigration / TXDocs-style):
 * - Firm uploads master DOCX → structure + {{merge_fields}} detected
 * - Matter facts fill fields → draft in that format
 * - Built-in sections are default system outline until firm replaces
 */

import { deliverableById } from "./deliverable-catalog";
import { DEFAULT_CERTIFICATE_OF_SERVICE, LETTERHEAD_EMPTY_HINT } from "./firm-letterhead";

export type ExportFormat = "memorandum" | "brief" | "letter" | "form" | "citation-package";

/** Why a section appears locked / labeled in the apply UI. */
export type SectionLockKind =
  /** Default system outline — replace via firm DOCX upload. */
  | "built_in_structure"
  /** Firm letterhead / certificate — edit in Settings → Firm profile. */
  | "firm_editable"
  /** Statutory / SKILL framing — preserve wording; not freeform invent. */
  | "skill_preserve";

export type DeliverableTemplateSpec = {
  deliverableId: string;
  exportFormat: ExportFormat;
  /** Always-present sections (shown in apply flow with lock kind). */
  requiredSections: string[];
  /** Short preview text for expandable sections. */
  boilerplatePreviews: Record<string, string>;
  /** Per-section lock metadata for UI transparency. */
  sectionLockKinds?: Record<string, SectionLockKind>;
  /** Linked smart-template field map id, when interactive apply is available. */
  templateFieldMapId?: string;
  /**
   * Static sample PDF/HTML in web/public/templates/.
   * Only shown as "default system blank" when no firm DOCX is on file.
   */
  sampleAssetPath?: string;
  memoHeader?: {
    title: string;
    rePrefix: string;
  };
};

export const SECTION_LOCK_LABELS: Record<SectionLockKind, string> = {
  built_in_structure: "Built-in structure (editable via Firm Memory / Replace template)",
  firm_editable: "Firm profile — edit in Settings → Firm profile",
  skill_preserve: "Preserve from firm template / SKILL (not freeform invent)",
};

export const DELIVERABLE_TEMPLATE_SPECS: DeliverableTemplateSpec[] = [
  {
    deliverableId: "hearing-packet",
    exportFormat: "form",
    templateFieldMapId: "telephonic-records-request",
    sampleAssetPath: "/templates/telephonic-records-request.html",
    requiredSections: [
      "Firm letterhead block",
      "Statutory authority / regulatory cite",
      "Certificate of service",
    ],
    sectionLockKinds: {
      "Firm letterhead block": "firm_editable",
      "Statutory authority / regulatory cite": "skill_preserve",
      "Certificate of service": "firm_editable",
    },
    boilerplatePreviews: {
      "Firm letterhead block": `[${LETTERHEAD_EMPTY_HINT}]`,
      "Statutory authority / regulatory cite":
        "Pursuant to 8 C.F.R. § 1003.25 and applicable EOIR procedures, the undersigned requests…",
      "Certificate of service": DEFAULT_CERTIFICATE_OF_SERVICE,
    },
  },
  {
    deliverableId: "cover-letter",
    exportFormat: "letter",
    templateFieldMapId: "cover-letter",
    requiredSections: ["Letterhead", "Addressee block", "RE line", "Signature block"],
    sectionLockKinds: {
      Letterhead: "firm_editable",
      "Addressee block": "built_in_structure",
      "RE line": "built_in_structure",
      "Signature block": "firm_editable",
    },
    boilerplatePreviews: {
      Letterhead: `[${LETTERHEAD_EMPTY_HINT}]`,
      "Addressee block": "U.S. Citizenship and Immigration Services\n[Service Center / Field Office]",
      "RE line": "RE: {{client_name}}, A-Number {{a_number}}",
      "Signature block":
        "Respectfully submitted,\n\n_________________________\n{{attorney_name}}\n{{bar_number}}",
    },
  },
  {
    deliverableId: "aos-discretionary-brief",
    exportFormat: "brief",
    templateFieldMapId: "aos-discretionary-brief",
    requiredSections: [
      "Conclusion (opening)",
      "Rule",
      "Explanation",
      "Analysis",
      "Conclusion (closing)",
      "Certificate of service",
    ],
    sectionLockKinds: {
      "Conclusion (opening)": "built_in_structure",
      Rule: "skill_preserve",
      Explanation: "skill_preserve",
      Analysis: "built_in_structure",
      "Conclusion (closing)": "built_in_structure",
      "Certificate of service": "firm_editable",
    },
    boilerplatePreviews: {
      "Conclusion (opening)":
        "For the reasons below, Respondent respectfully requests that USCIS grant adjustment of status as a matter of discretion.",
      Rule:
        "[PRESERVE from firm template] INA §245(a) / PM-602-0199 / Matter of Marin — totality of the circumstances.",
      Explanation:
        "[PRESERVE from firm template] Meeting statutory eligibility alone does not entitle the applicant to adjustment; USCIS weighs equities under administrative grace.",
      Analysis:
        "[FILL with matter facts] {{qualifying_relative}}, {{hardship_facts}}, {{positive_equities}}, {{adverse_factors}} mapped to the Rule.",
      "Conclusion (closing)":
        "For the foregoing reasons, Respondent respectfully requests approval of the I-485 application.",
      "Certificate of service": DEFAULT_CERTIFICATE_OF_SERVICE,
    },
    memoHeader: {
      title: "MEMORANDUM IN SUPPORT OF ADJUSTMENT OF STATUS",
      rePrefix: "Adjustment of Status (I-485) — Discretionary Factors",
    },
  },
  {
    deliverableId: "citation-package",
    exportFormat: "citation-package",
    requiredSections: [
      "Cover manifest (PDF index)",
      "Verified source PDFs",
      "Pin cite table",
      "Attorney attestation",
    ],
    sectionLockKinds: {
      "Cover manifest (PDF index)": "built_in_structure",
      "Verified source PDFs": "built_in_structure",
      "Pin cite table": "built_in_structure",
      "Attorney attestation": "skill_preserve",
    },
    boilerplatePreviews: {
      "Cover manifest (PDF index)": "Citation Verification Package — {{matter_id}} — generated {{date}}",
      "Verified source PDFs": "One PDF per cited authority with highlighted pin cites.",
      "Pin cite table": "| Cite | Source | Pin | Status |",
      "Attorney attestation":
        "I have reviewed each citation in the draft and confirm accuracy to the best of my knowledge.",
    },
  },
  {
    deliverableId: "research-memo",
    exportFormat: "memorandum",
    requiredSections: [
      "MEMORANDUM header (TO/FROM/DATE/RE)",
      "I. Question Presented",
      "II. Brief Answer",
      "III. Facts",
      "IV. Analysis",
      "V. Source documentation table",
      "VI. Conclusion",
    ],
    sectionLockKinds: {
      "MEMORANDUM header (TO/FROM/DATE/RE)": "built_in_structure",
      "I. Question Presented": "built_in_structure",
      "II. Brief Answer": "built_in_structure",
      "III. Facts": "built_in_structure",
      "IV. Analysis": "built_in_structure",
      "V. Source documentation table": "built_in_structure",
      "VI. Conclusion": "built_in_structure",
    },
    boilerplatePreviews: {
      "MEMORANDUM header (TO/FROM/DATE/RE)":
        "MEMORANDUM\n\nTO:     [Attorney]\nFROM:  Litigation Associate\nDATE:  {{date}}\nRE:       [Subject]",
    },
    memoHeader: {
      title: "MEMORANDUM",
      rePrefix: "Legal Research",
    },
  },
  {
    deliverableId: "demand-letter",
    exportFormat: "letter",
    templateFieldMapId: "demand-letter",
    requiredSections: ["Letterhead", "Demand paragraph", "Damages summary", "Deadline / response"],
    sectionLockKinds: {
      Letterhead: "firm_editable",
      "Demand paragraph": "built_in_structure",
      "Damages summary": "built_in_structure",
      "Deadline / response": "built_in_structure",
    },
    boilerplatePreviews: {
      Letterhead: `[${LETTERHEAD_EMPTY_HINT}]`,
      "Demand paragraph":
        "We represent {{client_name}} regarding injuries sustained on [date]. This letter constitutes a formal demand…",
      "Damages summary": "Medical expenses, lost wages, pain and suffering — itemized schedule attached.",
      "Deadline / response": "Please respond within [30] days to avoid litigation.",
    },
  },
];

export function getDeliverableTemplateSpec(deliverableId: string): DeliverableTemplateSpec | undefined {
  return DELIVERABLE_TEMPLATE_SPECS.find((s) => s.deliverableId === deliverableId);
}

export function specForTemplateFieldMap(templateMapId: string): DeliverableTemplateSpec | undefined {
  return DELIVERABLE_TEMPLATE_SPECS.find((s) => s.templateFieldMapId === templateMapId);
}

export function lockKindForSection(
  spec: DeliverableTemplateSpec | undefined,
  section: string,
): SectionLockKind {
  return spec?.sectionLockKinds?.[section] ?? "built_in_structure";
}

/** Human-readable includes line for catalog cards. */
export function formatSpecIncludes(spec: DeliverableTemplateSpec, max = 4): string {
  const parts = spec.requiredSections.slice(0, max);
  const extra = spec.requiredSections.length - parts.length;
  const joined = parts.join(", ");
  return extra > 0 ? `${joined}, +${extra} more` : joined;
}

export function catalogEntryWithSpec(deliverableId: string) {
  const entry = deliverableById(deliverableId);
  const spec = getDeliverableTemplateSpec(deliverableId);
  return { entry, spec };
}
