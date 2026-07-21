/**
 * Lightweight conflict check — port of legal-os/server/routers/conflicts.ts
 * against Airtable Matters (title/summary search). Not full Clio integration.
 */

export type ConflictCheckResult = "clear" | "review_required";

export type ConflictMatch = {
  matterId: string;
  title: string;
  reason: string;
};

export function normalizePartyName(value: string): string {
  return value.trim().toLowerCase();
}

export function checkConflictAgainstMatters(
  opposingParty: string,
  matters: Array<{ matterId: string; title?: string; summary?: string; clientName?: string }>,
  opposingCounsel?: string,
): { result: ConflictCheckResult; details: string; matches: ConflictMatch[] } {
  const party = normalizePartyName(opposingParty);
  if (!party) {
    return { result: "clear", details: "No opposing party provided.", matches: [] };
  }

  const matches: ConflictMatch[] = [];
  const counsel = opposingCounsel ? normalizePartyName(opposingCounsel) : "";

  for (const matter of matters) {
    const haystacks = [matter.title, matter.summary, matter.clientName].filter(Boolean) as string[];
    for (const text of haystacks) {
      const normalized = normalizePartyName(text);
      if (normalized.includes(party) || party.includes(normalized)) {
        matches.push({
          matterId: matter.matterId,
          title: matter.title || matter.matterId,
          reason: `Title/summary may reference "${opposingParty}"`,
        });
        break;
      }
    }
  }

  if (counsel) {
    for (const matter of matters) {
      const text = normalizePartyName([matter.title, matter.summary].filter(Boolean).join(" "));
      if (text.includes(counsel)) {
        matches.push({
          matterId: matter.matterId,
          title: matter.title || matter.matterId,
          reason: `May reference opposing counsel "${opposingCounsel}"`,
        });
      }
    }
  }

  const unique = new Map(matches.map((m) => [m.matterId, m]));
  const deduped = [...unique.values()];

  if (deduped.length === 0) {
    return { result: "clear", details: "No matches found in existing matters.", matches: [] };
  }

  return {
    result: "review_required",
    details: `Found ${deduped.length} potential match(es). Manual conflict review required.`,
    matches: deduped,
  };
}
