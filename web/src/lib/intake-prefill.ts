/**
 * Intelligent Intake Engine v3 — guidance messages, OCR prefill mapping,
 * and missing-fact detection (Phase 2).
 */

import { deliverableById } from "./deliverable-catalog";
import {
  deliverableFactGuideTitle,
  draftingFactsCompleteness,
  emptyDraftingFacts,
  fieldsForDeliverable,
  resolvePracticeArea,
  type DraftingFactsPayload,
  type FactFieldDef,
} from "./practice-area-facts";

export type OcrFact = { fact_type: string; value: string; confidence?: number; context?: string };

export type IntakeGuidanceMessage = {
  id: string;
  role: "assistant" | "system";
  text: string;
  fieldIds?: string[];
  tone?: "info" | "success" | "warning";
};

const DATE_PATTERNS = [
  /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+\d{1,2},?\s+\d{4}\b/gi,
  /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g,
  /\b\d{4}-\d{2}-\d{2}\b/g,
];

const A_NUMBER_PATTERN = /\bA\d{8,9}\b/g;

function fieldFilled(value: string | string[] | undefined): boolean {
  if (Array.isArray(value)) return value.length > 0;
  return Boolean(value?.trim());
}

/** Lightweight port of Fly fact_extraction_agent heuristics for client-side preview. */
export function extractHeuristicFactsFromText(text: string): OcrFact[] {
  if (!text.trim()) return [];
  const facts: OcrFact[] = [];
  const seen = new Set<string>();

  function add(fact_type: string, value: string, confidence = 0.7, context = "") {
    const key = `${fact_type}:${value.trim().toLowerCase()}`;
    if (!value.trim() || seen.has(key)) return;
    seen.add(key);
    facts.push({ fact_type, value: value.trim(), confidence, context: context.slice(0, 300) });
  }

  for (const pattern of DATE_PATTERNS) {
    for (const match of text.matchAll(pattern)) {
      const idx = match.index ?? 0;
      add("date", match[0], 0.78, text.slice(Math.max(0, idx - 60), idx + match[0].length + 60));
    }
  }

  for (const match of text.matchAll(A_NUMBER_PATTERN)) {
    const idx = match.index ?? 0;
    add("a_number", match[0], 0.9, text.slice(Math.max(0, idx - 40), idx + match[0].length + 40));
  }

  const lower = text.toLowerCase();
  const eventKeywords: Record<string, string[]> = {
    hearing: ["hearing", "master calendar", "individual hearing"],
    interview: ["asylum interview", "credible fear", "interview"],
    filing: ["filed", "petition", "application submitted"],
    removal: ["removal", "deportation", "nta", "notice to appear"],
  };
  for (const [eventType, keywords] of Object.entries(eventKeywords)) {
    for (const kw of keywords) {
      const idx = lower.indexOf(kw);
      if (idx >= 0) {
        add("event", eventType, 0.65, text.slice(Math.max(0, idx - 50), idx + kw.length + 80));
        break;
      }
    }
  }

  if (/hardship|extreme hardship/i.test(text)) {
    const m = text.match(/(?:extreme hardship|hardship)[^.]{0,200}/i);
    if (m) add("hardship_narrative", m[0].trim(), 0.72);
  }
  if (/212\s*\(\s*a\s*\)/i.test(text) || /inadmissib/i.test(text)) {
    const m = text.match(/(?:INA\s*)?§?\s*212\s*\([^)]+\)[^.]{0,120}/i);
    add("inadmissibility", m?.[0]?.trim() ?? "INA §212(a) grounds referenced in document", 0.7);
  }
  if (/qualifying relative|u\.s\. citizen spouse|lpr spouse/i.test(text)) {
    const m = text.match(/(?:qualifying relative|U\.S\. citizen|LPR)[^.]{0,120}/i);
    if (m) add("qualifying_relative", m[0].trim(), 0.68);
  }
  if (/discretionary|positive factor|negative factor|equit/i.test(text)) {
    if (/positive|community service|rehabilitation|tax compliance/i.test(text)) {
      add("positive_equities", "Positive discretionary factors referenced in uploaded document", 0.6);
    }
    if (/criminal|denial|unlawful presence|misrepresentation/i.test(text)) {
      add("adverse_factors", "Potential adverse factors referenced in uploaded document", 0.6);
    }
  }

  return facts.slice(0, 50);
}

function mapFactToFieldId(
  fact: OcrFact,
  defs: FactFieldDef[],
  deliverableId?: string,
): string | null {
  const ctx = `${fact.context ?? ""} ${fact.value}`.toLowerCase();
  const type = fact.fact_type.toLowerCase();

  if (type === "hardship_narrative" && defs.some((d) => d.id === "extremeHardshipFactors")) {
    return "extremeHardshipFactors";
  }
  if (type === "inadmissibility" && defs.some((d) => d.id === "inadmissibilityGrounds")) {
    return "inadmissibilityGrounds";
  }
  if (type === "qualifying_relative" && defs.some((d) => d.id === "qualifyingRelative")) {
    return "qualifyingRelative";
  }
  if (type === "positive_equities" && defs.some((d) => d.id === "positiveEquities")) {
    return "positiveEquities";
  }
  if (type === "adverse_factors" && defs.some((d) => d.id === "adverseFactors")) {
    return "adverseFactors";
  }

  if (type === "date") {
    if (/hearing|calendar|court/i.test(ctx) && defs.some((d) => d.id === "hearingDate")) {
      return "hearingDate";
    }
    if (/entry|entered|i-94|border/i.test(ctx) && defs.some((d) => d.id === "entryDate")) {
      return "entryDate";
    }
    if (/incident|collision|accident/i.test(ctx) && defs.some((d) => d.id === "incidentDate")) {
      return "incidentDate";
    }
    if (/priority/i.test(ctx) && defs.some((d) => d.id === "priorityDate")) {
      return "priorityDate";
    }
    if (deliverableId === "hearing-packet" && defs.some((d) => d.id === "hearingDate")) {
      return "hearingDate";
    }
  }

  if (type === "event" && fact.value === "hearing" && defs.some((d) => d.id === "hearingType")) {
    return "hearingType";
  }

  if (/research question|legal question/i.test(ctx) && defs.some((d) => d.id === "researchQuestion")) {
    return "researchQuestion";
  }

  return null;
}

/** Merge OCR / assessment facts into a drafting-facts payload without overwriting attorney edits. */
export function mergeOcrIntoDraftingFacts(
  payload: DraftingFactsPayload,
  ocrFacts: OcrFact[],
  ocrText?: string,
): { payload: DraftingFactsPayload; filledFieldIds: string[] } {
  const defs = fieldsForDeliverable(payload.deliverableId, payload.practiceArea);
  const filledFieldIds: string[] = [];
  const fields = { ...payload.fields };

  const allFacts = [...ocrFacts];
  if (ocrText?.trim()) {
    allFacts.push(...extractHeuristicFactsFromText(ocrText));
  }

  for (const fact of allFacts) {
    const fieldId = mapFactToFieldId(fact, defs, payload.deliverableId);
    if (!fieldId) continue;
    const def = defs.find((d) => d.id === fieldId);
    if (!def) continue;
    if (fieldFilled(fields[fieldId])) continue;

    if (def.kind === "checkboxes" && def.options) {
      const match = def.options.find((opt) =>
        `${fact.value} ${fact.context ?? ""}`.toLowerCase().includes(opt.toLowerCase().slice(0, 12)),
      );
      if (match) {
        fields[fieldId] = [match];
        filledFieldIds.push(fieldId);
      }
    } else if (def.kind === "textarea") {
      const existing = typeof fields[fieldId] === "string" ? fields[fieldId] : "";
      fields[fieldId] = existing ? existing : fact.value;
      if (!existing) filledFieldIds.push(fieldId);
    } else {
      fields[fieldId] = fact.value;
      filledFieldIds.push(fieldId);
    }
  }

  return {
    payload: { ...payload, fields, updatedAt: new Date().toISOString() },
    filledFieldIds,
  };
}

export function detectMissingCriticalFacts(
  payload: DraftingFactsPayload | null | undefined,
  deliverableId?: string,
): FactFieldDef[] {
  if (!payload) return [];
  const defs = fieldsForDeliverable(deliverableId ?? payload.deliverableId, payload.practiceArea);
  return defs.filter((def) => def.required && !fieldFilled(payload.fields[def.id]));
}

export function buildIntakeGuidanceMessages(input: {
  deliverableId?: string;
  deliverableName?: string;
  caseType: string;
  structuredFacts?: DraftingFactsPayload | null;
  ocrPrefillCount?: number;
}): IntakeGuidanceMessage[] {
  const { deliverableId, deliverableName, caseType, structuredFacts, ocrPrefillCount = 0 } = input;
  const guideTitle = deliverableFactGuideTitle(deliverableId) ?? deliverableName ?? "this deliverable";
  const defs = fieldsForDeliverable(
    deliverableId,
    structuredFacts?.practiceArea ?? resolvePracticeArea(caseType),
  );
  const messages: IntakeGuidanceMessage[] = [];

  if (!deliverableId || deliverableId === "custom-other-free-text") {
    messages.push({
      id: "pick-deliverable",
      role: "assistant",
      text: "Select a deliverable type and I'll walk you through the facts RMV needs for a complete first draft.",
      tone: "info",
    });
    return messages;
  }

  const required = defs.filter((d) => d.required);
  const sectionList = required
    .slice(0, 6)
    .map((d) => (d.feedsSection ? `${d.label} → ${d.feedsSection}` : d.label))
    .join("; ");

  messages.push({
    id: "intro",
    role: "assistant",
    text: `I see you're requesting ${guideTitle}. For ${caseType}, I'll need ${required.length} key fact${required.length === 1 ? "" : "s"}${sectionList ? `: ${sectionList}` : "."}`,
    tone: "info",
  });

  if (ocrPrefillCount > 0) {
    messages.push({
      id: "ocr-prefill",
      role: "system",
      text: `Strong Reader pre-filled ${ocrPrefillCount} checklist field${ocrPrefillCount === 1 ? "" : "s"} from your upload — please verify before submitting.`,
      tone: "success",
    });
  }

  const missing = detectMissingCriticalFacts(structuredFacts ?? null, deliverableId);
  if (missing.length > 0 && structuredFacts) {
    messages.push({
      id: "missing",
      role: "assistant",
      text: `Still needed before submit: ${missing.map((d) => d.label).join(", ")}.`,
      fieldIds: missing.map((d) => d.id),
      tone: "warning",
    });
  } else if (structuredFacts && required.length > 0) {
    const { percent } = draftingFactsCompleteness(structuredFacts, deliverableId);
    if (percent >= 80) {
      messages.push({
        id: "ready",
        role: "assistant",
        text: "Checklist looks strong — add a freeform note if anything is nuanced, then acknowledge the disclaimer to submit.",
        tone: "success",
      });
    }
  }

  return messages;
}

export function seedDraftingFactsFromMatter(
  matterId: string,
  caseType: string,
  deliverableId?: string,
  existing?: DraftingFactsPayload | null,
): DraftingFactsPayload {
  if (existing?.v === 1) {
    return {
      ...existing,
      deliverableId: deliverableId ?? existing.deliverableId,
      caseType: existing.caseType ?? caseType,
    };
  }
  return emptyDraftingFacts(matterId, caseType, deliverableId);
}

export function deliverableDisplayName(deliverableId?: string): string {
  if (!deliverableId) return "Custom deliverable";
  return deliverableById(deliverableId)?.name ?? deliverableId;
}
