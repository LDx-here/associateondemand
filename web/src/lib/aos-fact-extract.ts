/**
 * AOS discretionary brief — extract structured drafting facts from attorney paste summary.
 * Heuristic path runs client-side; LLM path via POST /api/aos/extract-facts → Fly API.
 */

import {
  emptyDraftingFacts,
  type DraftingFactsPayload,
} from "./practice-area-facts";
import { mergeOcrIntoDraftingFacts, type OcrFact } from "./intake-prefill";

export type AosExtractResult = {
  fields: Record<string, string>;
  paragraphSelections: Record<string, string>;
  additionalNotes: string;
  confidence: "high" | "medium" | "low";
  extractionMode: "llm" | "heuristic";
  llmAvailable: boolean;
  llmFallback?: boolean;
};

const AOS_FIELD_IDS = [
  "applicantName",
  "aNumber",
  "clientStatus",
  "entryDate",
  "portOfEntry",
  "entryVisaType",
  "petitionerName",
  "petitionerRelationship",
  "qualifyingRelative",
  "i130ApprovedDate",
  "i485FiledDate",
  "reliefSought",
  "caseTheme",
  "caseThemeBrief",
  "sectionAHeading",
  "sectionAFacts",
  "sectionBHeading",
  "sectionBFacts",
  "adverseHeading",
  "adverseFactorBrief",
  "positiveEquities",
  "balancingInventory",
  "adverseFacts",
  "adverseFactors",
  "departureHarm",
  "extremeHardshipFactors",
  "inadmissibilityGrounds",
  "priorFilings",
] as const;

const DATE_PATTERNS = [
  /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+\d{1,2},?\s+\d{4}\b/gi,
  /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g,
  /\b\d{4}-\d{2}-\d{2}\b/g,
];

function firstDateNear(text: string, keywords: string[]): string {
  const lower = text.toLowerCase();
  for (const kw of keywords) {
    const idx = lower.indexOf(kw);
    if (idx < 0) continue;
    const window = text.slice(Math.max(0, idx - 80), idx + kw.length + 120);
    for (const pattern of DATE_PATTERNS) {
      pattern.lastIndex = 0;
      const match = pattern.exec(window);
      if (match) return match[0].trim();
    }
  }
  return "";
}

function matchGroup(pattern: RegExp, text: string): string {
  const match = text.match(pattern);
  return match?.[1]?.trim() ?? "";
}

/** Deterministic extract — no API key required. */
export function heuristicExtractAosFacts(summary: string): AosExtractResult {
  const text = summary.trim();
  const fields: Record<string, string> = Object.fromEntries(AOS_FIELD_IDS.map((id) => [id, ""]));

  if (!text) {
    return {
      fields,
      paragraphSelections: {},
      additionalNotes: "",
      confidence: "low",
      extractionMode: "heuristic",
      llmAvailable: false,
    };
  }

  const aNum = text.match(/\bA-?\d{8,9}\b/i);
  if (aNum) fields.aNumber = aNum[0].toUpperCase();

  fields.entryDate = firstDateNear(text, ["entry", "entered", "arrival", "i-94", "port of entry"]);
  fields.i130ApprovedDate = firstDateNear(text, ["i-130", "i130", "petition approved"]);
  fields.i485FiledDate = firstDateNear(text, ["i-485", "i485", "filed adjustment"]);

  fields.portOfEntry = matchGroup(
    /(?:port of entry|POE|entered (?:at|through))\s*[:\-]?\s*([A-Za-z\s,]+?)(?:\.|,|\n|$)/i,
    text,
  );
  fields.entryVisaType = matchGroup(
    /(?:visa type|entered on|admitted as)\s*[:\-]?\s*((?:B-?\d|F-?\d|H-?\d|[A-Z]-?\d)[^\n,.]{0,40})/i,
    text,
  );

  fields.applicantName = matchGroup(
    /(?:applicant|client|beneficiary)(?:'s)?\s*(?:name)?\s*[:\-]?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/,
    text,
  );
  fields.petitionerName = matchGroup(
    /(?:petitioner|sponsor|usc\s+citizen)\s*[:\-]?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})/i,
    text,
  );

  const relMatch = text.match(
    /(?:relationship|petitioner is)\s*[:\-]?\s*(daughter|son|spouse|parent|mother|father|sibling)/i,
  );
  fields.petitionerRelationship = relMatch?.[1] ?? "";

  if (/hardship|extreme hardship/i.test(text)) {
    const m = text.match(/(?:extreme hardship|hardship)[^.]{0,400}\./i);
    fields.extremeHardshipFactors = (m?.[0] ?? "Hardship factors referenced in summary").trim();
  }
  if (/overstay|out of status/i.test(text)) {
    fields.clientStatus = "Out of status / overstay";
    const m = text.match(/(?:overstay|out of status)[^.]{0,300}\./i);
    fields.adverseFacts = (m?.[0] ?? "Overstay referenced in summary").trim();
    fields.adverseFactorBrief = "an overstay";
  }
  if (/autism|IEP|disabilit|special needs/i.test(text)) {
    const m = text.match(/(?:autism|IEP|disabilit|special needs)[^.]{0,400}\./i);
    if (m) fields.sectionAFacts = m[0].trim();
  }
  if (/positive|equit|family ties|community|tax compliance/i.test(text)) {
    const m = text.match(/(?:positive|equit|family ties|community)[^.]{0,300}\./i);
    fields.positiveEquities = (m?.[0] ?? "Positive equities referenced").trim();
  }
  if (/212\s*\(\s*a\s*\)|inadmissib/i.test(text)) {
    const m = text.match(/(?:INA\s*)?§?\s*212\s*\([^)]+\)[^.]{0,160}/i);
    fields.inadmissibilityGrounds = (m?.[0] ?? "INA §212(a) grounds referenced").trim();
  }
  if (/depart|consular processing|10.?year|3.?year bar/i.test(text)) {
    const m = text.match(/(?:depart|consular|bar|separat)[^.]{0,300}\./i);
    fields.departureHarm = (m?.[0] ?? "Departure harm referenced").trim();
  }

  fields.reliefSought = "Favorable exercise of discretion and approval of Form I-485";

  const filled = Object.values(fields).filter((v) => v.trim()).length;
  const confidence: AosExtractResult["confidence"] =
    filled >= 8 ? "medium" : filled >= 3 ? "low" : "low";

  return {
    fields,
    paragraphSelections: {},
    additionalNotes: "",
    confidence,
    extractionMode: "heuristic",
    llmAvailable: false,
  };
}

export function applyAosExtractToPayload(
  payload: DraftingFactsPayload,
  extract: AosExtractResult,
  options?: { overwrite?: boolean },
): { payload: DraftingFactsPayload; filledFieldIds: string[] } {
  const overwrite = options?.overwrite ?? false;
  const fields = { ...payload.fields };
  const filledFieldIds: string[] = [];

  for (const [key, value] of Object.entries(extract.fields)) {
    if (!value.trim()) continue;
    const current = fields[key];
    const hasValue = Array.isArray(current) ? current.length > 0 : Boolean(String(current ?? "").trim());
    if (hasValue && !overwrite) continue;
    fields[key] = value;
    filledFieldIds.push(key);
  }

  const paragraphSelections = { ...(payload.paragraphSelections ?? {}) };
  for (const [key, value] of Object.entries(extract.paragraphSelections)) {
    if (value) paragraphSelections[key] = value;
  }

  const additionalNotes = extract.additionalNotes.trim()
    ? [payload.additionalNotes, extract.additionalNotes].filter(Boolean).join("\n\n").trim()
    : payload.additionalNotes;

  return {
    payload: {
      ...payload,
      fields,
      paragraphSelections,
      additionalNotes,
      updatedAt: new Date().toISOString(),
    },
    filledFieldIds,
  };
}

/** Also fold generic OCR heuristics into AOS checklist fields. */
export function mergeSummaryIntoAosFacts(
  matterId: string,
  caseType: string,
  summary: string,
  existing?: DraftingFactsPayload | null,
): { payload: DraftingFactsPayload; filledFieldIds: string[] } {
  const base = existing ?? emptyDraftingFacts(matterId, caseType, "aos-discretionary-brief");
  const heuristic = heuristicExtractAosFacts(summary);
  const { payload: afterAos, filledFieldIds: aosFilled } = applyAosExtractToPayload(base, heuristic);

  const ocrFacts: OcrFact[] = [];
  const { payload, filledFieldIds: ocrFilled } = mergeOcrIntoDraftingFacts(afterAos, ocrFacts, summary);

  return {
    payload,
    filledFieldIds: [...new Set([...aosFilled, ...ocrFilled])],
  };
}

export async function extractAosFactsFromSummary(
  summary: string,
): Promise<AosExtractResult & { error?: string }> {
  try {
    const resp = await fetch("/api/aos/extract-facts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ summary }),
    });
    const data = (await resp.json()) as AosExtractResult & { error?: string };
    if (!resp.ok) {
      const fallback = heuristicExtractAosFacts(summary);
      return { ...fallback, error: data.error ?? "Extract API failed — used heuristic mode." };
    }
    return data;
  } catch {
    return heuristicExtractAosFacts(summary);
  }
}
