#!/usr/bin/env node
/**
 * AssociateOnDemand — one-shot Airtable schema bootstrap.
 *
 * Idempotently creates the four BUILD_SPEC §2 tables that the live base is
 * missing: People, Events, Strategy Patterns, Corrections.
 *
 * Reads AIRTABLE_PAT + AIRTABLE_BASE_ID from web/.env.local (gitignored).
 *
 * Requirements on the PAT:
 *   - schema.bases:read   (always required)
 *   - schema.bases:write  (required to create tables programmatically)
 *
 * If schema.bases:write is missing the script captures the 403 and reminds
 * the operator to add the scope (or follow docs/runbooks/airtable-base-setup.md).
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

const fileEnv = loadEnv(ENV_PATH);
const PAT = process.env.AIRTABLE_PAT ?? fileEnv.AIRTABLE_PAT;
const BASE_ID = process.env.AIRTABLE_BASE_ID ?? fileEnv.AIRTABLE_BASE_ID;

if (!PAT || !BASE_ID) {
  console.error(
    "ERROR: AIRTABLE_PAT and AIRTABLE_BASE_ID must be set in web/.env.local (or the environment)."
  );
  process.exit(1);
}

const META = `https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables`;

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

// Field type definitions follow BUILD_SPEC §2.
// Note: in the Airtable Meta API, primary fields cannot be Autonumber;
// they must be singleLineText (or another text-like type). We model the
// "_id" autonumber columns from BUILD_SPEC by promoting a human-readable
// primary (`name`/`description`/`pattern_id`/`correction_id`) and letting
// Airtable assign rowIds. Autonumber fields are added as secondary columns
// where useful.

const TABLES_TO_CREATE = [
  {
    name: "People",
    description: "BUILD_SPEC §2 Table 8 — firm staff and AI associates.",
    fields: [
      {
        name: "name",
        type: "singleLineText",
        description: "Display name (primary).",
      },
      {
        name: "person_id",
        type: "autoNumber",
        description: "Unique ID.",
      },
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
      { name: "is_active", type: "checkbox", options: { color: "greenBright", icon: "check" } },
    ],
  },
  {
    name: "Events",
    description: "BUILD_SPEC §2 Table 7 — hearings, filing deadlines, internal reminders.",
    fields: [
      {
        name: "description",
        type: "singleLineText",
        description: "Short event description (primary).",
      },
      { name: "event_id", type: "autoNumber" },
      {
        name: "matter_id",
        type: "multipleRecordLinks",
        options: { linkedTableId: null /* resolved at runtime */ },
        // We patch linkedTableId after we know the Matters table id.
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
      { name: "long_description", type: "multilineText" },
      { name: "location", type: "singleLineText" },
      {
        name: "calendar_synced",
        type: "checkbox",
        options: { color: "greenBright", icon: "check" },
      },
      { name: "google_calendar_id", type: "singleLineText" },
      { name: "created_at", type: "createdTime", options: { result: { type: "dateTime", options: { dateFormat: { name: "iso" }, timeFormat: { name: "24hour" }, timeZone: "America/New_York" } } } },
    ],
  },
  {
    name: "Strategy Patterns",
    description: "BUILD_SPEC §2 Table 10 — Pattern Agent strategy memory.",
    fields: [
      {
        name: "fact_pattern",
        type: "multilineText",
        description: "Short description of the fact pattern (primary).",
      },
      { name: "pattern_id", type: "autoNumber" },
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
      {
        name: "confidence",
        type: "number",
        options: { precision: 0 },
      },
      { name: "correction_note", type: "multilineText" },
      {
        name: "created_by",
        type: "multipleRecordLinks",
        options: { linkedTableId: null /* People */ },
      },
      { name: "created_at", type: "createdTime", options: { result: { type: "dateTime", options: { dateFormat: { name: "iso" }, timeFormat: { name: "24hour" }, timeZone: "America/New_York" } } } },
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
      { name: "correction_id", type: "autoNumber" },
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
      { name: "created_at", type: "createdTime", options: { result: { type: "dateTime", options: { dateFormat: { name: "iso" }, timeFormat: { name: "24hour" }, timeZone: "America/New_York" } } } },
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

async function main() {
  console.log(`Bootstrapping schema in base ${BASE_ID}...`);
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
        // Stop further attempts — once 403 always 403.
        break;
      } else {
        results.push({ name: tableSpec.name, action: "failed", message: err.message });
      }
    }
  }

  console.log("\nSummary:");
  for (const r of results) {
    console.log(`  ${r.action.padEnd(10)} ${r.name}${r.id ? "  " + r.id : ""}${r.message ? "  " + r.message : ""}`);
  }
}

main().catch((err) => {
  console.error("Bootstrap crashed:", err);
  process.exit(2);
});
