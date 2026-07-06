/**
 * Practice-area guided fact intake — structured JSON saved to Notes (type Facts)
 * and merged into agent dispatch context alongside freeform text.
 */

export type PracticeAreaId = "immigration" | "personal_injury" | "generic";

export type FactFieldKind = "text" | "textarea" | "date" | "checkboxes";

export type FactFieldDef = {
  id: string;
  label: string;
  hint?: string;
  kind: FactFieldKind;
  required?: boolean;
  /** For checkbox groups — option labels. */
  options?: string[];
};

export type DraftingFactsPayload = {
  v: 1;
  practiceArea: PracticeAreaId;
  caseType?: string;
  fields: Record<string, string | string[]>;
  additionalNotes?: string;
  updatedAt?: string;
};

export const DRAFTING_FACTS_NOTE_TYPE = "Facts";

const IMMIGRATION_FIELDS: FactFieldDef[] = [
  {
    id: "clientStatus",
    label: "Current immigration status",
    hint: "e.g. pending asylum, out of status, TPS, lawful permanent resident",
    kind: "text",
    required: true,
  },
  {
    id: "reliefSought",
    label: "Relief or outcome sought",
    hint: "e.g. AOS approval, asylum grant, cancellation of removal",
    kind: "text",
    required: true,
  },
  {
    id: "entryDate",
    label: "Date of entry to the U.S.",
    kind: "date",
    required: true,
  },
  {
    id: "priorityDate",
    label: "Priority date (if applicable)",
    kind: "date",
  },
  {
    id: "adverseFactors",
    label: "Adverse factors or derogatory information",
    hint: "Criminal history, prior denials, unlawful presence — or “none known”",
    kind: "textarea",
  },
  {
    id: "supportingDocs",
    label: "Supporting documents on file or needed",
    kind: "checkboxes",
    options: [
      "Passport or national ID",
      "I-94 / entry record",
      "Prior USCIS or court filings",
      "Country conditions evidence",
      "Medical or psychological records",
      "Affidavits or declarations",
      "Court or BIA orders",
    ],
  },
];

const PI_FIELDS: FactFieldDef[] = [
  {
    id: "incidentDate",
    label: "Date of incident",
    kind: "date",
    required: true,
  },
  {
    id: "liabilityTheory",
    label: "Who is at fault and why",
    hint: "Brief liability theory — e.g. rear-end collision, negligent maintenance",
    kind: "textarea",
    required: true,
  },
  {
    id: "injuries",
    label: "Injuries claimed",
    kind: "textarea",
    required: true,
  },
  {
    id: "treatmentSummary",
    label: "Treatment so far",
    hint: "Providers, procedures, ongoing care",
    kind: "textarea",
  },
  {
    id: "damagesSketch",
    label: "Damages overview",
    hint: "Medical bills, lost wages, pain and suffering — rough numbers OK",
    kind: "textarea",
  },
];

export function resolvePracticeArea(caseType: string): PracticeAreaId {
  const lower = (caseType || "").toLowerCase();
  if (
    lower.includes("immigration") ||
    lower.includes("asylum") ||
    lower.includes("adjustment") ||
    lower.includes("cancellation") ||
    lower.includes("uscis") ||
    lower.includes("removal")
  ) {
    return "immigration";
  }
  if (
    lower.includes("personal injury") ||
    lower.includes("pi ") ||
    lower.includes("auto") ||
    lower.includes("slip") ||
    lower.includes("negligen")
  ) {
    return "personal_injury";
  }
  return "generic";
}

export function fieldsForPracticeArea(area: PracticeAreaId): FactFieldDef[] {
  if (area === "immigration") return IMMIGRATION_FIELDS;
  if (area === "personal_injury") return PI_FIELDS;
  return [];
}

export function emptyDraftingFacts(matterId: string, caseType: string): DraftingFactsPayload {
  const practiceArea = resolvePracticeArea(caseType);
  const fields: Record<string, string | string[]> = {};
  for (const def of fieldsForPracticeArea(practiceArea)) {
    fields[def.id] = def.kind === "checkboxes" ? [] : "";
  }
  return {
    v: 1,
    practiceArea,
    caseType,
    fields,
    additionalNotes: "",
    updatedAt: new Date().toISOString(),
  };
}

function fieldFilled(value: string | string[] | undefined): boolean {
  if (Array.isArray(value)) return value.length > 0;
  return Boolean(value?.trim());
}

export function draftingFactsCompleteness(
  payload: DraftingFactsPayload,
): { filled: number; total: number; percent: number } {
  const defs = fieldsForPracticeArea(payload.practiceArea);
  if (defs.length === 0) {
    const notes = payload.additionalNotes?.trim() ?? "";
    return { filled: notes ? 1 : 0, total: 1, percent: notes ? 100 : 0 };
  }
  const keyDefs = defs.filter((d) => d.required || d.kind !== "checkboxes");
  const total = keyDefs.length;
  let filled = 0;
  for (const def of keyDefs) {
    if (fieldFilled(payload.fields[def.id])) filled += 1;
  }
  const percent = total === 0 ? 0 : Math.round((filled / total) * 100);
  return { filled, total, percent };
}

export function parseDraftingFactsNote(content: string, matterId: string, caseType: string): DraftingFactsPayload | null {
  const trimmed = content.trim();
  if (!trimmed) return null;
  try {
    const parsed = JSON.parse(trimmed) as Partial<DraftingFactsPayload>;
    if (parsed.v !== 1 || !parsed.practiceArea) return null;
    const base = emptyDraftingFacts(matterId, caseType);
    return {
      ...base,
      ...parsed,
      v: 1,
      fields: { ...base.fields, ...(parsed.fields ?? {}) },
    };
  } catch {
    return null;
  }
}

export function serializeDraftingFacts(payload: DraftingFactsPayload): string {
  return JSON.stringify({ ...payload, updatedAt: new Date().toISOString() });
}

const FIELD_LABELS: Record<string, string> = {};
for (const def of [...IMMIGRATION_FIELDS, ...PI_FIELDS]) {
  FIELD_LABELS[def.id] = def.label;
}

/** Human-readable block for PM dispatch and assignment intake notes. */
export function formatDraftingFactsForPrompt(payload: DraftingFactsPayload | null | undefined): string {
  if (!payload) return "";
  const defs = fieldsForPracticeArea(payload.practiceArea);
  const lines: string[] = ["## Structured facts for drafting"];
  if (payload.caseType) lines.push(`- Practice area: ${payload.caseType}`);
  for (const def of defs) {
    const val = payload.fields[def.id];
    if (!fieldFilled(val)) continue;
    if (Array.isArray(val)) {
      lines.push(`- ${def.label}: ${val.join("; ")}`);
    } else {
      lines.push(`- ${def.label}: ${String(val).trim()}`);
    }
  }
  if (payload.additionalNotes?.trim()) {
    lines.push(`- Additional notes: ${payload.additionalNotes.trim()}`);
  }
  return lines.length > 1 ? lines.join("\n") : "";
}

/** Merge structured + freeform facts into one narrative for agents. */
export function mergeFactsForDispatch(
  structured: DraftingFactsPayload | null | undefined,
  freeform: string,
): string {
  const parts: string[] = [];
  const block = formatDraftingFactsForPrompt(structured);
  if (block) parts.push(block);
  const trimmed = freeform.trim();
  if (trimmed) {
    parts.push(trimmed.startsWith("##") ? trimmed : `## Attorney fact summary\n${trimmed}`);
  }
  return parts.join("\n\n").trim();
}

export function isDraftingFactsCompleteEnough(
  structured: DraftingFactsPayload | null | undefined,
  freeform: string,
  minFreeform = 20,
): boolean {
  const merged = mergeFactsForDispatch(structured, freeform);
  if (merged.length >= minFreeform) return true;
  if (!structured) return false;
  const { filled, total } = draftingFactsCompleteness(structured);
  return total > 0 && filled >= Math.min(3, total);
}
