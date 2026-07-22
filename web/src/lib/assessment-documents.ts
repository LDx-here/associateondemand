import type { FactFieldDef } from "./practice-area-facts";
import { fieldsForDeliverable, resolvePracticeArea } from "./practice-area-facts";
import type { DocumentRow, Matter } from "./types";

/** Encoded in Documents.category — no schema migration required. */
export const CASE_ASSESSMENT_CATEGORY = "case_assessment";
export const ASSESSMENT_TEMPLATE_PREFIX = "assessment_template";
export const FIRM_SAMPLE_PREFIX = "firm_sample";
export const DELIVERABLE_TEMPLATE_PREFIX = "deliverable_template";
export const DELIVERABLE_TEMPLATE_NOTE_TYPE = "Deliverable Template Meta";

export type AssessmentDocumentRole =
  | "case_assessment"
  | "assessment_template"
  | "firm_sample"
  | "deliverable_template";

export type ParsedDocumentCategory = {
  role: AssessmentDocumentRole | "other";
  practiceArea?: string;
  deliverableId?: string;
};

/** JSON payload stored on FIRM-TEMPLATES notes (type Deliverable Template Meta). */
export type DeliverableTemplateSection = {
  id: string;
  label: string;
  role: string;
  contentExcerpt: string;
  order: number;
};

export type DeliverableTemplateMetaPayload = {
  v: 1;
  deliverableId: string;
  role: "deliverable_template";
  source: string;
  version: number;
  title: string;
  airtableDocumentId?: string;
  postgresDocumentId?: string;
  filename?: string;
  fileType?: string;
  textPreview?: string;
  /** Parsed outline (CREAC / headings) from firm upload. */
  sections?: DeliverableTemplateSection[];
  /** Simple HTML preview for DOCX (no PDF conversion). */
  htmlPreview?: string;
  tweakNotes?: string;
  uploadedAt?: string;
};

export type ExtractedFactRecord = {
  id?: string;
  fact_type: string;
  /** Human-readable label from LLM enrichment (preferred over fact_type in UI). */
  label?: string;
  value: string;
  confidence?: number;
  context?: string;
  /** Attorney-reviewed value; falls back to `value` when unset. */
  editedValue?: string;
  verified?: boolean;
  verifiedBy?: string;
  verifiedAt?: string;
  /** Maps to practice-area-facts field id when known. */
  fieldId?: string;
  /** Primary legal element name from enrichment pass. */
  legalElement?: string;
  legalElementId?: string;
  /** One-line explanation of how the fact supports the element. */
  elementFit?: string;
  enriched?: boolean;
};

export type AssessmentOcrPayload = {
  v: 1;
  documentId: string;
  title: string;
  ocrText?: string;
  facts?: ExtractedFactRecord[];
  uploadedAt?: string;
  /** Pipeline OCR confidence (not fact accuracy). */
  ocrConfidence?: number;
  practiceArea?: string;
  deliverableId?: string;
  enrichmentStatus?: "heuristic_only" | "enriched" | "failed";
  enrichmentWarning?: string;
  enrichmentSummary?: string;
};

export type CaseAssessmentElementRow = {
  fieldId: string;
  label: string;
  feedsSection?: string;
  extractedValue?: string;
  attorneyValue?: string;
  status: "verified" | "needs_review" | "missing" | "manual";
};

export const ASSESSMENT_DOCUMENT_NOTE_TYPE = "Assessment Document";

export function encodeAssessmentTemplateCategory(practiceArea: string): string {
  return `${ASSESSMENT_TEMPLATE_PREFIX}:${practiceArea}`;
}

/** Document type for Firm Memory samples — not everything is a "brief". */
export type FirmSampleDocType = "brief" | "motion" | "letter" | "form" | "other";

export const FIRM_SAMPLE_DOC_TYPE_LABELS: Record<FirmSampleDocType, string> = {
  brief: "Brief / memorandum",
  motion: "Motion / filing",
  letter: "Letter / cover letter",
  form: "Form / request sheet",
  other: "Other",
};

export function encodeFirmSampleCategory(practiceArea: string, docType?: FirmSampleDocType): string {
  if (docType && docType !== "other") {
    return `${FIRM_SAMPLE_PREFIX}:${practiceArea}:${docType}`;
  }
  return `${FIRM_SAMPLE_PREFIX}:${practiceArea}`;
}

export function encodeDeliverableTemplateCategory(deliverableId: string): string {
  return `${DELIVERABLE_TEMPLATE_PREFIX}:${deliverableId}`;
}

export function parseDocumentCategory(category: string): ParsedDocumentCategory {
  const normalized = (category ?? "").trim();
  if (!normalized) return { role: "other" };
  if (normalized === CASE_ASSESSMENT_CATEGORY || normalized === "Case Assessment") {
    return { role: "case_assessment" };
  }
  if (normalized.startsWith(`${ASSESSMENT_TEMPLATE_PREFIX}:`)) {
    return {
      role: "assessment_template",
      practiceArea: normalized.slice(ASSESSMENT_TEMPLATE_PREFIX.length + 1),
    };
  }
  if (normalized.startsWith(`${FIRM_SAMPLE_PREFIX}:`)) {
    const rest = normalized.slice(FIRM_SAMPLE_PREFIX.length + 1);
    const [practiceArea] = rest.split(":");
    return {
      role: "firm_sample",
      practiceArea: practiceArea || rest,
    };
  }
  if (normalized.startsWith(`${DELIVERABLE_TEMPLATE_PREFIX}:`)) {
    return {
      role: "deliverable_template",
      deliverableId: normalized.slice(DELIVERABLE_TEMPLATE_PREFIX.length + 1),
    };
  }
  return { role: "other" };
}

export function isCaseAssessmentDocument(doc: Pick<DocumentRow, "category">): boolean {
  return parseDocumentCategory(doc.category).role === "case_assessment";
}

export function isAssessmentTemplateDocument(doc: Pick<DocumentRow, "category">): boolean {
  return parseDocumentCategory(doc.category).role === "assessment_template";
}

export function isFirmSampleDocument(doc: Pick<DocumentRow, "category">): boolean {
  return parseDocumentCategory(doc.category).role === "firm_sample";
}

export function isDeliverableTemplateDocument(doc: Pick<DocumentRow, "category">): boolean {
  return parseDocumentCategory(doc.category).role === "deliverable_template";
}

export function parseDeliverableTemplateMeta(raw: string): DeliverableTemplateMetaPayload | null {
  try {
    const data = JSON.parse(raw) as DeliverableTemplateMetaPayload;
    if (data?.v === 1 && data.deliverableId && data.role === "deliverable_template") {
      return data;
    }
  } catch {
    return null;
  }
  return null;
}

export function serializeDeliverableTemplateMeta(payload: DeliverableTemplateMetaPayload): string {
  return JSON.stringify(payload);
}

export function practiceAreaFromCaseType(caseType: string): string {
  const lower = caseType.toLowerCase();
  if (lower.includes("immigration") || lower.includes("asylum") || lower.includes("aos")) {
    return "immigration";
  }
  if (
    lower.includes("personal injury") ||
    lower.includes("pi ") ||
    lower.includes("motor vehicle") ||
    lower.includes("med mal")
  ) {
    return "personal_injury";
  }
  return "general";
}

export function practiceAreaLabel(area: string): string {
  if (area === "immigration") return "Immigration";
  if (area === "personal_injury") return "Personal injury";
  return "General";
}

export function findCaseAssessmentDocument(documents: DocumentRow[]): DocumentRow | null {
  const matches = documents.filter(isCaseAssessmentDocument);
  if (!matches.length) return null;
  return [...matches].sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))[0];
}

export function findAssessmentTemplate(
  templates: DocumentRow[],
  practiceArea: string,
): DocumentRow | null {
  const matches = templates.filter((doc) => {
    const parsed = parseDocumentCategory(doc.category);
    return parsed.role === "assessment_template" && parsed.practiceArea === practiceArea;
  });
  if (!matches.length) return null;
  return [...matches].sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))[0];
}

export function serializeAssessmentOcrPayload(payload: AssessmentOcrPayload): string {
  return JSON.stringify(payload);
}

export function parseAssessmentOcrPayload(raw: string): AssessmentOcrPayload | null {
  try {
    const data = JSON.parse(raw) as AssessmentOcrPayload;
    if (data?.v === 1 && data.documentId) return data;
  } catch {
    return null;
  }
  return null;
}

export function factDisplayLabel(fact: ExtractedFactRecord): string {
  const label = fact.label?.trim();
  if (label) return label;
  return fact.fact_type.replace(/_/g, " ");
}

export function factDisplayValue(fact: ExtractedFactRecord): string {
  const edited = fact.editedValue?.trim();
  if (edited) return edited;
  return (fact.value ?? "").trim();
}

export function normalizeExtractedFacts(
  facts: ExtractedFactRecord[] | undefined,
): ExtractedFactRecord[] {
  return (facts ?? []).map((fact, index) => ({
    ...fact,
    id: fact.id ?? `${fact.fact_type}-${index}`,
    value: fact.value ?? "",
  }));
}

export function buildExtractionContext(input: {
  practiceArea: string;
  caseType: string;
  deliverableId?: string;
  legalElements?: string[];
}): Record<string, unknown> {
  const area = resolvePracticeArea(input.caseType);
  const defs = fieldsForDeliverable(input.deliverableId, area);
  return {
    practice_area: input.practiceArea,
    case_type: input.caseType,
    deliverable_id: input.deliverableId,
    document_category: CASE_ASSESSMENT_CATEGORY,
    legal_elements: input.legalElements ?? [],
    fact_field_hints: defs.map((d) => ({
      id: d.id,
      label: d.label,
      feedsSection: d.feedsSection,
      required: Boolean(d.required),
    })),
  };
}

export function buildCaseAssessmentSummaryRows(input: {
  payload: AssessmentOcrPayload | null;
  caseType: string;
  deliverableId?: string;
  draftingFields?: Record<string, string | string[]>;
}): CaseAssessmentElementRow[] {
  const area = resolvePracticeArea(input.caseType);
  const defs = fieldsForDeliverable(input.deliverableId ?? input.payload?.deliverableId, area);
  const facts = normalizeExtractedFacts(input.payload?.facts);
  const byFieldId = new Map<string, ExtractedFactRecord>();
  for (const fact of facts) {
    if (fact.fieldId) byFieldId.set(fact.fieldId, fact);
  }

  return defs.map((def) => {
    const matched = byFieldId.get(def.id) ?? matchFactToField(def, facts, input.payload?.ocrText);
    const attorneyRaw = input.draftingFields?.[def.id];
    const attorneyValue = Array.isArray(attorneyRaw)
      ? attorneyRaw.join("; ")
      : typeof attorneyRaw === "string"
        ? attorneyRaw.trim()
        : "";

    if (attorneyValue) {
      return {
        fieldId: def.id,
        label: def.label,
        feedsSection: def.feedsSection,
        attorneyValue,
        extractedValue: matched ? factDisplayValue(matched) : undefined,
        status: "manual",
      };
    }

    if (matched) {
      const val = factDisplayValue(matched);
      return {
        fieldId: def.id,
        label: def.label,
        feedsSection: def.feedsSection,
        extractedValue: val,
        status: matched.verified ? "verified" : val ? "needs_review" : "missing",
      };
    }

    return {
      fieldId: def.id,
      label: def.label,
      feedsSection: def.feedsSection,
      status: "missing",
    };
  });
}

function matchFactToField(
  def: FactFieldDef,
  facts: ExtractedFactRecord[],
  ocrText?: string,
): ExtractedFactRecord | undefined {
  const labelLower = def.label.toLowerCase();
  for (const fact of facts) {
    if (fact.fieldId === def.id) return fact;
    const ctx = `${fact.context ?? ""} ${fact.value} ${fact.editedValue ?? ""}`.toLowerCase();
    if (ctx.includes(labelLower.slice(0, Math.min(12, labelLower.length)))) return fact;
  }
  if (ocrText?.trim()) {
    const idx = ocrText.toLowerCase().indexOf(labelLower.slice(0, 10));
    if (idx >= 0) {
      const snippet = ocrText.slice(idx, idx + 180).trim();
      if (snippet.length > 8) {
        return {
          id: `ocr-${def.id}`,
          fact_type: def.id,
          value: snippet,
          fieldId: def.id,
          verified: false,
        };
      }
    }
  }
  return undefined;
}

export function groupFactsByLegalElement(
  facts: ExtractedFactRecord[],
): { element: string; facts: ExtractedFactRecord[] }[] {
  const groups = new Map<string, ExtractedFactRecord[]>();
  for (const fact of facts) {
    const key = fact.legalElement?.trim() || "Unmapped facts";
    const list = groups.get(key) ?? [];
    list.push(fact);
    groups.set(key, list);
  }
  return [...groups.entries()].map(([element, grouped]) => ({ element, facts: grouped }));
}

export function elementFactCounts(
  facts: ExtractedFactRecord[],
): { element: string; count: number; verified: number }[] {
  const counts = new Map<string, { count: number; verified: number }>();
  for (const fact of facts) {
    const key = fact.legalElement?.trim() || factDisplayLabel(fact);
    const row = counts.get(key) ?? { count: 0, verified: 0 };
    row.count += 1;
    if (fact.verified) row.verified += 1;
    counts.set(key, row);
  }
  return [...counts.entries()].map(([element, stats]) => ({ element, ...stats }));
}

export function formatAssessmentOcrForAgents(payload: AssessmentOcrPayload): string {
  const lines = ["## Case assessment document (uploaded scan)"];
  lines.push(`- Document: ${payload.title}`);
  if (payload.ocrText?.trim()) {
    const preview = payload.ocrText.trim().slice(0, 3000);
    lines.push(`- OCR text:\n${preview}`);
  }
  if (payload.facts?.length) {
    lines.push("- Extracted fields (attorney-verified values preferred):");
    for (const fact of payload.facts.slice(0, 24)) {
      const val = factDisplayValue(fact);
      if (!val) continue;
      const tag = fact.verified ? " [verified]" : " [needs review]";
      const label = factDisplayLabel(fact);
      const element = fact.legalElement ? ` → ${fact.legalElement}` : "";
      lines.push(`  - ${label}: ${val}${element}${tag}`);
    }
  }
  return lines.length > 1 ? lines.join("\n") : "";
}

/** Firm-wide templates are stored against this pseudo matter id in demo/Airtable. */
export const FIRM_TEMPLATE_MATTER_ID = "FIRM-TEMPLATES";

export function defaultTemplateHref(practiceArea: string): string | null {
  if (practiceArea === "immigration") {
    return "/templates/AOS_Discretionary_Factors_Case_Assessment_Tool.xlsx";
  }
  return null;
}

export function matterPracticeArea(matter: Pick<Matter, "caseType">): string {
  return practiceAreaFromCaseType(matter.caseType ?? "");
}
