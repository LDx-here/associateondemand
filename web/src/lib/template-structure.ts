/**
 * Parse firm template text into structural outline (headings / CREAC).
 * Mirrors services/api/app/services/template_structure.py for client preview.
 */

export type CreacRole =
  | "conclusion"
  | "rule"
  | "explanation"
  | "analysis"
  | "conclusion_close"
  | "introduction"
  | "caption"
  | "other";

export type TemplateSection = {
  id: string;
  label: string;
  role: CreacRole;
  contentExcerpt: string;
  order: number;
  classification?: string;
  slots?: Array<{
    slot_type?: string;
    label?: string;
    replacement_key?: string;
    required?: boolean;
    matched_text?: string;
  }>;
};

const CREAC_PATTERNS: Array<{ re: RegExp; role: CreacRole }> = [
  { re: /^\s*(i+\.?\s+)?conclusion\b/i, role: "conclusion" },
  { re: /^\s*(v+\.?\s+)?conclusion\b/i, role: "conclusion" },
  { re: /^\s*(ii+\.?\s+)?(legal\s+)?standard\b/i, role: "rule" },
  { re: /^\s*(ii+\.?\s+)?rule\b/i, role: "rule" },
  { re: /^\s*(applicable\s+)?law\b/i, role: "rule" },
  { re: /^\s*(iii+\.?\s+)?explanation\b/i, role: "explanation" },
  { re: /^\s*(discussion\s+of\s+(the\s+)?law|legal\s+framework)\b/i, role: "explanation" },
  { re: /^\s*(iv+\.?\s+)?(argument|analysis|application|discussion)\b/i, role: "analysis" },
  { re: /^\s*(totality|discretionary\s+factors|positive\s+equities)\b/i, role: "analysis" },
  { re: /^\s*(i+\.?\s+)?introduction\b/i, role: "introduction" },
  { re: /^\s*(caption|in\s+the\s+matter\s+of)\b/i, role: "caption" },
  { re: /^\s*(certificate\s+of\s+service|table\s+of\s+contents)\b/i, role: "other" },
];

const NUMBERED_HEADING =
  /^\s*((?:[IVXLC]+\.|[A-Z]\.|§?\d+(?:\.\d+)*\.?|[0-9]+(?:\.[0-9]+)*\.?)\s+)(.{3,120})$/;
const ALL_CAPS_HEADING = /^[A-Z0-9][A-Z0-9\s\-–—,.'()]{2,100}$/;
const MARKDOWN_HEADING = /^#{1,3}\s+(.+)$/;

function slug(label: string, order: number): string {
  const base =
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "section";
  return `${base}-${order}`;
}

export function detectCreacRole(label: string): CreacRole {
  const cleaned = (label || "").trim();
  const stripped = cleaned.replace(/^(?:[IVXLC]+\.|[A-Z]\.|§?\d+(?:\.\d+)*\.?)\s*/i, "");
  for (const { re, role } of CREAC_PATTERNS) {
    if (re.test(stripped) || re.test(cleaned)) return role;
  }
  return "other";
}

function isHeadingLine(line: string): boolean {
  const text = line.trim();
  if (!text || text.length > 140) return false;
  if (MARKDOWN_HEADING.test(text) || text.startsWith("## ") || text.startsWith("# ")) return true;
  if (NUMBERED_HEADING.test(text)) return true;
  if (ALL_CAPS_HEADING.test(text) && text.includes(" ") && !text.endsWith(".")) {
    const letters = [...text].filter((c) => /[a-zA-Z]/.test(c));
    if (letters.length >= 4 && letters.every((c) => c === c.toUpperCase())) return true;
  }
  if (detectCreacRole(text) !== "other" && text.split(/\s+/).length <= 8) return true;
  return false;
}

function headingLabel(line: string): string {
  const text = line.trim();
  const md = text.match(MARKDOWN_HEADING);
  if (md?.[1]) return md[1].trim();
  if (text.startsWith("## ")) return text.slice(3).trim();
  if (text.startsWith("# ")) return text.slice(2).trim();
  return text;
}

export function parseTemplateStructure(
  text: string,
  options?: { deliverableId?: string; preferCreac?: boolean; excerptChars?: number },
): TemplateSection[] {
  const raw = (text || "").trim();
  if (!raw) return [];

  const deliverableId = options?.deliverableId ?? "";
  const useCreac =
    options?.preferCreac ??
    ["aos-discretionary-brief", "aos_discretionary_brief"].includes(deliverableId);
  const excerptChars = options?.excerptChars ?? 600;

  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const headingIdxs: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (isHeadingLine(lines[i] ?? "")) headingIdxs.push(i);
  }

  if (!headingIdxs.length) {
    return [
      {
        id: slug("Full template", 0),
        label: "Full template",
        role: "other",
        contentExcerpt: raw.slice(0, excerptChars),
        order: 0,
      },
    ];
  }

  const sections: TemplateSection[] = headingIdxs.map((start, order) => {
    const end = headingIdxs[order + 1] ?? lines.length;
    const label = headingLabel(lines[start] ?? "");
    const body = lines.slice(start + 1, end).join("\n").trim();
    return {
      id: slug(label, order),
      label,
      role: useCreac ? detectCreacRole(label) : "other",
      contentExcerpt: (body || label).slice(0, excerptChars),
      order,
    };
  });

  if (useCreac) {
    const conclusionIdxs = sections
      .map((s, i) => (s.role === "conclusion" ? i : -1))
      .filter((i) => i >= 0);
    if (conclusionIdxs.length >= 2) {
      const last = conclusionIdxs[conclusionIdxs.length - 1]!;
      sections[last]!.role = "conclusion_close";
    }
  }

  return sections;
}

/** Default CREAC outline when no firm upload yet (AOS discretionary brief). */
export const DEFAULT_AOS_CREAC_SECTIONS: TemplateSection[] = [
  {
    id: "conclusion-open-0",
    label: "Conclusion (opening)",
    role: "conclusion",
    contentExcerpt:
      "State the requested relief up front (e.g. grant AOS / favorable exercise of discretion).",
    order: 0,
  },
  {
    id: "rule-1",
    label: "Rule",
    role: "rule",
    contentExcerpt:
      "Preserve the firm template’s statement of law (INA §245(a), PM-602-0199, Matter of Marin / Patel).",
    order: 1,
  },
  {
    id: "explanation-2",
    label: "Explanation",
    role: "explanation",
    contentExcerpt: "Explain how the rule operates — totality of the circumstances; AOS as administrative grace.",
    order: 2,
  },
  {
    id: "analysis-3",
    label: "Analysis",
    role: "analysis",
    contentExcerpt:
      "Apply matter facts (hardship, equities, qualifying relative, adverse factors) against the preserved Rule.",
    order: 3,
  },
  {
    id: "conclusion-close-4",
    label: "Conclusion (closing)",
    role: "conclusion_close",
    contentExcerpt: "Restate the request for relief guided by the Analysis outcome.",
    order: 4,
  },
];

export const CREAC_ROLE_LABELS: Record<CreacRole, string> = {
  conclusion: "Conclusion (open)",
  rule: "Rule — preserve from template",
  explanation: "Explanation — preserve / light tweak",
  analysis: "Analysis — matter facts",
  conclusion_close: "Conclusion (close)",
  introduction: "Introduction",
  caption: "Caption",
  other: "Other",
};

/** AOS drafting fact field → CREAC slot. */
export const AOS_FACT_CREAC_MAP: Record<string, CreacRole> = {
  applicantName: "caption",
  aNumber: "caption",
  clientStatus: "analysis",
  entryDate: "analysis",
  portOfEntry: "analysis",
  entryVisaType: "analysis",
  petitionerName: "analysis",
  petitionerRelationship: "analysis",
  qualifyingRelative: "analysis",
  i130ApprovedDate: "analysis",
  i485FiledDate: "analysis",
  caseTheme: "conclusion",
  caseThemeBrief: "conclusion_close",
  sectionAHeading: "analysis",
  sectionAFacts: "analysis",
  sectionBHeading: "analysis",
  sectionBFacts: "analysis",
  adverseHeading: "analysis",
  adverseFacts: "analysis",
  adverseFactorBrief: "analysis",
  adverseFactors: "analysis",
  positiveEquities: "analysis",
  balancingInventory: "analysis",
  departureHarm: "explanation",
  extremeHardshipFactors: "analysis",
  inadmissibilityGrounds: "analysis",
  priorFilings: "analysis",
  supportingDocs: "analysis",
  reliefSought: "conclusion",
};

export const CLASSIFICATION_LABELS: Record<string, string> = {
  PRESERVE: "PRESERVE",
  FILL: "FILL",
  CAPTION: "CAPTION",
  BOILERPLATE: "BOILERPLATE",
};

export function classificationBadgeClass(classification: string): string {
  switch (classification) {
    case "PRESERVE":
      return "bg-indigo-50 text-indigo-900 ring-indigo-600/25";
    case "FILL":
      return "bg-amber-50 text-amber-950 ring-amber-600/25";
    case "CAPTION":
      return "bg-sky-50 text-sky-900 ring-sky-600/25";
    case "BOILERPLATE":
      return "bg-slate-100 text-slate-800 ring-slate-500/25";
    default:
      return "bg-slate-50 text-slate-700 ring-slate-500/20";
  }
}

export function roleBadgeClass(role: CreacRole): string {
  switch (role) {
    case "rule":
      return "bg-indigo-50 text-indigo-800 ring-indigo-600/20";
    case "explanation":
      return "bg-violet-50 text-violet-800 ring-violet-600/20";
    case "analysis":
      return "bg-amber-50 text-amber-900 ring-amber-600/20";
    case "conclusion":
    case "conclusion_close":
      return "bg-emerald-50 text-emerald-800 ring-emerald-600/20";
    case "introduction":
      return "bg-sky-50 text-sky-800 ring-sky-600/20";
    default:
      return "bg-slate-50 text-slate-700 ring-slate-500/20";
  }
}
