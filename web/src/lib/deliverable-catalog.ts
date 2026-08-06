import type { AssignmentTier } from "./types";

import {
  applySampleDiscount,
  formatSampleDiscountNote,
  SAMPLE_DISCOUNT_PERCENT,
} from "./practice-area-facts";

export type DeliverablePricing = {
  /** Flat-fee range in USD (Monetization Strategy). */
  minUsd: number;
  maxUsd: number;
  /**
   * Entry-specific advisory unrelated to *who* is billed (e.g. a first-of-kind
   * setup surcharge). Shown alongside the contextual billing note in both the
   * internal and partner-facing flows.
   */
  advisory?: string;
  /**
   * Partner-facing billing framing ("quoted flat fee for partner firm...").
   * Only accurate when a genuine third-party firm is submitting work via
   * `/partner/submit` — use `billingNoteFor()` rather than reading this
   * directly so internal, single-attorney usage doesn't inherit it.
   */
  note?: string;
  /** Whether intake can apply sample prior-work discount. */
  sampleDiscountEligible?: boolean;
  /** Percent off when sample provided (default 20). */
  sampleDiscountPercent?: number;
};

/** Partner firms are quoted flat fees; RMV invoices off-platform (operator dashboard does not checkout). */
export const PARTNER_FIRM_BILLING_NOTE =
  "Quoted flat fee for partner firm — invoiced off-platform. RMV does not pay through this dashboard.";

/**
 * Internal assignment intake / template catalog copy — the attorney is
 * dispatching agents on her own matter, not being billed by (or invoicing
 * through) a marketplace. Pricing shown here is a scope reference, not a
 * charge that runs through this dashboard.
 */
export const INTERNAL_ASSIGNMENT_BILLING_NOTE =
  "Reference pricing for your own case tracking — this dashboard does not bill or invoice through it.";

/** @deprecated use PARTNER_FIRM_BILLING_NOTE or billingNoteForPartnerFirm() */
export const PHASE0_BILLING_NOTE_OFFLINE = PARTNER_FIRM_BILLING_NOTE;

/** @deprecated use PARTNER_FIRM_BILLING_NOTE */
export const PHASE0_BILLING_NOTE = PARTNER_FIRM_BILLING_NOTE;

/** @deprecated partner-only framing — use billingNoteFor(entry, isPartnerSubmission) so internal screens don't inherit "partner firm" language. */
export function billingNoteForPartnerFirm(): string {
  return PARTNER_FIRM_BILLING_NOTE;
}

/** @deprecated use billingNoteForPartnerFirm() — stripeConfigured ignored (no operator checkout). */
export function billingNoteForStripe(_stripeConfigured?: boolean): string {
  return PARTNER_FIRM_BILLING_NOTE;
}

/**
 * Billing copy for a catalog entry, aware of which flow is rendering it.
 * `/partner/submit` (a genuine outside firm) keeps the partner-invoicing
 * framing; the internal `/assignments/new` and `/templates` surfaces (the
 * attorney's own system) get honest "this is just a reference" copy instead.
 */
export function billingNoteFor(
  entry: Pick<DeliverableCatalogEntry, "pricing">,
  isPartnerSubmission: boolean,
): string {
  const advisory = entry.pricing?.advisory ? `${entry.pricing.advisory} ` : "";
  const contextNote = isPartnerSubmission
    ? entry.pricing?.note ?? PARTNER_FIRM_BILLING_NOTE
    : INTERNAL_ASSIGNMENT_BILLING_NOTE;
  return `${advisory}${contextNote}`;
}

/** Phase 0 launch SKUs — immigration brief, motion, hearing packet, research upsell, PI demand letter. */
export const PHASE0_LAUNCH_SKU_IDS = [
  "aos-discretionary-brief",
  "custom-motion",
  "hearing-packet",
  "research-memo",
  "demand-letter",
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
      "Adjustment-of-status discretionary factors brief. Upload the completed case assessment on the matter Documents tab (or fill quick facts), then the drafting agent produces a first-pass brief.",
    turnaround: "1-2 business days",
    skillDoc: "docs/constitution/05-Drafting-SKILL.md",
    pricing: {
      minUsd: 750,
      maxUsd: 1500,
      note: PHASE0_BILLING_NOTE_OFFLINE,
      sampleDiscountEligible: true,
      sampleDiscountPercent: SAMPLE_DISCOUNT_PERCENT,
    },
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
    pricing: {
      minUsd: 500,
      maxUsd: 900,
      note: PHASE0_BILLING_NOTE_OFFLINE,
      sampleDiscountEligible: true,
      sampleDiscountPercent: SAMPLE_DISCOUNT_PERCENT,
    },
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
    pricing: {
      minUsd: 500,
      maxUsd: 1250,
      note: PHASE0_BILLING_NOTE_OFFLINE,
      sampleDiscountEligible: true,
      sampleDiscountPercent: SAMPLE_DISCOUNT_PERCENT,
    },
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
      advisory: "Setup surcharge may apply on first use of a new motion type.",
      note: PHASE0_BILLING_NOTE_OFFLINE,
      sampleDiscountEligible: true,
      sampleDiscountPercent: SAMPLE_DISCOUNT_PERCENT,
    },
  },
  {
    id: "demand-letter",
    name: "Demand Letter",
    tier: "Template",
    description:
      "Personal injury demand letter to carrier or opposing party. Agent drafts from incident, liability, injury, and damages facts; attorney signs off.",
    turnaround: "1–2 business days",
    skillDoc: "docs/constitution/05-Drafting-SKILL.md",
    pricing: {
      minUsd: 400,
      maxUsd: 800,
      note: PARTNER_FIRM_BILLING_NOTE,
      sampleDiscountEligible: true,
      sampleDiscountPercent: SAMPLE_DISCOUNT_PERCENT,
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

/** Practice area for catalog browse / filter on `/templates`. */
export type CatalogPracticeArea = "immigration" | "personal_injury" | "other";

const PI_DELIVERABLE_IDS = new Set(["demand-letter"]);
const OTHER_DELIVERABLE_IDS = new Set(["custom-other"]);

export function practiceAreaForDeliverable(id: string): CatalogPracticeArea {
  if (PI_DELIVERABLE_IDS.has(id)) return "personal_injury";
  if (OTHER_DELIVERABLE_IDS.has(id)) return "other";
  return "immigration";
}

export function catalogPracticeAreaLabel(area: CatalogPracticeArea): string {
  if (area === "immigration") return "Immigration";
  if (area === "personal_injury") return "Personal injury";
  return "Other";
}

export const CATALOG_PRACTICE_AREAS: CatalogPracticeArea[] = [
  "immigration",
  "personal_injury",
  "other",
];

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
export function formatPricingRange(pricing: DeliverablePricing, withSampleDiscount = false): string {
  if (withSampleDiscount && pricing.sampleDiscountEligible) {
    const pct = pricing.sampleDiscountPercent ?? SAMPLE_DISCOUNT_PERCENT;
    const min = applySampleDiscount(pricing.minUsd, pct);
    const max = applySampleDiscount(pricing.maxUsd, pct);
    if (min === max) return `${formatUsd(min)} (${pct}% sample discount)`;
    return `${formatUsd(min)}–${formatUsd(max)} (${pct}% sample discount)`;
  }
  if (pricing.minUsd === pricing.maxUsd) return formatUsd(pricing.minUsd);
  return `${formatUsd(pricing.minUsd)}–${formatUsd(pricing.maxUsd)}`;
}

export function isSampleDiscountEligible(entry: DeliverableCatalogEntry): boolean {
  return Boolean(entry.pricing?.sampleDiscountEligible);
}

export function sampleDiscountNote(entry: DeliverableCatalogEntry): string | null {
  if (!isSampleDiscountEligible(entry)) return null;
  return formatSampleDiscountNote(entry.pricing?.sampleDiscountPercent);
}

/** Price + turnaround for catalog cards and intake, e.g. "$750–$1,500 · 1–2 business days". */
export function formatCatalogQuote(entry: DeliverableCatalogEntry): string {
  if (entry.pricing) return `${formatPricingRange(entry.pricing)} · ${entry.turnaround}`;
  return entry.turnaround;
}
