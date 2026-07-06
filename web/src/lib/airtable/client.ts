/**
 * Server-only Airtable HTTP client. PAT never leaves the Next.js server.
 *
 * Moved from `web/src/lib/airtable-client.ts` to satisfy BUILD_SPEC §3
 * layout (`lib/airtable/{client,queries,fields,types}.ts`). The shim at
 * `lib/airtable-client.ts` re-exports from here for backwards compat.
 */

const AIRTABLE_API = "https://api.airtable.com/v0";

export function isAirtableConfigured(): boolean {
  return Boolean(process.env.AIRTABLE_PAT && process.env.AIRTABLE_BASE_ID);
}

export function isDemoMode(): boolean {
  return !isAirtableConfigured();
}

export type AirtableRecord<T = Record<string, unknown>> = {
  id: string;
  fields: T;
  createdTime?: string;
};

export type AirtableListResponse<T = Record<string, unknown>> = {
  records: AirtableRecord<T>[];
  offset?: string;
};

function authHeaders(): HeadersInit {
  const pat = process.env.AIRTABLE_PAT;
  if (!pat) throw new Error("AIRTABLE_PAT not configured");
  return { Authorization: `Bearer ${pat}` };
}

function baseUrl(table: string, query?: string): string {
  const base = process.env.AIRTABLE_BASE_ID;
  if (!base) throw new Error("AIRTABLE_BASE_ID not configured");
  const encoded = encodeURIComponent(table);
  return `${AIRTABLE_API}/${base}/${encoded}${query ? `?${query}` : ""}`;
}

export async function airtableFetch<T>(
  table: string,
  params?: Record<string, string>,
): Promise<T> {
  const qs = params ? new URLSearchParams(params).toString() : "";
  const resp = await fetch(baseUrl(table, qs || undefined), {
    headers: authHeaders(),
    cache: "no-store",
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Airtable ${resp.status}: ${text}`);
  }
  return resp.json() as Promise<T>;
}

export async function airtableListAll<T extends Record<string, unknown>>(
  table: string,
  params?: Record<string, string>,
): Promise<AirtableRecord<T>[]> {
  const records: AirtableRecord<T>[] = [];
  let offset: string | undefined;
  do {
    const pageParams = { ...params, ...(offset ? { offset } : {}) };
    const payload = await airtableFetch<AirtableListResponse<T>>(table, pageParams);
    records.push(...payload.records);
    offset = payload.offset;
  } while (offset);
  return records;
}

export async function airtableGetRecord<T extends Record<string, unknown>>(
  table: string,
  recordId: string,
): Promise<AirtableRecord<T>> {
  const resp = await fetch(`${baseUrl(table)}/${recordId}`, {
    headers: authHeaders(),
    cache: "no-store",
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Airtable get ${resp.status}: ${text}`);
  }
  return resp.json() as Promise<AirtableRecord<T>>;
}

export async function airtableCreate(
  table: string,
  fields: Record<string, unknown>,
): Promise<AirtableRecord> {
  const resp = await fetch(baseUrl(table), {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    // `typecast: true` lets Airtable auto-add new singleSelect choices (e.g.
    // assignment lifecycle statuses) instead of rejecting the write with
    // INVALID_MULTIPLE_CHOICE_OPTIONS. Safe because every select field in
    // this base is attorney-reviewable, not a locked enum.
    body: JSON.stringify({ fields, typecast: true }),
    cache: "no-store",
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Airtable create ${resp.status}: ${text}`);
  }
  return resp.json() as Promise<AirtableRecord>;
}

export async function airtablePatch(
  table: string,
  recordId: string,
  fields: Record<string, unknown>,
): Promise<AirtableRecord> {
  const resp = await fetch(`${baseUrl(table)}/${recordId}`, {
    method: "PATCH",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ fields, typecast: true }),
    cache: "no-store",
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Airtable patch ${resp.status}: ${text}`);
  }
  return resp.json() as Promise<AirtableRecord>;
}
