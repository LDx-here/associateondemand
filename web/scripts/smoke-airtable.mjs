#!/usr/bin/env node
/**
 * Phase 1 readiness check (BUILD_SPEC §2).
 *
 * Reads `web/.env.local` directly so it works whether or not Next.js's
 * env loader is available. Reports per-table record counts and surfaces
 * which BUILD_SPEC tables are missing in the live base.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_WEB = resolve(__dirname, "..");
const ENV_PATH = resolve(REPO_WEB, ".env.local");

function loadEnv(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith("\"") && v.endsWith("\"")) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[key] = v;
  }
  return out;
}

const fileEnv = loadEnv(ENV_PATH);
const TOKEN = process.env.AIRTABLE_PAT ?? fileEnv.AIRTABLE_PAT;
const BASE = process.env.AIRTABLE_BASE_ID ?? fileEnv.AIRTABLE_BASE_ID;

if (!TOKEN || !BASE) {
  console.error("Missing AIRTABLE_PAT or AIRTABLE_BASE_ID in web/.env.local");
  process.exit(1);
}

// BUILD_SPEC §2 tables the app reads from (live in this base).
const TABLES_TO_CHECK = [
  "Matters",
  "Contacts",
  "Tasks",
  "Notes",
  "Documents",
  "Legal Elements",
  "PM Inbox",
  "People",
  "Events",
  "Strategy Patterns",
  "Corrections",
];

async function countTable(name) {
  const url = `https://api.airtable.com/v0/${BASE}/${encodeURIComponent(name)}?maxRecords=100`;
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${TOKEN}` },
    cache: "no-store",
  });
  if (!resp.ok) {
    const text = await resp.text();
    return { ok: false, status: resp.status, error: text.slice(0, 200) };
  }
  const payload = await resp.json();
  return { ok: true, count: payload.records?.length ?? 0 };
}

const results = [];
for (const name of TABLES_TO_CHECK) {
  const r = await countTable(name);
  results.push({ name, ...r });
  if (r.ok) {
    console.log(`OK    ${name.padEnd(20)} sample records: ${r.count}`);
  } else {
    console.log(`FAIL  ${name.padEnd(20)} ${r.status} ${r.error}`);
  }
}

const failed = results.filter((r) => !r.ok);
if (failed.length === 0) {
  console.log(`\nAll ${TABLES_TO_CHECK.length} BUILD_SPEC tables reachable in base ${BASE}.`);
  process.exit(0);
} else {
  console.log(`\n${failed.length} of ${TABLES_TO_CHECK.length} tables failed. Run scripts/airtable-bootstrap.mjs or follow docs/runbooks/airtable-base-setup.md to create the missing tables.`);
  process.exit(failed.every((r) => r.status === 404 || /TABLE_NOT_FOUND|MODEL_NOT_FOUND/.test(r.error)) ? 0 : 1);
}
