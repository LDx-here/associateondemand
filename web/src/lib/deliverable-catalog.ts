import type { AssignmentTier } from "./types";

export type DeliverablePricing = {
  /** Flat-fee range in USD (Monetization Strategy). */
  minUsd: number;
  maxUsd: number;
  note?: string;
};

/** Phase 0 B2B overflow launch SKUs — immigration brief, motion, hearing packet, research upsell. */
export const PHASE0_LAUNCH_SKU_IDS = [
  "aos-discretionary-brief",
  "custom-motion",
  "hearing-packet",
  "research-memo",
] as const;

export type Phase0LaunchSkuId = (typeof PHASE0_LAUNCH_SKU_IDS)[number];

export type DeliverableCatalogEntry = {
  id: string;
  name: string;
  tier: AssignmentTier;
  description: string;
  turnaround: string;
  skillDoc?: string;
  pricing?: DeliverablePricing;
};

/**
 * Deliverable catalog (BUILD_SPEC marketplace pass §3). Template tier
 * entries have a firm workbook/DOCX template already wired to a drafting
 * SKILL; Custom tier entries need one-time template setup before they can
 * graduate to Template tier; Research tier entries are memo/audit work
 * that is already fully agent-drafted end to end.
 *
 * Phase 0 launch SKUs: `aos-discretionary-brief` (hero), `custom-motion`,
 * `hearing-packet`, and `research-memo` (upsell). Pricing ranges follow
 * docs/strategy/AssociateOnDemand_Monetization_Strategy.md; surfaced on
 * `/templates` and `/assignments/new`.
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
    pricing: { minUsd: 750, maxUsd: 1500 },
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
    pricing: { minUsd: 500, maxUsd: 900 },
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
    id: "hearing-packet",
    name: "Hearing Packet / Exhibit Organization",
    tier: "Template",
    description:
      "Organize exhibits, hearing binders, and supporting documents for immigration or trial hearings. Agent compiles from your fact packet and attachments; attorney verifies index, pagination, and filing compliance.",
    turnaround: "1–2 business days",
    skillDoc: "docs/constitution/05-Drafting-SKILL.md",
    pricing: { minUsd: 500, maxUsd: 1250 },
  },
  {
    id: "custom-motion",
    name: "Motion or Short Filing",
    tier: "Custom",
    description:
      "Standard motions and procedural filings (e.g., motion to reopen, continuance, or short brief). Setup labor may apply for a first-of-its-kind motion type; recurring motion types graduate to Template tier.",
    turnaround: "1–3 business days",
    pricing: {
      minUsd: 250,
      maxUsd: 450,
      note: "Setup surcharge may apply on first use of a new motion type.",
    },
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

export function isPhase0LaunchSku(id: string): id is Phase0LaunchSkuId {
  return (PHASE0_LAUNCH_SKU_IDS as readonly string[]).includes(id);
}

function formatUsd(amount: number): string {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

/** Client-facing flat-fee range, e.g. "$750–$1,500". */
export function formatPricingRange(pricing: DeliverablePricing): string {
  if (pricing.minUsd === pricing.maxUsd) return formatUsd(pricing.minUsd);
  return `${formatUsd(pricing.minUsd)}–${formatUsd(pricing.maxUsd)}`;
}

/** Price + turnaround for catalog cards and intake, e.g. "$750–$1,500 · 1–2 business days". */
export function formatCatalogQuote(entry: DeliverableCatalogEntry): string {
  if (entry.pricing) return `${formatPricingRange(entry.pricing)} · ${entry.turnaround}`;
  return entry.turnaround;
}
