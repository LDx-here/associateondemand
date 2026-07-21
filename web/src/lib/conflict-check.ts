/**
 * Lightweight conflict check — port of legal-os/server/routers/conflicts.ts
 * against Airtable Matters + Contacts (no Clio).
 */

export type ConflictCheckResult = "clear" | "review_required";

export type ConflictMatch = {
  matterId: string;
  title: string;
  reason: string;
  source: "matter" | "contact";
};

export type ConflictMatterRow = {
  matterId: string;
  title?: string;
  summary?: string;
  clientName?: string;
  opposingParty?: string;
  opposingCounsel?: string;
};

export type ConflictContactRow = {
  id: string;
  displayName?: string;
  email?: string;
  organization?: string;
  notes?: string;
};

export function normalizePartyName(value: string): string {
  return value.trim().toLowerCase();
}

function haystackIncludes(haystack: string, needle: string): boolean {
  const h = normalizePartyName(haystack);
  const n = normalizePartyName(needle);
  if (!h || !n) return false;
  return h.includes(n) || n.includes(h);
}

function pushMatch(
  matches: ConflictMatch[],
  seen: Set<string>,
  match: ConflictMatch,
): void {
  const key = `${match.source}:${match.matterId}:${match.reason}`;
  if (seen.has(key)) return;
  seen.add(key);
  matches.push(match);
}

export function checkConflictAgainstMatters(
  opposingParty: string,
  matters: ConflictMatterRow[],
  opposingCounsel?: string,
  contacts: ConflictContactRow[] = [],
): { result: ConflictCheckResult; details: string; matches: ConflictMatch[] } {
  const party = normalizePartyName(opposingParty);
  if (!party) {
    return { result: "clear", details: "No opposing party provided.", matches: [] };
  }

  const matches: ConflictMatch[] = [];
  const seen = new Set<string>();
  const counsel = opposingCounsel ? normalizePartyName(opposingCounsel) : "";

  for (const matter of matters) {
    const fields = [
      matter.title,
      matter.summary,
      matter.clientName,
      matter.opposingParty,
      matter.opposingCounsel,
    ].filter(Boolean) as string[];

    for (const text of fields) {
      if (haystackIncludes(text, opposingParty)) {
        pushMatch(matches, seen, {
          matterId: matter.matterId,
          title: matter.title || matter.matterId,
          reason: `Matter may reference "${opposingParty}"`,
          source: "matter",
        });
        break;
      }
    }

    if (counsel) {
      const counselHay = [matter.title, matter.summary, matter.opposingCounsel].filter(Boolean).join(" ");
      if (haystackIncludes(counselHay, opposingCounsel!)) {
        pushMatch(matches, seen, {
          matterId: matter.matterId,
          title: matter.title || matter.matterId,
          reason: `Matter may reference opposing counsel "${opposingCounsel}"`,
          source: "matter",
        });
      }
    }
  }

  for (const contact of contacts) {
    const fields = [contact.displayName, contact.email, contact.organization, contact.notes].filter(
      Boolean,
    ) as string[];

    for (const text of fields) {
      if (haystackIncludes(text, opposingParty)) {
        pushMatch(matches, seen, {
          matterId: contact.id,
          title: contact.displayName || contact.email || contact.id,
          reason: `Contact may reference "${opposingParty}"`,
          source: "contact",
        });
        break;
      }
    }

    if (counsel) {
      const counselHay = [contact.displayName, contact.organization, contact.notes].filter(Boolean).join(" ");
      if (haystackIncludes(counselHay, opposingCounsel!)) {
        pushMatch(matches, seen, {
          matterId: contact.id,
          title: contact.displayName || contact.id,
          reason: `Contact may reference opposing counsel "${opposingCounsel}"`,
          source: "contact",
        });
      }
    }
  }

  if (matches.length === 0) {
    return {
      result: "clear",
      details: "No matches found in firm matters or contacts.",
      matches: [],
    };
  }

  return {
    result: "review_required",
    details: `Found ${matches.length} potential match(es). Manual conflict review required.`,
    matches,
  };
}
