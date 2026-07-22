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
  /** Nesting depth: 0 = top-level (I/II/Cover), 1 = A–E subsection. */
  depth?: number;
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

/** Default AOS outline from System Guide (when no firm DOCX yet). */
export const DEFAULT_AOS_CREAC_SECTIONS: TemplateSection[] = [
  {
    id: "cover",
    label: "Cover / Caption",
    role: "caption",
    classification: "CAPTION",
    depth: 0,
    contentExcerpt:
      "Applicant name, A-number, subject line, case theme subtitle, date — identifying info for this filing.",
    order: 0,
  },
  {
    id: "legal_standard",
    label: "I. Legal Standard",
    role: "rule",
    classification: "PRESERVE",
    depth: 0,
    contentExcerpt:
      "INA §245(a) framework + Patel / Marin / Arai discretionary standard — copied verbatim from the firm template; law does not change case to case.",
    order: 1,
  },
  {
    id: "statutory_eligibility",
    label: "II. Statutory Eligibility",
    role: "analysis",
    classification: "FILL",
    depth: 0,
    contentExcerpt:
      "Inspected and admitted; eligible for immigrant visa (approved I-130); admissible — filled from matter identity and petition facts.",
    order: 2,
  },
  {
    id: "argument_intro",
    label: "III. Argument — Favorable Discretion Is Warranted",
    role: "analysis",
    classification: "FILL",
    depth: 0,
    contentExcerpt:
      "Opening theme + Patel burden frame. Subsections A–E develop equities, AOS mechanism, adverse context, and balancing.",
    order: 3,
  },
  {
    id: "section_a",
    label: "A. Primary equity",
    role: "analysis",
    classification: "FILL",
    depth: 1,
    contentExcerpt: "Most compelling equity — argument claim heading, not a factor label. Feeds from section A facts.",
    order: 4,
  },
  {
    id: "section_b",
    label: "B. Secondary equities",
    role: "analysis",
    classification: "FILL",
    depth: 1,
    contentExcerpt: "Bundle supporting equities — each: fact → significance → authority.",
    order: 5,
  },
  {
    id: "section_c_aos_mechanism",
    label: "C. AOS mechanism",
    role: "explanation",
    classification: "FILL",
    depth: 1,
    contentExcerpt:
      "Congress created AOS to avoid needless family separation; departure would trigger §212(a)(9)(B) bars that do not currently apply.",
    order: 6,
  },
  {
    id: "section_d_adverse",
    label: "D. Adverse factors (proportionality)",
    role: "analysis",
    classification: "FILL",
    depth: 1,
    contentExcerpt:
      "Acknowledge adverse facts honestly; establish they do not require outstanding equities under Marin.",
    order: 7,
  },
  {
    id: "section_e_balancing",
    label: "E. Balancing",
    role: "analysis",
    classification: "FILL",
    depth: 1,
    contentExcerpt:
      "Inventory positives, apply Arai baseline, close on theme — favorable exercise of discretion is warranted.",
    order: 8,
  },
  {
    id: "conclusion",
    label: "IV. Conclusion",
    role: "conclusion_close",
    classification: "BOILERPLATE",
    depth: 0,
    contentExcerpt:
      "Restate the ask (approve I-485 / favorable discretion), who the applicant is, and a confident close.",
    order: 9,
  },
  {
    id: "certificate_footnotes",
    label: "Certificate of service / Footnotes",
    role: "other",
    classification: "BOILERPLATE",
    depth: 0,
    contentExcerpt: "Procedural certificate and collected citations — firm name / date only as variables.",
    order: 10,
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
      return "bg-slate-200/80 text-slate-800 ring-slate-500/30";
    case "FILL":
      return "bg-teal-50 text-teal-950 ring-teal-600/30";
    case "CAPTION":
      return "bg-sky-50 text-sky-900 ring-sky-600/30";
    case "BOILERPLATE":
      return "bg-stone-100 text-stone-700 ring-stone-400/40";
    default:
      return "bg-slate-50 text-slate-700 ring-slate-500/20";
  }
}

/** Card / rail accent for structure map nodes. */
export function classificationNodeClass(classification?: string): {
  rail: string;
  card: string;
  icon: string;
} {
  switch (classification) {
    case "PRESERVE":
      return {
        rail: "bg-slate-400",
        card: "border-slate-300 bg-slate-50/90",
        icon: "text-slate-600",
      };
    case "FILL":
      return {
        rail: "bg-teal-500",
        card: "border-teal-200/80 bg-amber-50/40",
        icon: "text-teal-700",
      };
    case "CAPTION":
      return {
        rail: "bg-sky-500",
        card: "border-sky-200 bg-sky-50/70",
        icon: "text-sky-700",
      };
    case "BOILERPLATE":
      return {
        rail: "bg-stone-400",
        card: "border-stone-200 bg-stone-50/80",
        icon: "text-stone-600",
      };
    default:
      return {
        rail: "bg-slate-300",
        card: "border-slate-200 bg-white",
        icon: "text-slate-500",
      };
  }
}

export function roleBadgeClass(role: CreacRole): string {
  switch (role) {
    case "rule":
      return "bg-slate-100 text-slate-800 ring-slate-500/25";
    case "explanation":
      return "bg-violet-50 text-violet-800 ring-violet-600/20";
    case "analysis":
      return "bg-amber-50 text-amber-900 ring-amber-600/20";
    case "conclusion":
    case "conclusion_close":
      return "bg-stone-100 text-stone-800 ring-stone-500/25";
    case "introduction":
      return "bg-sky-50 text-sky-800 ring-sky-600/20";
    case "caption":
      return "bg-sky-50 text-sky-800 ring-sky-600/20";
    default:
      return "bg-slate-50 text-slate-700 ring-slate-500/20";
  }
}

/** Infer outline depth from heading text / known AOS section ids. */
export function inferSectionDepth(sec: Pick<TemplateSection, "id" | "label" | "depth">): number {
  if (typeof sec.depth === "number") return sec.depth;
  const id = (sec.id || "").toLowerCase();
  if (/^(section_[a-e]|section_c_|section_d_|section_e_)/.test(id)) return 1;
  const label = (sec.label || "").trim();
  if (/^[A-E]\.\s/.test(label)) return 1;
  if (/^\([a-e]\)\s/i.test(label)) return 1;
  return 0;
}
