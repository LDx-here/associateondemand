/**
 * Infer a billable work entry from what the attorney already wrote.
 *
 * Logging time currently costs a tap: pick an activity, accept a duration.
 * That tap is the friction — and unlogged time is the leak this whole feature
 * exists to close. If she writes "Called client re: the affidavit," the system
 * already knows it was a call; asking her to say so again is asking her to do
 * the system's work.
 *
 * So this reads the note and proposes. The attorney accepts or ignores; it
 * never logs time on its own, because a fabricated time entry on a client
 * invoice is worse than a missing one.
 *
 * Deliberately no AI. This must work while the API key is dead, it must be
 * instant as she types, and client notes should not leave the machine for
 * something a regular expression can answer.
 */

import type { WorkActivity } from "./work-entry";
import { DEFAULT_MINUTES, roundToBillingIncrement } from "./work-entry";

type ActivityRule = {
  activity: WorkActivity;
  /** Higher wins when a note matches several — more specific verbs rank up. */
  rank: number;
  patterns: RegExp[];
};

/**
 * Ordered by how strongly the phrasing implies the activity. "Drafted a motion
 * for the hearing" is drafting, not a court appearance, so Drafting outranks
 * Court on that sentence.
 */
const ACTIVITY_RULES: ActivityRule[] = [
  {
    activity: "Court",
    rank: 70,
    patterns: [
      /\battended?\b.*\bhearing\b/i,
      /\bappeared?\b.*(court|hearing|judge|IJ)\b/i,
      /\bmaster calendar\b/i,
      /\boral argument\b/i,
    ],
  },
  {
    activity: "Filing",
    rank: 60,
    patterns: [/\bfiled?\b/i, /\be-?filed?\b/i, /\bsubmitted\b.*\b(court|USCIS|EOIR)\b/i, /\bserved\b/i],
  },
  {
    activity: "Drafting",
    rank: 50,
    patterns: [/\bdraft(ed|ing)?\b/i, /\bwrote\b/i, /\bprepared?\b/i, /\brevis(ed|ing)\b/i, /\bredlin/i],
  },
  {
    activity: "Research",
    rank: 40,
    patterns: [/\bresearch(ed|ing)?\b/i, /\bwestlaw\b/i, /\blexis\b/i, /\bshepardiz/i, /\blooked up\b/i, /\bcase law\b/i],
  },
  {
    activity: "Review",
    rank: 35,
    patterns: [/\brevie?w(ed|ing)?\b/i, /\bread\b/i, /\banalyz(ed|ing)\b/i, /\bwent through\b/i],
  },
  {
    activity: "Meeting",
    rank: 30,
    patterns: [/\bmeeting\b/i, /\bmet with\b/i, /\bconsult(ation)?\b/i, /\bconference\b/i, /\bzoom\b/i],
  },
  {
    activity: "Call",
    rank: 25,
    patterns: [/\bcall(ed|ing)?\b/i, /\bphone[d]?\b/i, /\bspoke (with|to)\b/i, /\bvoicemail\b/i, /\bleft a message\b/i],
  },
  {
    activity: "Email",
    rank: 20,
    patterns: [/\bemail(ed)?\b/i, /\bwrote to\b/i, /\bsent\b.*\b(letter|correspondence|email)\b/i, /\bcorrespond/i],
  },
];

/**
 * Durations the attorney stated herself, e.g. "20 min call", "spent 1.5 hours",
 * "45m". An explicit number always beats the activity default — she knows how
 * long it took and the system does not.
 */
function statedMinutes(text: string): number | null {
  const hours = /(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)\b/i.exec(text);
  if (hours) {
    const value = Number(hours[1]);
    if (Number.isFinite(value) && value > 0 && value <= 24) {
      return roundToBillingIncrement(value * 60);
    }
  }
  const mins = /(\d+)\s*(?:minutes?|mins?|m)\b/i.exec(text);
  if (mins) {
    const value = Number(mins[1]);
    if (Number.isFinite(value) && value > 0 && value <= 600) {
      return roundToBillingIncrement(value);
    }
  }
  return null;
}

export type WorkSuggestion = {
  activity: WorkActivity;
  minutes: number;
  /** True when the note stated a duration rather than us defaulting. */
  durationFromNote: boolean;
  /** The phrase that triggered it, so the attorney can see why. */
  matchedOn: string;
};

/**
 * Propose a work entry, or null when the note gives no signal.
 *
 * Returning null is the common and correct case for a note that simply
 * records a fact ("client's A-number is X"). Guessing an activity there would
 * train her to distrust every suggestion.
 */
export function detectWorkFromNote(content: string): WorkSuggestion | null {
  const text = content.trim();
  if (!text) return null;

  let best: { rule: ActivityRule; matchedOn: string } | null = null;
  for (const rule of ACTIVITY_RULES) {
    for (const pattern of rule.patterns) {
      const m = pattern.exec(text);
      if (!m) continue;
      if (!best || rule.rank > best.rule.rank) {
        best = { rule, matchedOn: m[0] };
      }
      break;
    }
  }

  if (!best) return null;

  const stated = statedMinutes(text);
  return {
    activity: best.rule.activity,
    minutes: stated ?? DEFAULT_MINUTES[best.rule.activity],
    durationFromNote: stated !== null,
    matchedOn: best.matchedOn,
  };
}
