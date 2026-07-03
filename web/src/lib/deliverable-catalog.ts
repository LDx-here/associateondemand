import type { AssignmentTier } from "./types";

export type DeliverableCatalogEntry = {
  id: string;
  name: string;
  tier: AssignmentTier;
  description: string;
  turnaround: string;
  skillDoc?: string;
};

/**
 * Deliverable catalog (BUILD_SPEC marketplace pass §3). Template tier
 * entries have a firm workbook/DOCX template already wired to a drafting
 * SKILL; Custom tier entries need one-time template setup before they can
 * graduate to Template tier; Research tier entries are memo/audit work
 * that is already fully agent-drafted end to end.
 */
export const DELIVERABLE_CATALOG: DeliverableCatalogEntry[] = [
  {
    id: "cover-letter",
    name: "Cover Letter",
    tier: "Template",
    description:
      "Firm cover letter template for a filing package (USCIS, Asylum Office, EOIR, or BIA). Agent fills the template from the facts packet; attorney signs off.",
    turnaround: "Same day once facts are complete",
    skillDoc: "docs/constitution/05-Drafting-SKILL.md",
  },
  {
    id: "aos-discretionary-brief",
    name: "AOS Discretionary Brief",
    tier: "Template",
    description:
      "Adjustment-of-status discretionary factors brief. Complete the AOS Discretionary Factors workbook, then the drafting agent produces a first-pass brief from the Case Assessment tab.",
    turnaround: "1-2 business days",
    skillDoc: "docs/constitution/05-Drafting-SKILL.md",
  },
  {
    id: "citation-package",
    name: "Citation Verification Package",
    tier: "Template",
    description:
      "Verified citation bundle (case cites + pin cites + source links) exported as a ZIP alongside a research memo or brief.",
    turnaround: "Same day",
    skillDoc: "docs/constitution/08-Citation-Verification-SKILL.md",
  },
  {
    id: "research-memo",
    name: "Research Memo",
    tier: "Research",
    description:
      "Full legal research memorandum with a multi-source citation table (gov + practice resources, Midpage/Fastcase when keys are configured). MEMORANDUM header, TO/FROM block, and DOCX export.",
    turnaround: "1-3 business days depending on scope",
    skillDoc: "docs/constitution/04-Research-Memo-SKILL.md",
  },
  {
    id: "mass-audit",
    name: "Mass Case Audit",
    tier: "Research",
    description:
      "Batch review across a matter's documents and legal elements to flag gaps, missing evidence, and approaching deadlines.",
    turnaround: "2-4 business days depending on file volume",
    skillDoc: "docs/constitution/06-Mass-Audit-SKILL.md",
  },
  {
    id: "legal-mapping",
    name: "Legal Mapping Memo",
    tier: "Research",
    description:
      "Maps case facts to each element of the legal standard (e.g., asylum nexus, particular social group) with supporting/undermining facts called out per element.",
    turnaround: "1-2 business days",
    skillDoc: "docs/constitution/07-Legal-Mapping-SKILL.md",
  },
  {
    id: "custom-motion",
    name: "Custom Motion or Brief",
    tier: "Custom",
    description:
      "Novel motion or brief type with no firm template yet (e.g., a first-of-its-kind motion to reopen theory). Setup labor builds the template once; it graduates to Template tier for future matters of the same type.",
    turnaround: "Scoped after intake — setup + execution",
  },
  {
    id: "custom-other",
    name: "Other Custom Deliverable",
    tier: "Custom",
    description:
      "Anything else that doesn't fit an existing template — describe the deliverable in the facts field and PM will scope it during pickup.",
    turnaround: "Scoped after intake",
  },
];

export function deliverableById(id: string): DeliverableCatalogEntry | undefined {
  return DELIVERABLE_CATALOG.find((d) => d.id === id);
}
