/**
 * Google Sheets adapter smoke tests (offline-safe; live API optional).
 */
import assert from "node:assert/strict";

import { TAB_HEADERS, SHEET_TABS } from "../src/lib/google-sheets/schema";
import {
  getDataStoreKind,
  isDemoMode,
  isGoogleSheetsConfigured,
} from "../src/lib/data-store-config";

assert.equal(SHEET_TABS.matters, "Matters");
assert.equal(SHEET_TABS.notes, "Notes");
assert.ok(TAB_HEADERS.matters.includes("matter_id"));
assert.ok(TAB_HEADERS.notes.includes("content"));

// Without env creds, should be demo unless Airtable is configured
if (!process.env.GOOGLE_SHEETS_SPREADSHEET_ID) {
  assert.equal(isGoogleSheetsConfigured(), false);
}

const kind = getDataStoreKind();
assert.ok(["google_sheets", "airtable", "demo"].includes(kind));

if (!process.env.AIRTABLE_PAT && !process.env.GOOGLE_SHEETS_SPREADSHEET_ID) {
  assert.equal(isDemoMode(), true);
}

console.log("google-sheets verify OK", { kind, demo: isDemoMode() });
