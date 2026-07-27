/**
 * Creates the AOD firm spreadsheet (tabs + headers) using the logged-in gcloud user.
 * Run via scripts/setup-google-sheets.sh after gcloud auth login.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import { execSync } from "node:child_process";

import {
  SEED_SPREADSHEET_TITLE,
  SHEET_TABS,
  TAB_HEADERS,
} from "../src/lib/google-sheets/schema.ts";

function gcloudAccessToken() {
  try {
    return execSync("gcloud auth print-access-token", { encoding: "utf8" }).trim();
  } catch {
    throw new Error(
      "No gcloud access token. Run: gcloud auth login && gcloud auth application-default login",
    );
  }
}

function parseArgs(argv) {
  let serviceAccountEmail = process.env.AOD_SERVICE_ACCOUNT_EMAIL?.trim() || "";
  let credsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim() || "";
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--service-account-email" && argv[i + 1]) {
      serviceAccountEmail = argv[++i];
    } else if (argv[i] === "--credentials" && argv[i + 1]) {
      credsPath = argv[++i];
    }
  }
  if (!serviceAccountEmail && credsPath && fs.existsSync(credsPath)) {
    const json = JSON.parse(fs.readFileSync(credsPath, "utf8"));
    serviceAccountEmail = json.client_email || "";
  }
  assert.ok(
    serviceAccountEmail,
    "Service account email required (--service-account-email or GOOGLE_APPLICATION_CREDENTIALS)",
  );
  return { serviceAccountEmail };
}

async function api(token, url, init = {}) {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${init.method || "GET"} ${url} → ${res.status}: ${text.slice(0, 500)}`);
  }
  return text ? JSON.parse(text) : {};
}

function tabOrder() {
  return Object.keys(SHEET_TABS).map((key) => ({
    key,
    title: SHEET_TABS[key],
    headers: [...TAB_HEADERS[key]],
  }));
}

async function createSpreadsheet(token) {
  const tabs = tabOrder();
  const created = await api(token, "https://sheets.googleapis.com/v4/spreadsheets", {
    method: "POST",
    body: JSON.stringify({
      properties: { title: SEED_SPREADSHEET_TITLE },
      sheets: tabs.map((t) => ({ properties: { title: t.title } })),
    }),
  });

  const spreadsheetId = created.spreadsheetId;
  const sheetIdByTitle = new Map(
    (created.sheets || []).map((s) => [s.properties.title, s.properties.sheetId]),
  );

  const requests = [];
  for (const tab of tabs) {
    const sheetId = sheetIdByTitle.get(tab.title);
    assert.ok(sheetId != null, `Missing sheetId for ${tab.title}`);
    requests.push({
      updateCells: {
        rows: [
          {
            values: tab.headers.map((h) => ({
              userEnteredValue: { stringValue: h },
            })),
          },
        ],
        fields: "userEnteredValue",
        start: { sheetId, rowIndex: 0, columnIndex: 0 },
      },
    });
  }

  // Optional seed matter (Matters tab)
  const mattersSheetId = sheetIdByTitle.get(SHEET_TABS.matters);
  if (mattersSheetId != null) {
    const seed = [
      "gs-mat-seed1",
      "AOD-1001",
      "Sample overflow matter",
      "General Asylum",
      "",
      "",
      "",
      "",
      "Open",
      "",
      "",
      "",
      "",
      new Date().toISOString(),
      new Date().toISOString(),
    ];
    requests.push({
      updateCells: {
        rows: [
          {
            values: seed.map((v) => ({ userEnteredValue: { stringValue: v } })),
          },
        ],
        fields: "userEnteredValue",
        start: { sheetId: mattersSheetId, rowIndex: 1, columnIndex: 0 },
      },
    });
  }

  await api(
    token,
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
    {
      method: "POST",
      body: JSON.stringify({ requests }),
    },
  );

  return spreadsheetId;
}

async function shareWithServiceAccount(token, fileId, email) {
  await api(token, `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
    method: "POST",
    body: JSON.stringify({
      type: "user",
      role: "writer",
      emailAddress: email,
    }),
  });
}

const { serviceAccountEmail } = parseArgs(process.argv);
const token = gcloudAccessToken();
const spreadsheetId = await createSpreadsheet(token);
await shareWithServiceAccount(token, spreadsheetId, serviceAccountEmail);

const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
console.log(
  JSON.stringify(
    {
      spreadsheetId,
      spreadsheetUrl: url,
      serviceAccountEmail,
      title: SEED_SPREADSHEET_TITLE,
    },
    null,
    2,
  ),
);
