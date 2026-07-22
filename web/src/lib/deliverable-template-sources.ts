/**
 * Default source metadata for each deliverable SKU — what the live template
 * is based on before a firm uploads a replacement PDF/DOCX.
 */

import type { DeliverableTemplateMetaPayload } from "./assessment-documents";
import { DELIVERABLE_CATALOG, type DeliverableCatalogEntry } from "./deliverable-catalog";
import { getDeliverableTemplateSpec } from "./deliverable-template-specs";
import { getTemplateFieldMapByDeliverable } from "./template-field-maps";
import type { DocumentRow } from "./types";

export type TemplateSourceKind =
  | "constitution_skill"
  | "static_sample"
  | "boilerplate_spec"
  | "firm_uploaded"
  | "scoped_at_intake";

export type DeliverableTemplateSourceInfo = {
  deliverableId: string;
  /** Short label shown on catalog cards. */
  label: string;
  kind: TemplateSourceKind;
  /** Longer explanation for preview modal. */
  detail: string;
  skillDoc?: string;
  sampleAssetPath?: string;
  /** Built-in preview text when no firm file is on file. */
  defaultPreviewText: string;
};

const EXTRA_SOURCES: Record<string, Partial<DeliverableTemplateSourceInfo>> = {
  "aos-discretionary-brief": {
    label: "Drafting SKILL + AOS discretionary framework",
    detail:
      "Based on docs/constitution/05-Drafting-SKILL.md, the AOS discretionary brief DOCX builder, and the Case Assessment Tool workbook (web/public/templates/AOS_Discretionary_Factors_Case_Assessment_Tool.xlsx). Firm uploads replace this default for voice/structure.",
    sampleAssetPath: "/templates/AOS_Discretionary_Factors_Case_Assessment_Tool.xlsx",
  },
  "hearing-packet": {
    label: "Smart template + telephonic records sample",
    detail:
      "Interactive merge-field map (telephonic-records-request). Letterhead + certificate of service from Settings → Firm profile. Default system blank HTML is only shown when no firm DOCX is uploaded — upload replaces it.",
    sampleAssetPath: "/templates/telephonic-records-request.html",
  },
  "cover-letter": {
    label: "Drafting SKILL + cover-letter field map",
    detail:
      "Agent fills letterhead (Firm profile), addressee, RE line, and signature from facts. Source: docs/constitution/05-Drafting-SKILL.md.",
  },
  "research-memo": {
    label: "Research Memo SKILL",
    detail:
      "MEMORANDUM structure (TO/FROM/DATE/RE + Question Presented through Sources). Source: docs/constitution/04-Research-Memo-SKILL.md.",
  },
  "citation-package": {
    label: "Citation Verification SKILL",
    detail:
      "Verified cite bundle + pin-cite table. Source: docs/constitution/08-Citation-Verification-SKILL.md.",
  },
  "mass-audit": {
    label: "Mass Audit SKILL",
    detail: "Batch gap/deadline review. Source: docs/constitution/06-Mass-Audit-SKILL.md.",
  },
  "legal-mapping": {
    label: "Legal Mapping SKILL",
    detail:
      "Maps facts to legal elements. Source: docs/constitution/07-Legal-Mapping-SKILL.md.",
  },
  "custom-motion": {
    label: "Scoped at intake (no firm file yet)",
    kind: "scoped_at_intake",
    detail:
      "Custom tier — first use may include setup labor. Upload a prior motion PDF/DOCX here to set the firm template for this SKU.",
  },
  "demand-letter": {
    label: "Drafting SKILL + demand-letter field map",
    detail:
      "PI demand structure from docs/constitution/05-Drafting-SKILL.md and the demand-letter smart template.",
  },
  "custom-other": {
    label: "Scoped at intake",
    kind: "scoped_at_intake",
    detail: "Describe the deliverable at intake. Upload a sample to pin a reusable template.",
  },
};

function boilerplatePreviewText(deliverableId: string): string {
  const spec = getDeliverableTemplateSpec(deliverableId);
  if (!spec) return "";
  const lines = [
    `# ${deliverableByName(deliverableId)} — built-in structure`,
    "",
    "Required sections:",
    ...spec.requiredSections.map((s) => `- ${s}`),
    "",
  ];
  for (const [section, preview] of Object.entries(spec.boilerplatePreviews)) {
    lines.push(`## ${section}`, preview, "");
  }
  return lines.join("\n").trim();
}

function deliverableByName(id: string): string {
  return DELIVERABLE_CATALOG.find((d) => d.id === id)?.name ?? id;
}

export function defaultSourceForDeliverable(
  entry: DeliverableCatalogEntry,
): DeliverableTemplateSourceInfo {
  const spec = getDeliverableTemplateSpec(entry.id);
  const extra = EXTRA_SOURCES[entry.id] ?? {};
  const hasMap = Boolean(getTemplateFieldMapByDeliverable(entry.id));
  const kind: TemplateSourceKind =
    extra.kind ??
    (spec?.sampleAssetPath || extra.sampleAssetPath
      ? "static_sample"
      : entry.skillDoc
        ? "constitution_skill"
        : hasMap
          ? "boilerplate_spec"
          : "scoped_at_intake");

  const label =
    extra.label ??
    (entry.skillDoc
      ? `Constitution SKILL (${entry.skillDoc.split("/").pop()})`
      : "Scoped at intake");

  return {
    deliverableId: entry.id,
    label,
    kind,
    detail:
      extra.detail ??
      (entry.skillDoc
        ? `Wired to ${entry.skillDoc}. Upload a firm PDF/DOCX to override for drafting voice.`
        : entry.description),
    skillDoc: entry.skillDoc,
    sampleAssetPath: extra.sampleAssetPath ?? spec?.sampleAssetPath,
    defaultPreviewText: boilerplatePreviewText(entry.id) || entry.description,
  };
}

export function allDefaultTemplateSources(): DeliverableTemplateSourceInfo[] {
  return DELIVERABLE_CATALOG.map(defaultSourceForDeliverable);
}

/** Catalog row returned by GET /api/deliverable-templates (safe for client imports). */
export type DeliverableTemplateCatalogItem = {
  deliverableId: string;
  name: string;
  tier: string;
  description: string;
  pricingLabel: string;
  phase0: boolean;
  defaultSource: DeliverableTemplateSourceInfo;
  document: DocumentRow | null;
  meta: DeliverableTemplateMetaPayload | null;
};
