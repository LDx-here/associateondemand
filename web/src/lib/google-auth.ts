/**
 * Shared Google service-account auth for Sheets + Drive.
 * Credentials never reach the browser.
 */

import fs from "node:fs";

import { JWT } from "google-auth-library";

export const GOOGLE_SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";
export const GOOGLE_DRIVE_READONLY_SCOPE = "https://www.googleapis.com/auth/drive.readonly";

/** Default scopes for firm OS (Sheets CRUD + Drive practice scan). */
export const GOOGLE_DEFAULT_SCOPES = [GOOGLE_SHEETS_SCOPE, GOOGLE_DRIVE_READONLY_SCOPE] as const;

export type ServiceAccountJson = {
  client_email: string;
  private_key: string;
};

let jwtClient: JWT | null = null;
let jwtScopesKey: string | null = null;
let accessTokenCache: { token: string; expiresAt: number; scopesKey: string } | null = null;

export function loadServiceAccount(): ServiceAccountJson | null {
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

export function hasServiceAccountCredentials(): boolean {
  const sa = loadServiceAccount();
  return Boolean(sa?.client_email && sa?.private_key);
}

export function getServiceAccountEmail(): string | null {
  return loadServiceAccount()?.client_email?.trim() || null;
}

function scopesKey(scopes: readonly string[]): string {
  return [...scopes].sort().join("|");
}

function getJwt(scopes: readonly string[]): JWT {
  const key = scopesKey(scopes);
  if (jwtClient && jwtScopesKey === key) return jwtClient;

  // Scopes changed (or first call) — drop any Sheets-only cached JWT/token.
  jwtClient = null;
  jwtScopesKey = null;
  accessTokenCache = null;

  const sa = loadServiceAccount();
  if (!sa?.client_email || !sa?.private_key) {
    throw new Error("Google service account credentials not configured");
  }
  jwtClient = new JWT({
    email: sa.client_email,
    key: sa.private_key,
    scopes: [...scopes],
  });
  jwtScopesKey = key;
  return jwtClient;
}

/**
 * OAuth access token for the service account.
 * Pass explicit scopes when a caller needs a subset; default includes Sheets + Drive.
 */
export async function getGoogleAccessToken(
  scopes: readonly string[] = GOOGLE_DEFAULT_SCOPES,
): Promise<string> {
  const key = scopesKey(scopes);
  const now = Date.now();
  if (
    accessTokenCache &&
    accessTokenCache.scopesKey === key &&
    accessTokenCache.expiresAt > now + 60_000
  ) {
    return accessTokenCache.token;
  }
  const client = getJwt(scopes);
  const res = await client.getAccessToken();
  const token = res.token;
  if (!token) throw new Error("Failed to obtain Google access token");
  accessTokenCache = { token, expiresAt: now + 3_300_000, scopesKey: key };
  return token;
}
