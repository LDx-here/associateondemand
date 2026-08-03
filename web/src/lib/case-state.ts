/**
 * Case-state inference — read posture and candidate dates out of case folders.
 *
 * Imported matters arrive with a client name and a practice area and nothing
 * else: no posture, no next deadline. A matter list with empty deadline
 * columns is a worse spreadsheet, so this reads the signals the filenames
 * already carry ("470508-order setting hearing", "ANSWER", "complaint",
 * "notice-limited-appearance") and turns them into case state.
 *
 * Deliberately conservative about dates. A wrong deadline on a legal matter
 * is worse than a blank one, so a date is only ever *proposed* — never
 * written as authoritative — and every proposal carries the filename it came
 * from so the attorney can check it against the docket.
 *
 * Pure functions: no filesystem, no network, no AI.
 */

import type { ScannedFile } from "./practice-import";

/** Where a matter sits procedurally. Ordered loosely earliest → latest. */
export const CASE_POSTURES = [
  "Intake",
  "Representation Filed",
  "Filed",
  "Responsive Pleading Filed",
  "Awaiting Scheduling",
  "Hearing Scheduled",
  "Awaiting Decision",
] as const;

export type CasePosture = (typeof CASE_POSTURES)[number];

type PostureRule = {
  posture: CasePosture;
  /** Higher wins when several patterns match — later stages beat earlier. */
  rank: number;
  patterns: RegExp[];
};

/**
 * Rank encodes procedural progression, not confidence. A folder holding both
 * a complaint and an order setting hearing is at the hearing stage — the
 * complaint being present says only that the case started.
 */
const POSTURE_RULES: PostureRule[] = [
  {
    posture: "Hearing Scheduled",
    rank: 60,
    patterns: [/order\s*setting\s*hearing/i, /hearing\s*packet/i, /notice\s*of\s*hearing/i],
  },
  {
    posture: "Awaiting Decision",
    rank: 50,
    patterns: [/submitted\s*for\s*decision/i, /post[-\s]?hearing\s*brief/i, /closing\s*statement/i],
  },
  {
    posture: "Awaiting Scheduling",
    rank: 40,
    patterns: [/scheduling\s*order/i, /response\s*to\s*scheduling/i],
  },
  {
    posture: "Responsive Pleading Filed",
    rank: 30,
    patterns: [/\banswer\b/i, /\bresponse\b/i, /\bopposition\b/i, /\breply\b/i],
  },
  {
    posture: "Filed",
    rank: 20,
    patterns: [/\bcomplaint\b/i, /\bpetition\b/i, /\bmotion\b/i, /\bi-\d{3}\b/i, /\bbrief\b/i],
  },
  {
    posture: "Representation Filed",
    rank: 10,
    patterns: [
      /\bLOR\b/i,
      /letter\s*of\s*representation/i,
      /notice[-\s]*(of[-\s]*)?(limited[-\s]*)?appearance/i,
      /engagement/i,
      /fee\s*agreement/i,
      /service\s*agreement/i,
    ],
  },
];

export type PostureInference = {
  posture: CasePosture;
  /** Filename that drove the decision — shown so the attorney can check it. */
  evidence: string | null;
};

export function inferPosture(files: ScannedFile[]): PostureInference {
  let best: { rule: PostureRule; evidence: string } | null = null;

  for (const file of files) {
    const haystack = file.name.replace(/[_]/g, " ");
    for (const rule of POSTURE_RULES) {
      if (!rule.patterns.some((p) => p.test(haystack))) continue;
      if (!best || rule.rank > best.rule.rank) {
        best = { rule, evidence: file.name };
      }
    }
  }

  if (!best) return { posture: "Intake", evidence: null };
  return { posture: best.rule.posture, evidence: best.evidence };
}

/** Two-digit years in filenames are this century. */
function fourDigitYear(raw: string): number {
  const n = Number(raw);
  return raw.length === 2 ? 2000 + n : n;
}

function isoOrNull(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  // Reject dates far outside a plausible litigation window — an 8-digit run
  // in a filename is more often a document ID than a date.
  if (year < 2000 || year > 2100) return null;
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null;
  return d.toISOString().slice(0, 10);
}

/**
 * Dates embedded in filenames, e.g. "…_20260416050937524_QUICKSCAN.pdf",
 * "MHMC surgery R&B 2-12-26.pdf", "Westlaw … 06-08-2026.pdf".
 */
export function extractDatesFromFilename(fileName: string): string[] {
  // Underscore is a regex word character, so `\b(20\d{2})…` never matches
  // "…_20260416050937524_QUICKSCAN.pdf" — and scanner output is full of
  // underscores. Normalize before matching.
  const name = fileName.replace(/_/g, " ");
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (iso: string | null) => {
    if (iso && !seen.has(iso)) {
      seen.add(iso);
      out.push(iso);
    }
  };

  // YYYYMMDD run (allow a longer digit tail — scanners append a timestamp).
  for (const m of name.matchAll(/\b(20\d{2})(\d{2})(\d{2})\d*\b/g)) {
    push(isoOrNull(Number(m[1]), Number(m[2]), Number(m[3])));
  }
  // M-D-YY, MM-DD-YYYY, and slash/dot variants.
  for (const m of name.matchAll(/\b(\d{1,2})[-./](\d{1,2})[-./](\d{2}|\d{4})\b/g)) {
    push(isoOrNull(fourDigitYear(m[3]), Number(m[1]), Number(m[2])));
  }
  // YYYY-MM-DD.
  for (const m of name.matchAll(/\b(20\d{2})[-./](\d{1,2})[-./](\d{1,2})\b/g)) {
    push(isoOrNull(Number(m[1]), Number(m[2]), Number(m[3])));
  }

  return out;
}

/** Filenames that plausibly carry a deadline rather than a creation date. */
const DEADLINE_BEARING = [
  /order\s*setting\s*hearing/i,
  /notice\s*of\s*hearing/i,
  /hearing\s*packet/i,
  /scheduling\s*order/i,
  /\bsummons\b/i,
];

export type DeadlineCandidate = {
  date: string;
  sourceFile: string;
};

/**
 * Future-dated candidates from deadline-bearing documents only.
 *
 * A date in an arbitrary filename is usually when the document was made, not
 * when something is due — proposing those as deadlines would fill the
 * calendar with fiction. Past dates are excluded for the same reason: a
 * hearing that already happened is history, not a deadline.
 */
export function proposeDeadlines(files: ScannedFile[], now: Date): DeadlineCandidate[] {
  const out: DeadlineCandidate[] = [];
  const today = now.toISOString().slice(0, 10);

  for (const file of files) {
    const haystack = file.name.replace(/[_]/g, " ");
    if (!DEADLINE_BEARING.some((p) => p.test(haystack))) continue;
    for (const date of extractDatesFromFilename(file.name)) {
      if (date >= today) out.push({ date, sourceFile: file.name });
    }
  }

  return out.sort((a, b) => a.date.localeCompare(b.date));
}

export type ProposedCaseState = {
  posture: CasePosture;
  postureEvidence: string | null;
  /** Earliest future deadline found, or null. Always attorney-verified. */
  nextDeadline: string | null;
  deadlineEvidence: string | null;
  /** Every future candidate, so a second hearing date is not hidden. */
  deadlineCandidates: DeadlineCandidate[];
};

export function proposeCaseState(files: ScannedFile[], now: Date): ProposedCaseState {
  const { posture, evidence } = inferPosture(files);
  const candidates = proposeDeadlines(files, now);
  const first = candidates[0] ?? null;

  return {
    posture,
    postureEvidence: evidence,
    nextDeadline: first?.date ?? null,
    deadlineEvidence: first?.sourceFile ?? null,
    deadlineCandidates: candidates,
  };
}
