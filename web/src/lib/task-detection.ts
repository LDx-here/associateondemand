const TASK_PATTERNS = [
  /\bfollow up\b/i,
  /\bfile by\b/i,
  /\bneed to\b/i,
  /\bschedule\b/i,
  /\bcall client\b/i,
  /\bdeadline\b/i,
];

export function suggestTaskFromNote(content: string): string | null {
  if (!TASK_PATTERNS.some((p) => p.test(content))) return null;
  const firstLine = content.split("\n")[0]?.trim();
  return firstLine && firstLine.length < 200 ? firstLine : "Follow-up from note";
}
