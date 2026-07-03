#!/usr/bin/env node
/**
 * One-off migration: Notes.matter_id and Documents.matter_id were created
 * as `multipleRecordLinks` pointing at the legacy `Cases` table instead of
 * `Matters`. Every write through `createNoteInAirtable` / document upload
 * has been failing with `ROW_TABLE_DOES_NOT_MATCH_LINKED_TABLE` (discovered
 * 2026-06-16 while building assignment intake — both tables were 100%
 * empty in production, confirming zero notes/documents had ever saved).
 *
 * This script is idempotent:
 *   1. Renames the broken field to `DEPRECATED_<field>_wrong_link` (tombstone,
 *      same pattern as `DEPRECATED_client_name` on Matters).
 *   2. Creates a new field with the original name, correctly linked to Matters.
 *
 * No code changes are required afterward because `lib/airtable/fields.ts`
 * already references the field by name (`matter_id`).
 *
 * Usage: node scripts/airtable-fix-matter-links.mjs
 */
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envPath = path.join(__dirname, "..", "web", ".env.local");
  const raw = readFileSync(envPath, "utf-8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

loadEnv();

const BASE_ID = process.env.AIRTABLE_BASE_ID;
const PAT = process.env.AIRTABLE_PAT;
if (!BASE_ID || !PAT) {
  console.error("AIRTABLE_BASE_ID / AIRTABLE_PAT not set in web/.env.local");
  process.exit(1);
}

const META = `https://api.airtable.com/v0/meta/bases/${BASE_ID}`;

async function metaFetch(pathname, options = {}) {
  const resp = await fetch(`${META}${pathname}`, {
    ...options,
    headers: { Authorization: `Bearer ${PAT}`, "Content-Type": "application/json", ...(options.headers ?? {}) },
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(`${pathname} -> ${resp.status}: ${JSON.stringify(data)}`);
  return data;
}

async function getTables() {
  const data = await metaFetch("/tables");
  return data.tables;
}

async function fixTable(tableName, matterFieldName = "matter_id") {
  const tables = await getTables();
  const table = tables.find((t) => t.name === tableName);
  if (!table) throw new Error(`Table not found: ${tableName}`);
  const matters = tables.find((t) => t.name === "Matters");
  if (!matters) throw new Error("Matters table not found");

  const field = table.fields.find((f) => f.name === matterFieldName);
  if (!field) {
    console.log(`[${tableName}] field "${matterFieldName}" not found — skipping`);
    return;
  }
  if (field.type === "multipleRecordLinks" && field.options?.linkedTableId === matters.id) {
    console.log(`[${tableName}] "${matterFieldName}" already links to Matters — nothing to do`);
    return;
  }

  const tombstoneName = `DEPRECATED_${matterFieldName}_wrong_link`;
  const alreadyTombstoned = table.fields.some((f) => f.name === tombstoneName);
  if (!alreadyTombstoned) {
    console.log(`[${tableName}] renaming "${matterFieldName}" -> "${tombstoneName}"`);
    await metaFetch(`/tables/${table.id}/fields/${field.id}`, {
      method: "PATCH",
      body: JSON.stringify({ name: tombstoneName }),
    });
  } else {
    console.log(`[${tableName}] tombstone "${tombstoneName}" already exists — skipping rename`);
  }

  const refreshed = (await getTables()).find((t) => t.name === tableName);
  const alreadyRecreated = refreshed.fields.some(
    (f) => f.name === matterFieldName && f.type === "multipleRecordLinks" && f.options?.linkedTableId === matters.id,
  );
  if (alreadyRecreated) {
    console.log(`[${tableName}] "${matterFieldName}" already recreated correctly — done`);
    return;
  }

  console.log(`[${tableName}] creating correctly-linked "${matterFieldName}" -> Matters`);
  await metaFetch(`/tables/${table.id}/fields`, {
    method: "POST",
    body: JSON.stringify({
      name: matterFieldName,
      type: "multipleRecordLinks",
      options: { linkedTableId: matters.id },
    }),
  });
  console.log(`[${tableName}] done`);
}

async function main() {
  await fixTable("Notes");
  await fixTable("Documents");
  console.log("Migration complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
