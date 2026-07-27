import { NextResponse } from "next/server";

import {
  dataStoreLabel,
  getDataStoreKind,
  isDemoMode,
  isGoogleSheetsConfigured,
} from "@/lib/data-store-config";
import { getSpreadsheetExportUrl, getSpreadsheetUrl } from "@/lib/google-sheets/client";
import { SHEET_TABS } from "@/lib/google-sheets/schema";

export const dynamic = "force-dynamic";

/** Data store status for Settings / Help (no secrets). */
export async function GET() {
  const kind = getDataStoreKind();
  const spreadsheetUrl = isGoogleSheetsConfigured() ? getSpreadsheetUrl() : null;
  const exportCsvUrl = isGoogleSheetsConfigured() ? getSpreadsheetExportUrl("csv") : null;

  return NextResponse.json({
    kind,
    label: dataStoreLabel(),
    demo: isDemoMode(),
    spreadsheetUrl,
    exportCsvUrl,
    tabs: Object.values(SHEET_TABS),
    envHint: isDemoMode()
      ? "Set GOOGLE_SHEETS_SPREADSHEET_ID + GOOGLE_SERVICE_ACCOUNT_JSON (or GOOGLE_APPLICATION_CREDENTIALS) on Vercel."
      : null,
  });
}
