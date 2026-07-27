/**
 * Google Sheets API client (service account). Credentials never reach the browser.
 */

import fs from "node:fs";

import { JWT } from "google-auth-library";

import { SHEET_TABS, TAB_HEADERS, type SheetTabKey } from "./schema";

const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";
const SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets";

type ServiceAccountJson = {
  client_email: string;
  private_key: string;
};

type ParsedRow = Record<string, string> & { _sheetRow: number };

let jwtClient: JWT | null = null;
let accessTokenCache: { token: string; expiresAt: number } | null = null;

/** In-memory read cache — reduces duplicate SSR fetches (TTL 30s). */
const readCache = new Map<string, { at: number; rows: ParsedRow[] }>();
const READ_CACHE_TTL_MS = 30_000;

function loadServiceAccount(): ServiceAccountJson | null {
  const inline = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (inline) {
    try {
      return JSON.parse(inline) as ServiceAccountJson;
    } catch {
      return null;
    }
  }
  const path = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  if (path) {
    try {
      return JSON.parse(fs.readFileSync(path, "utf8")) as ServiceAccountJson;
    } catch {
      return null;
    }
  }
  return null;
}

export function getSpreadsheetId(): string | null {
  const id = process.env.GOOGLE_SHEETS_SPREADSHEET_ID?.trim();
  return id || null;
}

export { isGoogleSheetsConfigured } from "../data-store-config";

/** Google Sheets API or credential failures — safe to degrade reads. */
export function isGoogleSheetsReadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message;
  return (
    msg.includes("Google Sheets") ||
    msg.includes("GOOGLE_SHEETS") ||
    msg.includes("service account credentials not configured") ||
    msg.includes("Failed to obtain Google access token")
  );
}

export function getSpreadsheetUrl(): string | null {
  const id = getSpreadsheetId();
  if (!id) return null;
  return `https://docs.google.com/spreadsheets/d/${id}/edit`;
}

export function getSpreadsheetExportUrl(format: "csv" | "xlsx" = "csv"): string | null {
  const id = getSpreadsheetId();
  if (!id) return null;
  if (format === "xlsx") {
    return `https://docs.google.com/spreadsheets/d/${id}/export?format=xlsx`;
  }
  return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv`;
}

function getJwt(): JWT {
  if (jwtClient) return jwtClient;
  const sa = loadServiceAccount();
  if (!sa?.client_email || !sa?.private_key) {
    throw new Error("Google service account credentials not configured");
  }
  jwtClient = new JWT({
    email: sa.client_email,
    key: sa.private_key,
    scopes: [SHEETS_SCOPE],
  });
  return jwtClient;
}

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (accessTokenCache && accessTokenCache.expiresAt > now + 60_000) {
    return accessTokenCache.token;
  }
  const client = getJwt();
  const res = await client.getAccessToken();
  const token = res.token;
  if (!token) throw new Error("Failed to obtain Google access token");
  accessTokenCache = { token, expiresAt: now + 3_300_000 };
  return token;
}

async function sheetsFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = await getAccessToken();
  const resp = await fetch(`${SHEETS_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  return resp;
}

function tabRange(tab: SheetTabKey, a1?: string): string {
  const name = SHEET_TABS[tab];
  return a1 ? `'${name}'!${a1}` : `'${name}'`;
}

function parseRows(values: string[][] | undefined, headers: readonly string[]): ParsedRow[] {
  if (!values || values.length < 2) return [];
  const headerRow = values[0].map((h) => h.trim());
  const colIndex = new Map<string, number>();
  for (const h of headers) {
    const idx = headerRow.indexOf(h);
    if (idx >= 0) colIndex.set(h, idx);
  }
  const rows: ParsedRow[] = [];
  for (let i = 1; i < values.length; i++) {
    const line = values[i];
    if (!line || line.every((c) => !String(c ?? "").trim())) continue;
    const row = { _sheetRow: i + 1 } as ParsedRow;
    for (const h of headers) {
      const idx = colIndex.get(h);
      row[h] = idx !== undefined ? String(line[idx] ?? "") : "";
    }
    if (!row.row_id?.trim()) continue;
    rows.push(row);
  }
  return rows;
}

function invalidateTabCache(tab: SheetTabKey): void {
  readCache.delete(tab);
}

export async function readSheetTab(tab: SheetTabKey, opts?: { noCache?: boolean }): Promise<ParsedRow[]> {
  const spreadsheetId = getSpreadsheetId();
  if (!spreadsheetId) throw new Error("GOOGLE_SHEETS_SPREADSHEET_ID not configured");

  if (!opts?.noCache) {
    const cached = readCache.get(tab);
    if (cached && Date.now() - cached.at < READ_CACHE_TTL_MS) {
      return cached.rows;
    }
  }

  const range = encodeURIComponent(tabRange(tab, "A1:ZZ"));
  const resp = await sheetsFetch(`/${spreadsheetId}/values/${range}`);
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Google Sheets read ${resp.status}: ${text}`);
  }
  const payload = (await resp.json()) as { values?: string[][] };
  const rows = parseRows(payload.values, TAB_HEADERS[tab]);
  readCache.set(tab, { at: Date.now(), rows });
  return rows;
}

export async function appendSheetRow(tab: SheetTabKey, values: string[]): Promise<void> {
  const spreadsheetId = getSpreadsheetId();
  if (!spreadsheetId) throw new Error("GOOGLE_SHEETS_SPREADSHEET_ID not configured");

  const range = encodeURIComponent(tabRange(tab, "A:ZZ"));
  const resp = await sheetsFetch(`/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`, {
    method: "POST",
    body: JSON.stringify({ values: [values] }),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Google Sheets append ${resp.status}: ${text}`);
  }
  invalidateTabCache(tab);
}

export async function updateSheetRow(tab: SheetTabKey, sheetRow: number, values: string[]): Promise<void> {
  const spreadsheetId = getSpreadsheetId();
  if (!spreadsheetId) throw new Error("GOOGLE_SHEETS_SPREADSHEET_ID not configured");

  const range = encodeURIComponent(tabRange(tab, `A${sheetRow}:ZZ${sheetRow}`));
  const resp = await sheetsFetch(`/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`, {
    method: "PUT",
    body: JSON.stringify({ values: [values] }),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Google Sheets update ${resp.status}: ${text}`);
  }
  invalidateTabCache(tab);
}

export function newRowId(prefix: string): string {
  return `gs-${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function rowToValues(headers: readonly string[], row: Record<string, string | number>): string[] {
  return headers.map((h) => String(row[h] ?? ""));
}
