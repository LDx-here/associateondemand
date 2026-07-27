/**
 * Data store selection: Google Sheets (preferred) or Airtable (legacy fallback).
 *
 * Set `DATA_STORE=google_sheets` or `DATA_STORE=airtable` to force a backend.
 * When unset, Google Sheets wins if configured; otherwise Airtable; otherwise demo mode.
 */

export type DataStoreKind = "google_sheets" | "airtable" | "demo";

function loadServiceAccountEmail(): string | null {
  const inline = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (inline) {
    try {
      const parsed = JSON.parse(inline) as { client_email?: string };
      return parsed.client_email?.trim() || null;
    } catch {
      return null;
    }
  }
  return process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim() || null;
}

export function isAirtableConfigured(): boolean {
  return Boolean(process.env.AIRTABLE_PAT && process.env.AIRTABLE_BASE_ID);
}

export function isGoogleSheetsConfigured(): boolean {
  return Boolean(process.env.GOOGLE_SHEETS_SPREADSHEET_ID?.trim() && loadServiceAccountEmail());
}

export function getDataStoreKind(): DataStoreKind {
  const forced = (process.env.DATA_STORE ?? "").trim().toLowerCase();
  if (forced === "airtable") {
    return isAirtableConfigured() ? "airtable" : "demo";
  }
  if (forced === "google_sheets") {
    return isGoogleSheetsConfigured() ? "google_sheets" : "demo";
  }
  if (isGoogleSheetsConfigured()) return "google_sheets";
  if (isAirtableConfigured()) return "airtable";
  return "demo";
}

export function isDemoMode(): boolean {
  if ((process.env.AOD_FORCE_DEMO_MODE ?? "").toLowerCase() === "true") return true;
  return getDataStoreKind() === "demo";
}

export function usesGoogleSheets(): boolean {
  return getDataStoreKind() === "google_sheets";
}

export function usesAirtable(): boolean {
  return getDataStoreKind() === "airtable";
}

export function dataStoreLabel(): string {
  switch (getDataStoreKind()) {
    case "google_sheets":
      return "Google Sheets";
    case "airtable":
      return "Airtable";
    default:
      return "Sample data";
  }
}
