/**
 * BUILD_SPEC §7.3.3: task-like language and simple date hints for the note composer.
 */

const TASK_KEYWORD_PATTERNS: RegExp[] = [
  /\bfollow up\b/i,
  /\bfile by\b/i,
  /\bneed to\b/i,
  /\bschedule\b/i,
  /\bcall client\b/i,
  /\bdeadline\b/i,
  /\bprepare\b/i,
  /\breview\b/i,
  /\bsend\b/i,
  /\bdraft\b/i,
  /\bcomplete\b/i,
];

const MONTHS: Record<string, number> = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

export type TaskDetectionResult = {
  /** Short task title or first line of the note. */
  description: string;
  /** Human-readable due hint for the banner (may be unknown). */
  dueHint: string;
  /** ISO date (yyyy-mm-dd) when parsed, for task due date. */
  dueDateIso?: string;
};

function firstMeaningfulLine(content: string): string {
  const line = content.split("\n").find((l) => l.trim())?.trim() ?? "";
  if (line.length > 200) return `${line.slice(0, 197)}...`;
  return line || "Follow-up from note";
}

function parseIsoInText(text: string): string | undefined {
  const iso = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (iso) return iso[1];
  const slash = text.match(/\b(\d{1,2})[/.](\d{1,2})[/.](\d{2,4})\b/);
  if (slash) {
    let m = parseInt(slash[1], 10);
    let d = parseInt(slash[2], 10);
    let y = parseInt(slash[3], 10);
    if (y < 100) y += 2000;
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }
  }
  return undefined;
}

function parseWithinDays(text: string): string | undefined {
  const m = text.match(/\bwithin\s+(\d+)\s+days?\b/i);
  if (!m) return undefined;
  const n = parseInt(m[1], 10);
  if (!Number.isFinite(n) || n < 0 || n > 365) return undefined;
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function parseMonthDay(text: string): string | undefined {
  const m = text.match(
    /\b(?:by|before|on)\s+([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?\b/i,
  );
  if (!m) return undefined;
  const mon = MONTHS[m[1].toLowerCase()];
  if (mon === undefined) return undefined;
  const day = parseInt(m[2], 10);
  const year = m[3] ? parseInt(m[3], 10) : new Date().getFullYear();
  const attempt = new Date(year, mon, day);
  if (attempt.getMonth() !== mon) return undefined;
  return attempt.toISOString().slice(0, 10);
}

function parseNextFriday(text: string): string | undefined {
  if (!/\bnext\s+friday\b/i.test(text)) return undefined;
  const d = new Date();
  const day = d.getDay();
  const daysUntilFri = (5 - day + 7) % 7 || 7;
  d.setDate(d.getDate() + daysUntilFri);
  return d.toISOString().slice(0, 10);
}

function resolveDueDate(content: string): { hint: string; iso?: string } {
  const iso =
    parseIsoInText(content) ??
    parseWithinDays(content) ??
    parseMonthDay(content) ??
    parseNextFriday(content);
  if (iso) {
    return { hint: iso, iso };
  }
  if (/\bby\s+the\s+hearing\b/i.test(content)) {
    return { hint: "link to hearing (set date in Tasks)" };
  }
  return { hint: "not detected, edit in Tasks if needed" };
}

export function detectTaskFromNote(content: string): TaskDetectionResult | null {
  const trimmed = content.trim();
  if (!trimmed) return null;
  if (!TASK_KEYWORD_PATTERNS.some((p) => p.test(trimmed))) return null;
  const description = firstMeaningfulLine(trimmed);
  const { hint, iso } = resolveDueDate(trimmed);
  return { description: description, dueHint: hint, ...(iso ? { dueDateIso: iso } : {}) };
}

/** @deprecated use detectTaskFromNote */
export function suggestTaskFromNote(content: string): string | null {
  const d = detectTaskFromNote(content);
  return d ? d.description : null;
}
