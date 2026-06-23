import type { InboxItem } from "@/lib/airtable/queries";

const GENERIC_FALLBACK = [
  "Review the agent output linked to this matter.",
  "Update Assessment or Legal Elements if conclusions changed.",
  "Run Command Panel dispatch again if another agent pass is needed.",
];

/**
 * Concrete next-step lines after resolving a PM inbox item:
 * prefers structured JSON steps on the record, otherwise splits prose, then generic reminders.
 */
export function suggestedNextSteps(
  item: Pick<InboxItem, "followUpSteps" | "whatNeeded" | "whatTried"> &
    Partial<Pick<InboxItem, "resolution" | "status">>,
): string[] {
  if (item.followUpSteps.length > 0) return [...item.followUpSteps];

  const prose = `${item.whatNeeded}\n${item.whatTried}`.trim();
  const bullets = prose
    .split(/\n+/)
    .map((l) => l.replace(/^\s*[\-*\d.)]+\s*/, "").trim())
    .filter((l) => l.length > 12);

  const sentences = prose
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 12);

  const merged = bullets.length >= 2 ? bullets : sentences;
  const uniq = Array.from(new Set(merged));
  if (uniq.length >= 2) return uniq.slice(0, 6);
  return [...GENERIC_FALLBACK];
}
