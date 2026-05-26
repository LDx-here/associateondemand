#!/usr/bin/env node
/**
 * AssociateOnDemand — one-shot Airtable schema bootstrap.
 *
 * Idempotently creates the four BUILD_SPEC §2 tables that the live base is
 * missing: People, Events, Strategy Patterns, Corrections.
 *
 * Reads AIRTABLE_PAT + AIRTABLE_BASE_ID from web/.env.local (gitignored).
 *
 * Required PAT scopes:
 *   - schema.bases:read   (list existing tables)
 *   - schema.bases:write  (create new tables)
 *   - data.records:write  (only for the post-create People seed)
 *
 * BUILD_SPEC §2 deviation — `autoNumber` primary fields.
 * The Airtable Meta API currently returns
 * `UNSUPPORTED_FIELD_TYPE_FOR_CREATE — Creating autoNumber fields is not
 * supported at this time` (verified 2026-05-26). Per the BUILD_SPEC gap
 * audit "Schema Adaptations" section, we substitute a human-readable
 * Single line text primary for each of the 4 new tables and rely on
 * Airtable's built-in `recXXXXXXXXXXXXXX` record IDs for linked relations.
 * See docs/constitution/BUILD_SPEC-GAP-AUDIT.md.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const ENV_PATH = resolve(REPO_ROOT, "web/.env.local");

function loadEnv(path) {
  if (!existsSync(path)) return {};
  const raw = readFileSync(path, "utf8");
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function redact(value) {
  if (!value) return "(missing)";
  if (value.length <= 8) return "********";
  return `${value.slice(0, 4)}…${value.slice(-2)}`;
}

const fileEnv = loadEnv(ENV_PATH);
const PAT = process.env.AIRTABLE_PAT ?? fileEnv.AIRTABLE_PAT;
const BASE_ID = process.env.AIRTABLE_BASE_ID ?? fileEnv.AIRTABLE_BASE_ID;

if (!PAT || !BASE_ID) {
  console.error(
    "ERROR: AIRTABLE_PAT and AIRTABLE_BASE_ID must be set in web/.env.local (or the environment)."
  );
  process.exit(1);
}

console.log(`PAT ${redact(PAT)}, base ${BASE_ID}`);

const META = `https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables`;
const DATA = `https://api.airtable.com/v0/${BASE_ID}`;

async function listTables() {
  const resp = await fetch(META, {
    headers: { Authorization: `Bearer ${PAT}` },
  });
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`GET tables ${resp.status}: ${body}`);
  }
  const json = await resp.json();
  return json.tables ?? [];
}

async function createTable(payload) {
  const resp = await fetch(META, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAT}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`POST tables ${resp.status}: ${body}`);
  }
  return resp.json();
}

async function listRecords(tableName, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const resp = await fetch(`${DATA}/${encodeURIComponent(tableName)}?${qs}`, {
    headers: { Authorization: `Bearer ${PAT}` },
  });
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`GET ${tableName} ${resp.status}: ${body}`);
  }
  return resp.json();
}

async function createRecord(tableName, fields) {
  const resp = await fetch(`${DATA}/${encodeURIComponent(tableName)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAT}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields }),
  });
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`POST ${tableName} record ${resp.status}: ${body}`);
  }
  return resp.json();
}

/**
 * BUILD_SPEC §2 calls for `created_at = Created time`. The Meta API rejects
 * `createdTime` field creation (`UNSUPPORTED_FIELD_TYPE_FOR_CREATE — Creating
 * createdTime fields is not supported at this time`, verified 2026-05-26).
 * Substitute a plain `dateTime` field; the API layer / agents are responsible
 * for setting `created_at` to `new Date().toISOString()` on insert. See
 * docs/constitution/BUILD_SPEC-GAP-AUDIT.md "Schema Adaptations".
 */
const createdAtDateTime = {
  type: "dateTime",
  options: {
    dateFormat: { name: "iso" },
    timeFormat: { name: "24hour" },
    timeZone: "America/New_York",
  },
};

/**
 * Table specifications.
 *
 * Primary fields cannot be `autoNumber` (Meta API restriction). We use a
 * human-readable `singleLineText` primary; relations use Airtable's
 * built-in `recXXXXXXXXXXXXXX` record IDs.
 */
const TABLES_TO_CREATE = [
  {
    name: "People",
    description: "BUILD_SPEC §2 Table 8 — firm staff and AI associates.",
    fields: [
      { name: "name", type: "singleLineText", description: "Display name (primary)." },
      {
        name: "role",
        type: "singleSelect",
        options: {
          choices: [
            { name: "Attorney" },
            { name: "Caseworker" },
            { name: "Paralegal" },
            { name: "AI Associate" },
            { name: "Admin" },
          ],
        },
      },
      { name: "email", type: "email" },
      {
        name: "is_active",
        type: "checkbox",
        options: { color: "greenBright", icon: "check" },
      },
    ],
  },
  {
    name: "Events",
    description: "BUILD_SPEC §2 Table 7 — hearings, filing deadlines, internal reminders.",
    fields: [
      {
        name: "summary",
        type: "singleLineText",
        description: "Short event summary (primary). Long-form goes in `description`.",
      },
      {
        name: "matter_id",
        type: "multipleRecordLinks",
        options: { linkedTableId: null },
      },
      {
        name: "type",
        type: "singleSelect",
        options: {
          choices: [
            { name: "Hearing" },
            { name: "Filing Deadline" },
            { name: "Internal Deadline" },
            { name: "Reminder" },
            { name: "Court Date" },
          ],
        },
      },
      { name: "date", type: "date", options: { dateFormat: { name: "iso" } } },
      { name: "time", type: "singleLineText" },
      { name: "description", type: "multilineText" },
      { name: "location", type: "singleLineText" },
      {
        name: "calendar_synced",
        type: "checkbox",
        options: { color: "greenBright", icon: "check" },
      },
      { name: "google_calendar_id", type: "singleLineText" },
      { name: "created_at", ...createdAtDateTime },
    ],
  },
  {
    name: "Strategy Patterns",
    description: "BUILD_SPEC §2 Table 10 — Pattern Agent strategy memory.",
    fields: [
      {
        name: "fact_pattern",
        type: "singleLineText",
        description: "Short label for the fact pattern (primary). Long-form in `fact_pattern_detail`.",
      },
      { name: "fact_pattern_detail", type: "multilineText" },
      {
        name: "matching_matters",
        type: "multipleRecordLinks",
        options: { linkedTableId: null },
      },
      { name: "strategy_used", type: "multilineText" },
      {
        name: "outcome",
        type: "singleSelect",
        options: {
          choices: [
            { name: "Granted" },
            { name: "Denied" },
            { name: "Pending" },
            { name: "Withdrawn" },
            { name: "Settled" },
            { name: "Unknown" },
          ],
        },
      },
      { name: "confidence", type: "number", options: { precision: 0 } },
      { name: "correction_note", type: "multilineText" },
      {
        name: "created_by",
        type: "multipleRecordLinks",
        options: { linkedTableId: null /* People */ },
      },
      { name: "created_at", ...createdAtDateTime },
    ],
  },
  {
    name: "Corrections",
    description: "BUILD_SPEC §2 Table 11 — attorney corrections training log.",
    fields: [
      {
        name: "agent",
        type: "singleLineText",
        description: "Agent name that produced the original output (primary).",
      },
      {
        name: "matter_id",
        type: "multipleRecordLinks",
        options: { linkedTableId: null /* Matters */ },
      },
      { name: "original_output", type: "multilineText" },
      { name: "attorney_edit", type: "multilineText" },
      {
        name: "correction_type",
        type: "singleSelect",
        options: {
          choices: [
            { name: "Factual" },
            { name: "Classification" },
            { name: "Convention" },
            { name: "Analytical" },
            { name: "False Positive" },
            { name: "False Negative" },
          ],
        },
      },
      { name: "reason", type: "multilineText" },
      {
        name: "applied_to",
        type: "singleSelect",
        options: {
          choices: [
            { name: "firm-rules.md" },
            { name: "Strategy Patterns" },
            { name: "categorizer-examples.jsonl" },
            { name: "Notes only" },
          ],
        },
      },
      { name: "created_at", ...createdAtDateTime },
    ],
  },
];

function resolveLinks(payload, tablesByName) {
  const mattersId = tablesByName.get("Matters")?.id;
  const peopleId = tablesByName.get("People")?.id;
  for (const f of payload.fields) {
    if (f.type !== "multipleRecordLinks") continue;
    if (f.name === "matter_id" || f.name === "matching_matters") {
      if (!mattersId) {
        throw new Error(
          `Cannot create ${payload.name}.${f.name} — Matters table id not found.`
        );
      }
      f.options = { linkedTableId: mattersId };
    } else if (f.name === "created_by") {
      if (!peopleId) {
        throw new Error(
          `Cannot create ${payload.name}.${f.name} — People table id not found (create People first).`
        );
      }
      f.options = { linkedTableId: peopleId };
    }
  }
  return payload;
}

async function seedFoundationalPerson(byName) {
  const peopleTable = byName.get("People");
  if (!peopleTable) {
    console.log("SEED  People table not present — skipping seed.");
    return;
  }
  const seedName = "La'Dajia Ferguson";
  const existing = await listRecords("People", {
    filterByFormula: `LOWER({name}) = '${seedName.toLowerCase().replace(/'/g, "\\'")}'`,
    maxRecords: "1",
  });
  if (existing.records?.length) {
    console.log(`SEED  People already has ${seedName} (id=${existing.records[0].id}) — skipping seed.`);
    return;
  }
  const created = await createRecord("People", {
    name: seedName,
    role: "Attorney",
    email: "ladajia@recovermyvalue.com",
    is_active: true,
  });
  console.log(`SEED  People <- ${seedName} (id=${created.id})`);
}

async function main() {
  console.log(`Bootstrapping schema in base ${BASE_ID}…`);
  let existing;
  try {
    existing = await listTables();
  } catch (err) {
    console.error("Failed to list tables:", err.message);
    if (String(err.message).includes("403")) {
      console.error(
        "\nAdd `schema.bases:read` (and `schema.bases:write`) to the PAT and re-run.\n" +
          "Fallback: follow docs/runbooks/airtable-base-setup.md to create the tables by hand."
      );
    }
    process.exit(2);
  }

  const byName = new Map(existing.map((t) => [t.name, t]));
  console.log(`Found ${existing.length} existing tables: ${existing.map((t) => t.name).join(", ")}`);

  const results = [];
  for (const tableSpec of TABLES_TO_CREATE) {
    if (byName.has(tableSpec.name)) {
      console.log(`SKIP  ${tableSpec.name} (id=${byName.get(tableSpec.name).id})`);
      results.push({ name: tableSpec.name, id: byName.get(tableSpec.name).id, action: "skipped" });
      continue;
    }
    try {
      const payload = resolveLinks(JSON.parse(JSON.stringify(tableSpec)), byName);
      const created = await createTable(payload);
      byName.set(created.name, created);
      console.log(`OK    ${created.name} created — id=${created.id}`);
      results.push({ name: created.name, id: created.id, action: "created" });
    } catch (err) {
      console.error(`FAIL  ${tableSpec.name}: ${err.message}`);
      if (String(err.message).includes("403")) {
        console.error(
          "\nThe PAT is missing `schema.bases:write`. Add the scope at https://airtable.com/create/tokens\n" +
            "and re-run, OR follow docs/runbooks/airtable-base-setup.md to create the table by hand."
        );
        results.push({ name: tableSpec.name, action: "forbidden", message: err.message });
        break;
      } else {
        results.push({ name: tableSpec.name, action: "failed", message: err.message });
      }
    }
  }

  try {
    await seedFoundationalPerson(byName);
  } catch (err) {
    console.error(`SEED  failed: ${err.message}`);
  }

  console.log("\nSummary:");
  for (const r of results) {
    console.log(
      `  ${r.action.padEnd(10)} ${r.name}${r.id ? "  " + r.id : ""}${r.message ? "  " + r.message : ""}`
    );
  }
}

main().catch((err) => {
  console.error("Bootstrap crashed:", err);
  process.exit(2);
});
