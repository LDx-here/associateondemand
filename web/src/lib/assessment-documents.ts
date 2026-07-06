import type { DocumentRow, Matter } from "./types";

/** Encoded in Documents.category — no schema migration required. */
export const CASE_ASSESSMENT_CATEGORY = "case_assessment";
export const ASSESSMENT_TEMPLATE_PREFIX = "assessment_template";

export type AssessmentDocumentRole = "case_assessment" | "assessment_template";

export type ParsedDocumentCategory = {
  role: AssessmentDocumentRole | "other";
  practiceArea?: string;
};

export type AssessmentOcrPayload = {
  v: 1;
  documentId: string;
  title: string;
  ocrText?: string;
  facts?: Array<{ fact_type: string; value: string; confidence?: number }>;
  uploadedAt?: string;
};

export const ASSESSMENT_DOCUMENT_NOTE_TYPE = "Assessment Document";

export function encodeAssessmentTemplateCategory(practiceArea: string): string {
  return `${ASSESSMENT_TEMPLATE_PREFIX}:${practiceArea}`;
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
  return { role: "other" };
}

export function isCaseAssessmentDocument(doc: Pick<DocumentRow, "category">): boolean {
  return parseDocumentCategory(doc.category).role === "case_assessment";
}

export function isAssessmentTemplateDocument(doc: Pick<DocumentRow, "category">): boolean {
  return parseDocumentCategory(doc.category).role === "assessment_template";
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

export function formatAssessmentOcrForAgents(payload: AssessmentOcrPayload): string {
  const lines = ["## Case assessment document (uploaded scan)"];
  lines.push(`- Document: ${payload.title}`);
  if (payload.ocrText?.trim()) {
    const preview = payload.ocrText.trim().slice(0, 3000);
    lines.push(`- OCR text:\n${preview}`);
  }
  if (payload.facts?.length) {
    lines.push("- Extracted fields:");
    for (const fact of payload.facts.slice(0, 24)) {
      const val = (fact.value ?? "").trim();
      if (val) lines.push(`  - ${fact.fact_type}: ${val}`);
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
