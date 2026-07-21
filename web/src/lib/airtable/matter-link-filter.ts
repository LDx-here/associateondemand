/**
 * Airtable linked-record filters for matter-scoped tables (Documents, Notes, Events).
 *
 * Airtable formulas render linked fields via ARRAYJOIN as the linked row's *primary*
 * field (Matters.matter_id code), not raw record ids — so we match on both record id
 * and exact matter code with comma-boundary FIND to avoid substring false positives.
 */

export type ResolvedMatter = { recordId: string; matterId: string };

export function escapeAirtableFormula(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

/** Build filterByFormula for a linked matter_id column. */
export function matterLinkFilterFormula(linkFieldName: string, resolved: ResolvedMatter): string {
  const code = escapeAirtableFormula(resolved.matterId);
  const rec = escapeAirtableFormula(resolved.recordId);
  const byRecordId = `{${linkFieldName}} = '${rec}'`;
  const byExactCode = `FIND(',' & '${code}' & ',', ',' & ARRAYJOIN({${linkFieldName}}) & ',')`;
  return `OR(${byRecordId}, ${byExactCode})`;
}

export function linkedRecordIds(field: unknown): string[] {
  if (!field) return [];
  if (Array.isArray(field)) return field.map(String);
  return [String(field)];
}

/**
 * Server-side guard: only keep rows whose matter_id link includes this matter's record id.
 * Airtable REST API returns linked fields as arrays of record ids (rec…).
 */
export function recordMatchesMatterLink(
  fields: Record<string, unknown>,
  linkFieldName: string,
  resolved: ResolvedMatter,
): boolean {
  const raw = fields[linkFieldName];
  const ids = linkedRecordIds(raw);
  if (ids.includes(resolved.recordId)) return true;
  // Legacy rows: plain matter code string written before linked-field migration.
  if (typeof raw === "string" && raw.trim() === resolved.matterId) return true;
  if (ids.length === 1 && ids[0] === resolved.matterId) return true;
  return false;
}
