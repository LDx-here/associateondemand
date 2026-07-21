/**
 * Per-SKU template structure — required sections, locked boilerplate, export format.
 * Wired into Smart Templates and deliverable catalog cards on /templates.
 */

import { deliverableById } from "./deliverable-catalog";

export type ExportFormat = "memorandum" | "brief" | "letter" | "form" | "citation-package";

export type DeliverableTemplateSpec = {
  deliverableId: string;
  exportFormat: ExportFormat;
  /** Always-present sections (shown as locked boilerplate in apply flow). */
  requiredSections: string[];
  /** Short preview text for expandable locked sections. */
  boilerplatePreviews: Record<string, string>;
  /** Linked smart-template field map id, when interactive apply is available. */
  templateFieldMapId?: string;
  /** Static sample PDF/HTML in web/public/templates/. */
  sampleAssetPath?: string;
  memoHeader?: {
    title: string;
    rePrefix: string;
  };
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
      "Service instructions footer",
    ],
    boilerplatePreviews: {
      "Firm letterhead block":
        "RECOVER MY VALUE, PLLC\n123 Legal Plaza, Suite 400\nDetroit, MI 48226\nTel: (313) 555-0100",
      "Statutory authority / regulatory cite":
        "Pursuant to 8 C.F.R. § 1003.25 and applicable EOIR procedures, the undersigned requests…",
      "Service instructions footer":
        "Please serve responses to the contact below. Failure to respond may result in a motion to compel.",
    },
  },
  {
    deliverableId: "cover-letter",
    exportFormat: "letter",
    templateFieldMapId: "cover-letter",
    requiredSections: ["Letterhead", "Addressee block", "RE line", "Signature block"],
    boilerplatePreviews: {
      "Letterhead": "[Firm name, address, phone — from Firm Memory]",
      "Addressee block": "U.S. Citizenship and Immigration Services\n[Service Center / Field Office]",
      "RE line": "RE: [Client Name], A-Number [#########]",
      "Signature block": "Respectfully submitted,\n\n_________________________\nAttorney Name, Esq.\nBar No. _____",
    },
  },
  {
    deliverableId: "aos-discretionary-brief",
    exportFormat: "brief",
    templateFieldMapId: "aos-discretionary-brief",
    requiredSections: [
      "Caption block",
      "Table of contents",
      "Introduction",
      "Discretionary factors (PM-602-0199)",
      "Conclusion",
      "Certificate of service",
    ],
    boilerplatePreviews: {
      "Caption block": "IN THE MATTER OF\n[Client Name], Respondent\nA-Number: [#########]",
      Introduction:
        "Respondent respectfully submits this memorandum in support of adjustment of status under INA § 245(a).",
      "Discretionary factors (PM-602-0199)":
        "USCIS Policy Memorandum PM-602-0199 (May 21, 2026) — positive and negative discretionary factors.",
      Conclusion: "For the foregoing reasons, Respondent respectfully requests approval of the I-485 application.",
      "Certificate of service": "I hereby certify that a true and correct copy was served on [date].",
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
    boilerplatePreviews: {
      "Cover manifest (PDF index)": "Citation Verification Package — [Matter ID] — generated [date]",
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
    boilerplatePreviews: {
      "MEMORANDUM header (TO/FROM/DATE/RE)":
        "MEMORANDUM\n\nTO:     [Attorney]\nFROM:  Litigation Associate\nDATE:  [Date]\nRE:       [Subject]",
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
    boilerplatePreviews: {
      "Demand paragraph":
        "We represent [Client] regarding injuries sustained on [date]. This letter constitutes a formal demand…",
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
