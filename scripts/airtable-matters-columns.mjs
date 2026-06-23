#!/usr/bin/env node
/**
 * AssociateOnDemand — provision the BUILD_SPEC §2 Matters columns that
 * the live base is missing (`title`, `country`, `posture`, `court`,
 * `judge`, `next_hearing`, `assessment_data`, `created_at`, `updated_at`).
 *
 * Idempotent: lists the live Matters fields first and only POSTs the
 * ones that don't already exist. Run any number of times.
 *
 * After adding the columns, backfills `created_at` / `updated_at` on the
 * 5 existing rows from each row's Airtable `createdTime` system field.
 *
 * Required PAT scopes: schema.bases:read, schema.bases:write,
 * data.records:read, data.records:write.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV_PATH = resolve(__dirname, "..", "web/.env.local");

function loadEnv(p) {
  if (!existsSync(p)) return {};
  const out = {};
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[k] = v;
  }
  return out;
}

const env = loadEnv(ENV_PATH);
const PAT = process.env.AIRTABLE_PAT ?? env.AIRTABLE_PAT;
const BASE = process.env.AIRTABLE_BASE_ID ?? env.AIRTABLE_BASE_ID;
if (!PAT || !BASE) {
  console.error("Missing AIRTABLE_PAT / AIRTABLE_BASE_ID in web/.env.local.");
  process.exit(1);
}

const META = `https://api.airtable.com/v0/meta/bases/${BASE}`;
const DATA = `https://api.airtable.com/v0/${BASE}`;

/**
 * Some sandboxed runners deny Node's DNS resolver but still allow `curl`.
 * Shelling out via curl makes this script portable across both
 * environments. The PAT is passed through stdin to avoid leaking into
 * the process listing.
 */
function airtable(method, url, body) {
  const args = [
    "-sS",
    "--fail-with-body",
    "-X",
    method,
    "-H",
    "@-",
  ];
  if (body) {
    args.push("-H", "Content-Type: application/json", "--data-binary", JSON.stringify(body));
  }
  args.push(url);
  const proc = spawnSync("curl", args, {
    input: `Authorization: Bearer ${PAT}\n`,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  if (proc.status !== 0) {
    const stderr = (proc.stderr || "").trim();
    const stdout = (proc.stdout || "").trim();
    throw new Error(`${method} ${url} curl exit=${proc.status}: ${stderr || stdout}`);
  }
  const text = (proc.stdout || "").trim();
  return text ? JSON.parse(text) : null;
}

const dateTimeOpts = {
  dateFormat: { name: "iso" },
  timeFormat: { name: "24hour" },
  timeZone: "America/New_York",
};

/**
 * BUILD_SPEC §2 — fields to add to Matters. `created_at` / `updated_at`
 * are writable `dateTime` columns because the Airtable Meta API rejects
 * `createdTime` field creation on this plan (see BUILD_SPEC-GAP-AUDIT
 * "Schema Adaptations").
 */
const FIELDS_TO_ADD = [
  {
    name: "title",
    type: "singleLineText",
    description: "Short matter description (no PII per BUILD_SPEC §13.4).",
  },
  {
    name: "country",
    type: "singleLineText",
    description: "Country of origin.",
  },
  {
    name: "posture",
    type: "singleSelect",
    options: {
      choices: [
        { name: "Removal Defense" },
        { name: "Affirmative" },
        { name: "BIA Appeal" },
        { name: "Petition for Review" },
        { name: "USCIS Application" },
        { name: "Pre-Litigation" },
        { name: "Closed" },
      ],
    },
  },
  {
    name: "court",
    type: "singleLineText",
    description: "Immigration court / BIA / Sixth Circuit / USCIS.",
  },
  {
    name: "judge",
    type: "singleLineText",
    description: "Assigned IJ if known.",
  },
  {
    name: "next_hearing",
    type: "date",
    options: { dateFormat: { name: "iso" } },
  },
  {
    name: "assessment_data",
    type: "multilineText",
    description: "JSON blob from the Case Assessment table.",
  },
  {
    name: "created_at",
    type: "dateTime",
    options: dateTimeOpts,
    description:
      "Writable dateTime — set on insert (Meta API rejects createdTime field creation).",
  },
  {
    name: "updated_at",
    type: "dateTime",
    options: dateTimeOpts,
    description: "Writable dateTime — update on every PATCH.",
  },
];

function listMattersTable() {
  const json = airtable("GET", `${META}/tables`);
  const t = (json.tables ?? []).find((x) => x.name === "Matters");
  if (!t) throw new Error("Matters table not found in base.");
  return t;
}

function createField(tableId, fieldDef) {
  return airtable("POST", `${META}/tables/${tableId}/fields`, fieldDef);
}

function listAllRecords(table) {
  const all = [];
  let offset;
  do {
    const params = new URLSearchParams({ pageSize: "100" });
    if (offset) params.set("offset", offset);
    const j = airtable("GET", `${DATA}/${encodeURIComponent(table)}?${params}`);
    all.push(...(j.records ?? []));
    offset = j.offset;
  } while (offset);
  return all;
}

function patchRecord(table, recordId, fields) {
  return airtable("PATCH", `${DATA}/${encodeURIComponent(table)}/${recordId}`, {
    fields,
  });
}

function main() {
  console.log(`Provisioning Matters columns in base ${BASE}…`);
  const table = listMattersTable();
  const existingByName = new Set(table.fields.map((f) => f.name));

  const added = [];
  const skipped = [];
  const failed = [];
  for (const fieldDef of FIELDS_TO_ADD) {
    if (existingByName.has(fieldDef.name)) {
      skipped.push(fieldDef.name);
      console.log(`SKIP  ${fieldDef.name} (already present)`);
      continue;
    }
    try {
      const created = createField(table.id, fieldDef);
      added.push({ name: fieldDef.name, id: created.id });
      console.log(`OK    + ${fieldDef.name} (${fieldDef.type})  id=${created.id}`);
    } catch (err) {
      failed.push({ name: fieldDef.name, error: err.message });
      console.error(`FAIL  + ${fieldDef.name}: ${err.message}`);
    }
  }

  console.log("\nBackfilling created_at / updated_at…");
  const rows = listAllRecords("Matters");
  let backfilled = 0;
  let backfillSkipped = 0;
  for (const row of rows) {
    const ts = row.createdTime;
    if (!ts) continue;
    const hasCreated = row.fields?.created_at;
    const hasUpdated = row.fields?.updated_at;
    if (hasCreated && hasUpdated) {
      backfillSkipped += 1;
      continue;
    }
    const patch = {};
    if (!hasCreated) patch.created_at = ts;
    if (!hasUpdated) patch.updated_at = hasCreated ? hasCreated : ts;
    if (Object.keys(patch).length === 0) {
      backfillSkipped += 1;
      continue;
    }
    try {
      patchRecord("Matters", row.id, patch);
      backfilled += 1;
      console.log(`OK    backfilled ${row.id}`);
    } catch (err) {
      console.error(`FAIL  backfill ${row.id}: ${err.message}`);
    }
  }

  console.log("\nSummary:");
  console.log(`  added:           ${added.length}`);
  console.log(`  skipped:         ${skipped.length}`);
  console.log(`  failed:          ${failed.length}`);
  console.log(`  rows backfilled: ${backfilled}`);
  console.log(`  rows skipped:    ${backfillSkipped}`);
  if (added.length) {
    console.log("\nNew field ids:");
    for (const a of added) console.log(`  ${a.name.padEnd(18)} ${a.id}`);
  }
  if (failed.length) {
    console.log("\nFailures:");
    for (const f of failed) console.log(`  ${f.name}: ${f.error}`);
  }
}

try {
  main();
} catch (err) {
  console.error("matters-columns crashed:", err);
  process.exit(2);
}
