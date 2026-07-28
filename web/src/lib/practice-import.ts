/**
 * Practice importer — turns the firm's existing client folders into matters.
 *
 * The case files already exist on disk (Google Drive, synced locally). They
 * carry more structure than they look like they do: the folder name encodes a
 * matter number and client, the parent folder encodes practice area, and the
 * filenames plus their dates are a procedural history. This module reads that
 * structure so a real caseload can enter the system without being retyped.
 *
 * Pure parsing only — no filesystem, no network. Callers supply the listing.
 */

export type ImportedPracticeArea =
  | "immigration"
  | "personal_injury"
  | "property_damage"
  | "unknown";

/** Folder → practice area. Keys are the firm's actual folder names. */
const AREA_BY_FOLDER: Record<string, ImportedPracticeArea> = {
  immigration: "immigration",
  "personal injury": "personal_injury",
  "property damage only": "property_damage",
  "property damage": "property_damage",
};

export function inferPracticeArea(parentFolder: string): ImportedPracticeArea {
  return AREA_BY_FOLDER[parentFolder.trim().toLowerCase()] ?? "unknown";
}

export type ParsedClientFolder = {
  /** "2026-002" — the firm's own matter numbering. */
  matterNumber: string;
  /** "Jeremiah Hammond" — normalized out of "Hammond, Jeremiah". */
  clientName: string;
  /** "DV" for diminished-value matters, etc. Trailing tag after the name. */
  tag?: string;
};

/**
 * Firm convention is `YYYY-###-LastName, First[-TAG]`, but real folders drift:
 * spaces around the separators, a missing first name, a trailing type tag.
 * Observed live: "2026-002-Hammond, Jeremiah", "2026-003 - Tina Akyaa",
 * "2025-001-Konst, John-DV", "2026-005- Augustine".
 */
export function parseClientFolderName(folderName: string): ParsedClientFolder | null {
  const name = folderName.trim();
  const match = /^(\d{4})\s*-\s*(\d{1,4})\s*-?\s*(.*)$/.exec(name);
  if (!match) return null;

  const [, year, seq, remainderRaw] = match;
  let remainder = remainderRaw.trim();
  if (!remainder) return null;

  // Trailing type tag: "Konst, John-DV" → tag "DV". Only treat a trailing
  // hyphen segment as a tag when it is short and uppercase-ish, so hyphenated
  // surnames ("Garcia-Lopez") are not mistaken for tags.
  let tag: string | undefined;
  const tagMatch = /^(.*?)-\s*([A-Za-z0-9]{1,6})$/.exec(remainder);
  if (tagMatch && tagMatch[2] === tagMatch[2].toUpperCase()) {
    remainder = tagMatch[1].trim();
    tag = tagMatch[2].toUpperCase();
  }

  return {
    matterNumber: `${year}-${seq.padStart(3, "0")}`,
    clientName: normalizeClientName(remainder),
    ...(tag ? { tag } : {}),
  };
}

/** "Hammond, Jeremiah" → "Jeremiah Hammond"; "Tina Akyaa" → unchanged. */
export function normalizeClientName(raw: string): string {
  const value = raw.replace(/\s+/g, " ").trim();
  const comma = value.indexOf(",");
  if (comma === -1) return value;
  const last = value.slice(0, comma).trim();
  const first = value.slice(comma + 1).trim();
  if (!first) return last;
  return `${first} ${last}`;
}

export type DocumentCategory =
  | "Representation"
  | "Court Filing"
  | "Evidence"
  | "Medical Record"
  | "Correspondence"
  | "Insurance"
  | "Valuation"
  | "Engagement"
  | "Other";

type Rule = { category: DocumentCategory; patterns: RegExp[]; timeline?: boolean };

/**
 * Filename → document category. Ordered: the first match wins, so more
 * specific categories are listed before broader ones. `timeline: true` marks
 * categories whose documents represent a real procedural event worth placing
 * on the case timeline (a filing happened) rather than a file that merely
 * exists (a records copy).
 */
const RULES: Rule[] = [
  {
    category: "Court Filing",
    timeline: true,
    patterns: [
      /\bcomplaint\b/i,
      /\banswer\b/i,
      /\bmotion\b/i,
      /\border\b/i,
      /\bpetition\b/i,
      /\bbrief\b/i,
      /\bdeclaration\b/i,
      /\bscheduling[\s_-]?order\b/i,
      /\bhearing\b/i,
      /\bi-\d{3}\b/i,
    ],
  },
  {
    category: "Representation",
    timeline: true,
    patterns: [/\bLOR\b/i, /letter of representation/i, /representation[\s_-]?letter/i],
  },
  {
    category: "Engagement",
    timeline: true,
    patterns: [/engagement/i, /service agreement/i, /\bretainer\b/i, /\bfee agreement\b/i],
  },
  {
    category: "Medical Record",
    patterns: [/\bmedical\b/i, /\bsurgery\b/i, /\bMHMC\b/i, /fair\s?health/i, /\bR&B\b/i, /\btreatment\b/i],
  },
  {
    category: "Valuation",
    patterns: [/diminished\s?value/i, /\bappraisal\b/i, /loss[\s_-]?of[\s_-]?use/i, /\bvaluation\b/i],
  },
  {
    category: "Insurance",
    patterns: [/insurance/i, /\bcarrier\b/i, /\bclaim\b/i, /UM[\s_/-]?UIM/i, /\bmedpay\b/i, /\badjuster\b/i],
  },
  {
    category: "Evidence",
    patterns: [/crash[\s_-]?report/i, /police[\s_-]?report/i, /\bphoto/i, /screenshot/i, /\bcrash\b/i],
  },
  {
    category: "Correspondence",
    patterns: [/correspondence/i, /\bletter\b/i, /\bemail\b/i, /\bnotice\b/i],
  },
];

export function classifyDocument(fileName: string): { category: DocumentCategory; isTimelineEvent: boolean } {
  // Underscore is a regex word character, so `\bdeclaration\b` never matches
  // "Viazovikova_Declaration_DRAFT". Real filenames use underscores as word
  // separators constantly, so normalize them to spaces before matching.
  const haystack = fileName.replace(/_/g, " ");
  for (const rule of RULES) {
    if (rule.patterns.some((p) => p.test(haystack))) {
      return { category: rule.category, isTimelineEvent: rule.timeline === true };
    }
  }
  return { category: "Other", isTimelineEvent: false };
}

export type ScannedFile = {
  name: string;
  /** ISO timestamp — file modified time stands in for "when this happened". */
  modifiedAt: string;
};

export type ScannedFolder = {
  folderName: string;
  /** Immediate parent folder name, used to infer practice area. */
  parentFolder: string;
  files: ScannedFile[];
};

export type ProposedDocument = {
  title: string;
  category: DocumentCategory;
  occurredAt: string;
  isTimelineEvent: boolean;
};

export type ProposedMatter = {
  matterNumber: string;
  clientName: string;
  practiceArea: ImportedPracticeArea;
  tag?: string;
  documents: ProposedDocument[];
  /** Timeline-worthy documents, oldest first — the case's procedural spine. */
  timeline: ProposedDocument[];
  /** Most recent activity across all documents; drives the "gone quiet" check. */
  lastActivityAt: string | null;
  sourceFolder: string;
};

/** Files that are noise, not case documents. */
function isIgnorable(fileName: string): boolean {
  return (
    fileName.startsWith(".") ||
    fileName.startsWith("~$") ||
    fileName === "Icon\r" ||
    fileName.toLowerCase() === "desktop.ini"
  );
}

/**
 * Filename signals for practice area, used when the folder sits directly in
 * "03 Clients Active" with no practice-area parent to infer from (observed:
 * 2026-005 Augustine, 2026-006 Makhammad).
 */
const AREA_SIGNALS: { area: ImportedPracticeArea; patterns: RegExp[] }[] = [
  {
    area: "immigration",
    patterns: [
      /remote[\s_-]?appearance/i,
      /\bEOIR\b/i,
      /\bUSCIS\b/i,
      /\bI-\d{3}\b/i,
      /\basylum\b/i,
      /\bremoval\b/i,
      /\bimmigration\b/i,
      /\bA\d{8,9}\b/,
      /scheduling[\s_-]?order/i,
      /\bNTA\b/,
    ],
  },
  {
    area: "personal_injury",
    patterns: [/UM[\s_/-]?UIM/i, /\bmedpay\b/i, /\bbodily injury\b/i, /crash[\s_-]?report/i, /\bsurgery\b/i],
  },
  {
    area: "property_damage",
    patterns: [/diminished\s?value/i, /loss[\s_-]?of[\s_-]?use/i, /\bappraisal\b/i, /\brental\b/i],
  },
];

function inferAreaFromFiles(files: ScannedFile[]): ImportedPracticeArea {
  const haystack = files.map((f) => f.name.replace(/_/g, " ")).join(" | ");
  for (const signal of AREA_SIGNALS) {
    if (signal.patterns.some((p) => p.test(haystack))) return signal.area;
  }
  return "unknown";
}

export function buildProposedMatter(folder: ScannedFolder): ProposedMatter | null {
  const parsed = parseClientFolderName(folder.folderName);
  if (!parsed) return null;

  const documents: ProposedDocument[] = folder.files
    .filter((f) => !isIgnorable(f.name))
    .map((f) => {
      const { category, isTimelineEvent } = classifyDocument(f.name);
      return {
        title: f.name.replace(/\.[a-z0-9]{1,5}$/i, "").trim(),
        category,
        occurredAt: f.modifiedAt,
        isTimelineEvent,
      };
    });

  const byDate = (a: ProposedDocument, b: ProposedDocument) =>
    Date.parse(a.occurredAt) - Date.parse(b.occurredAt);

  const timeline = documents.filter((d) => d.isTimelineEvent).sort(byDate);
  const lastActivityAt =
    documents.length > 0
      ? documents.reduce(
          (latest, d) => (Date.parse(d.occurredAt) > Date.parse(latest) ? d.occurredAt : latest),
          documents[0].occurredAt,
        )
      : null;

  // Parent folder is the strong signal; fall back to filename signals for
  // matters filed directly under "03 Clients Active".
  const byFolder = inferPracticeArea(folder.parentFolder);
  const practiceArea = byFolder !== "unknown" ? byFolder : inferAreaFromFiles(folder.files);

  return {
    matterNumber: parsed.matterNumber,
    clientName: parsed.clientName,
    practiceArea,
    ...(parsed.tag ? { tag: parsed.tag } : {}),
    documents: [...documents].sort(byDate),
    timeline,
    lastActivityAt,
    sourceFolder: folder.folderName,
  };
}

export function buildProposedMatters(folders: ScannedFolder[]): ProposedMatter[] {
  return folders
    .map(buildProposedMatter)
    .filter((m): m is ProposedMatter => m !== null)
    .sort((a, b) => b.matterNumber.localeCompare(a.matterNumber));
}

/** Case type string for the app, derived from practice area + tag. */
export function caseTypeFor(matter: ProposedMatter): string {
  if (matter.practiceArea === "immigration") return "Immigration";
  if (matter.practiceArea === "property_damage") {
    return matter.tag === "DV" ? "Property Damage - Diminished Value" : "Property Damage";
  }
  if (matter.practiceArea === "personal_injury") return "Personal Injury";
  return "Other";
}

/** Days since anything happened — the input to a "this case has gone quiet" flag. */
export function daysSinceActivity(matter: ProposedMatter, now: Date): number | null {
  if (!matter.lastActivityAt) return null;
  const last = Date.parse(matter.lastActivityAt);
  if (!Number.isFinite(last)) return null;
  return Math.floor((now.getTime() - last) / 86_400_000);
}
