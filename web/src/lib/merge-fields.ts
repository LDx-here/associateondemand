/**
 * Simple document-assembly merge fields — TXDocs / HotDocs / eImmigration style.
 * Convention: {{snake_case_key}} filled from matter facts + firm profile.
 */

const MERGE_RE = /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g;

/** Practice-area / CREAC-aligned merge keys commonly used in firm templates. */
export const STANDARD_MERGE_FIELDS: Array<{ key: string; label: string; creacSlot?: string }> = [
  { key: "client_name", label: "Client name", creacSlot: "caption" },
  { key: "a_number", label: "A-Number", creacSlot: "caption" },
  { key: "matter_id", label: "Matter ID", creacSlot: "caption" },
  { key: "qualifying_relative", label: "Qualifying relative", creacSlot: "analysis" },
  { key: "hardship_facts", label: "Hardship facts", creacSlot: "analysis" },
  { key: "positive_equities", label: "Positive equities", creacSlot: "analysis" },
  { key: "adverse_factors", label: "Adverse factors / response", creacSlot: "analysis" },
  { key: "relief_sought", label: "Relief sought", creacSlot: "conclusion" },
  { key: "firm_name", label: "Firm name" },
  { key: "attorney_name", label: "Attorney name" },
  { key: "bar_number", label: "Bar number" },
  { key: "date", label: "Date" },
  { key: "method", label: "Service method" },
  { key: "parties_served", label: "Parties served" },
];

export function extractMergeFields(text: string): string[] {
  const found = new Set<string>();
  const re = new RegExp(MERGE_RE.source, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m[1]) found.add(m[1]);
  }
  return [...found];
}

/**
 * Replace {{keys}} with values. Missing keys stay as placeholders unless leaveUnresolved=false,
 * in which case they become [FACT NEEDED: key].
 */
export function fillMergeFields(
  template: string,
  values: Record<string, string>,
  options?: { leaveUnresolved?: boolean },
): string {
  const leave = options?.leaveUnresolved ?? true;
  return template.replace(MERGE_RE, (_full, key: string) => {
    const val = (values[key] ?? "").trim();
    if (val) return val;
    return leave ? `{{${key}}}` : `[FACT NEEDED: ${key}]`;
  });
}

/** Map common practice-area fact ids → merge keys. */
export function practiceFactsToMergeValues(facts: Record<string, string | string[] | undefined>): Record<string, string> {
  const out: Record<string, string> = {};
  const map: Record<string, string> = {
    clientName: "client_name",
    client_name: "client_name",
    aNumber: "a_number",
    a_number: "a_number",
    matterId: "matter_id",
    matter_id: "matter_id",
    qualifyingRelative: "qualifying_relative",
    extremeHardshipFactors: "hardship_facts",
    positiveEquities: "positive_equities",
    adverseFactors: "adverse_factors",
    reliefSought: "relief_sought",
  };
  for (const [src, dest] of Object.entries(map)) {
    const raw = facts[src];
    if (raw == null) continue;
    const rendered = Array.isArray(raw)
      ? raw.map((v) => String(v).trim()).filter(Boolean).join("; ")
      : String(raw).trim();
    if (rendered) out[dest] = rendered;
  }
  return out;
}

/** Inject merge-field markers into structure notes for attorney visibility. */
export function annotateStructureWithMergeHints(sectionLabel: string, role: string): string[] {
  const hints: string[] = [];
  for (const f of STANDARD_MERGE_FIELDS) {
    if (f.creacSlot === role || (role === "analysis" && f.creacSlot === "analysis")) {
      hints.push(`{{${f.key}}}`);
    }
  }
  if (!hints.length && /letterhead|caption|header/i.test(sectionLabel)) {
    hints.push("{{firm_name}}", "{{attorney_name}}", "{{bar_number}}");
  }
  if (/certificate|service/i.test(sectionLabel)) {
    hints.push("{{date}}", "{{method}}", "{{parties_served}}");
  }
  return hints;
}
