/**
 * Deliverable / template catalog (autonomous pass 2026-07-02, priority #3
 * of docs/runbooks/autonomous-agent-pass.md).
 *
 * Backs the assignment intake form (`/assignments/new`) and the template
 * catalog page (`/templates`). Mirrors the "usage tiers (template labor
 * model)" section of CHECKPOINT.md's product vision:
 *
 *   1. Template tier   — firm workbook / DOCX template exists; agent fills
 *                         from facts, attorney approves.
 *   2. Research tier    — memo / audit / mapping deliverables already wired
 *                         through specialist agents + citation packages.
 *   3. Custom tier      — no template yet; billable as setup + execution.
 *
 * This is a static, code-only catalog (no Airtable table) so it ships
 * without any live-base dependency. Keep entries in sync with
 * `docs/constitution/05-Drafting-SKILL.md`, `06-Mass-Audit-SKILL.md`, and
 * `07-Legal-Mapping-SKILL.md` when those change.
 */

export type DeliverableTier = "template" | "research" | "custom";

export type TemplateCatalogEntry = {
  id: string;
  name: string;
  tier: DeliverableTier;
  status: "ready" | "needs-setup";
  agent: string;
  description: string;
  commandExample?: string;
  skillDoc?: string;
  companionAsset?: string;
};

export const TEMPLATE_CATALOG: TemplateCatalogEntry[] = [
  {
    id: "aos-discretionary-brief",
    name: "AOS discretionary factors brief",
    tier: "template",
    status: "ready",
    agent: "Drafting",
    description:
      "Full I-485 discretionary factors memorandum (PM-602-0199 / 1 USCIS-PM E.8 structure). Auto-runs citation verification and builds a citation package.",
    commandExample: "draft aos discretionary brief for AOD-1001",
    skillDoc: "docs/constitution/05-Drafting-SKILL.md",
    companionAsset: "data/templates/AOS_Discretionary_Factors_Case_Assessment_Tool.xlsx",
  },
  {
    id: "brief-section",
    name: "Brief section / memorandum in support",
    tier: "template",
    status: "ready",
    agent: "Drafting",
    description: "Targeted argument section or memorandum in support, with citations, for an existing filing.",
    commandExample: "draft brief section on nexus for AOD-1002",
    skillDoc: "docs/constitution/05-Drafting-SKILL.md",
  },
  {
    id: "cover-letter",
    name: "Cover letter",
    tier: "template",
    status: "ready",
    agent: "Drafting",
    description: "Filing transmittal letter or client update letter (no PII beyond what the attorney provides).",
    commandExample: "draft cover letter for AOD-1003 filing",
    skillDoc: "docs/constitution/05-Drafting-SKILL.md",
  },
  {
    id: "general-memo",
    name: "Internal / strategy memo",
    tier: "template",
    status: "ready",
    agent: "Drafting",
    description: "Internal case-update or strategy memo using the firm MEMORANDUM header.",
    commandExample: "draft strategy memo for AOD-1001",
    skillDoc: "docs/constitution/05-Drafting-SKILL.md",
  },
  {
    id: "research-memo",
    name: "Research memo",
    tier: "research",
    status: "ready",
    agent: "Research",
    description:
      "Multi-source legal research memo with source documentation table. Falls back to gov + practice-resource tier and flags MANUAL FLAG when Midpage/Fastcase keys are absent.",
    commandExample: "pm:research Sixth Circuit asylum standard for AOD-1001",
    skillDoc: "docs/constitution/04-Research-Memo-SKILL.md",
  },
  {
    id: "mass-audit",
    name: "Mass matter audit",
    tier: "research",
    status: "ready",
    agent: "Mass audit",
    description: "Batch review of a matter (or firm-wide snapshot) for missing deadlines, assessment gaps, and stale tasks.",
    commandExample: "mass audit AOD-1001",
    skillDoc: "docs/constitution/06-Mass-Audit-SKILL.md",
  },
  {
    id: "legal-mapping",
    name: "Legal element mapping",
    tier: "research",
    status: "ready",
    agent: "Legal mapping",
    description: "Maps known facts to required legal elements for the matter's relief type; feeds Case Assessment.",
    commandExample: "legal mapping elements for AOD-1001",
    skillDoc: "docs/constitution/07-Legal-Mapping-SKILL.md",
  },
  {
    id: "citation-package",
    name: "Citation verification package",
    tier: "research",
    status: "ready",
    agent: "Drafting",
    description: "Manifest + REF PDFs for every matched public source cited in a brief or memo. Usually attached to an AOS brief request.",
    commandExample: "build citation package for AOD-1001 memo",
    skillDoc: "docs/constitution/08-Citation-Verification-SKILL.md",
  },
  {
    id: "motion",
    name: "Motion (reopen / bond / continuance)",
    tier: "custom",
    status: "needs-setup",
    agent: "Drafting",
    description:
      "Motion drafting has no firm-standard template yet — the drafting agent falls back to the general memo structure. Billable as template setup + execution on first use.",
    commandExample: "draft motion to reopen for AOD-1004",
    skillDoc: "docs/constitution/05-Drafting-SKILL.md",
  },
  {
    id: "custom-other",
    name: "Other / custom deliverable",
    tier: "custom",
    status: "needs-setup",
    agent: "Unassigned",
    description: "No matching template. Describe the deliverable in the facts field; the attorney will scope custom-tier setup + execution labor before assigning.",
  },
];

export function findTemplate(id: string): TemplateCatalogEntry | undefined {
  return TEMPLATE_CATALOG.find((t) => t.id === id);
}

export function templatesByTier(tier: DeliverableTier): TemplateCatalogEntry[] {
  return TEMPLATE_CATALOG.filter((t) => t.tier === tier);
}

export const TIER_LABELS: Record<DeliverableTier, string> = {
  template: "Template tier",
  research: "Research / audit tier",
  custom: "Custom tier",
};

export const TIER_DESCRIPTIONS: Record<DeliverableTier, string> = {
  template: "Firm template exists. Agent fills from facts; attorney approves.",
  research: "Memo, audit, or mapping deliverable already wired through a specialist agent.",
  custom: "No template yet. Billable as one-time setup + execution, then reusable at template tier.",
};
