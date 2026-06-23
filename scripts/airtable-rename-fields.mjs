#!/usr/bin/env node
/**
 * AssociateOnDemand — Airtable field migration to BUILD_SPEC §2 snake_case.
 *
 * Renames existing fields on the 7 pre-existing tables (Matters, Contacts,
 * Tasks, Notes, Documents, Legal Elements, PM Inbox) to the BUILD_SPEC §2
 * snake_case names. Idempotent: re-running is a no-op once the rename has
 * been applied (the script checks the live schema first and skips fields
 * that already have the target name).
 *
 * Also:
 *   - Backs up `Matters.Client Name` to data/backups/airtable-client-names-<date>.jsonl
 *     before dropping that column (BUILD_SPEC §13.4 Tier-0 PII rule).
 *   - Adds the three missing PM Inbox columns (`options`, `resolution`,
 *     `resolved_at`) required by the new /inbox page and the durable
 *     PM-Inbox writer in `services/api`.
 *   - Adds a `Notes.type` single select so the Notes feed can distinguish
 *     attorney / agent / correction entries per BUILD_SPEC §7.3.3.
 *
 * Required PAT scopes: schema.bases:read, schema.bases:write,
 * data.records:read, data.records:write.
 *
 * Safe-mode flags:
 *   --dry-run      : log every operation without sending PATCH/DELETE/POST.
 *   --skip-drop    : skip the destructive `Client Name` DELETE (backup still runs).
 *   --backup-only  : only export the Client Name backup, then exit.
 */

import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const ENV_PATH = resolve(REPO_ROOT, "web/.env.local");
const BACKUP_DIR = resolve(REPO_ROOT, "data/backups");

const ARGS = new Set(process.argv.slice(2));
const DRY_RUN = ARGS.has("--dry-run");
const SKIP_DROP = ARGS.has("--skip-drop");
const BACKUP_ONLY = ARGS.has("--backup-only");

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

const fileEnv = loadEnv(ENV_PATH);
const PAT = process.env.AIRTABLE_PAT ?? fileEnv.AIRTABLE_PAT;
const BASE_ID = process.env.AIRTABLE_BASE_ID ?? fileEnv.AIRTABLE_BASE_ID;

if (!PAT || !BASE_ID) {
  console.error("ERROR: AIRTABLE_PAT and AIRTABLE_BASE_ID must be set in web/.env.local.");
  process.exit(1);
}

const META = `https://api.airtable.com/v0/meta/bases/${BASE_ID}`;
const DATA = `https://api.airtable.com/v0/${BASE_ID}`;

async function airtable(method, path, body) {
  const resp = await fetch(`${META.startsWith("https") ? "" : ""}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${PAT}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await resp.text();
  if (!resp.ok) {
    throw new Error(`${method} ${path} ${resp.status}: ${text}`);
  }
  return text ? JSON.parse(text) : null;
}

async function listTables() {
  const j = await airtable("GET", `${META}/tables`);
  return j.tables ?? [];
}

async function patchField(tableId, fieldId, patch) {
  if (DRY_RUN) {
    console.log(`  DRY  PATCH ${tableId}/${fieldId} ${JSON.stringify(patch)}`);
    return;
  }
  await airtable("PATCH", `${META}/tables/${tableId}/fields/${fieldId}`, patch);
}

async function createField(tableId, body) {
  if (DRY_RUN) {
    console.log(`  DRY  POST  ${tableId}/fields ${JSON.stringify(body).slice(0, 200)}`);
    return null;
  }
  return airtable("POST", `${META}/tables/${tableId}/fields`, body);
}

async function deleteField(tableId, fieldId) {
  if (DRY_RUN) {
    console.log(`  DRY  DELETE ${tableId}/${fieldId}`);
    return;
  }
  // DELETE on a field endpoint is not supported by every Airtable plan.
  // Try DELETE first; if 403/404, fall back to renaming the field to a
  // tombstone name so downstream code can ignore it.
  try {
    await airtable("DELETE", `${META}/tables/${tableId}/fields/${fieldId}`);
  } catch (err) {
    if (/40[34]/.test(err.message)) {
      console.warn(
        `  WARN  DELETE not allowed for ${fieldId}; renaming to DEPRECATED_client_name as a tombstone.`
      );
      await airtable("PATCH", `${META}/tables/${tableId}/fields/${fieldId}`, {
        name: "DEPRECATED_client_name",
      });
    } else {
      throw err;
    }
  }
}

async function listAllRecords(tableName, fields = []) {
  const all = [];
  let offset;
  do {
    const params = new URLSearchParams();
    params.set("pageSize", "100");
    for (const f of fields) params.append("fields[]", f);
    if (offset) params.set("offset", offset);
    const j = await airtable("GET", `${DATA}/${encodeURIComponent(tableName)}?${params}`);
    all.push(...(j.records ?? []));
    offset = j.offset;
  } while (offset);
  return all;
}

/**
 * Rename plan. The script never depends on a hard-coded field id — it
 * resolves each target field by NAME in the live schema, so this map
 * stays accurate even if Airtable regenerates ids.
 *
 * `add` entries are non-destructive new fields needed by PM-Inbox writes
 * (Item 2) and the new /inbox page (Item 3a).
 *
 * `drop` entries are destructive removals — backup must run first.
 */
const PLAN = {
  Matters: {
    renames: {
      "Matter ID": "matter_id",
      "Case Type": "case_type",
      "Status": "status",
      "Opened Date": "opened_date",
      "Attorney": "assigned_to",
      "Priority": "priority",
      "Next Deadline": "next_deadline",
      "Summary": "summary",
    },
    drop: ["Client Name"],
  },
  Contacts: {
    renames: {
      "Full Name": "display_name",
      "Role": "role",
      "Email": "email",
      "Phone": "phone",
      "Organization": "organization",
      "Notes": "notes",
    },
  },
  Tasks: {
    renames: {
      "Task": "description",
      "Matter ID": "matter_id",
      "Status": "status",
      "Priority": "priority",
      "Due Date": "due_date",
      "Assigned To": "assigned_to",
      "Created By": "created_from_agent",
    },
  },
  Notes: {
    renames: {
      "Note": "content",
      "Timestamp": "created_at",
      "Author": "author",
      "Linked Case": "matter_id",
    },
    add: [
      {
        name: "type",
        type: "singleSelect",
        options: {
          choices: [
            { name: "Attorney" },
            { name: "Agent" },
            { name: "Correction" },
            { name: "System" },
          ],
        },
      },
    ],
  },
  Documents: {
    renames: {
      "Document Name": "title",
      "Linked Case": "matter_id",
      "Upload Date": "created_at",
      "Document Type": "category",
      "Uploaded By": "uploaded_by",
    },
  },
  "Legal Elements": {
    renames: {
      "Element": "element_name",
      "Matter ID": "matter_id",
      "Assessment": "assessment",
      "Key Gap": "key_gap",
      "Next Action": "next_action",
      "Supporting Facts": "supporting_facts",
      "Sources": "supporting_cases",
    },
  },
  "PM Inbox": {
    renames: {
      "Title": "title",
      "Matter ID": "matter_id",
      "Agent": "agent",
      "What I Tried": "what_tried",
      "What I Need": "what_needed",
      "Status": "status",
      "Created": "created_at",
    },
    add: [
      {
        name: "options",
        type: "multilineText",
        description: "JSON array of resolution options for /inbox action buttons.",
      },
      {
        name: "resolution",
        type: "multilineText",
        description: "Attorney resolution note recorded when an inbox item is resolved.",
      },
      {
        name: "resolved_at",
        type: "dateTime",
        options: {
          dateFormat: { name: "iso" },
          timeFormat: { name: "24hour" },
          timeZone: "America/New_York",
        },
      },
    ],
  },
};

function ymd(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

async function backupClientNames(tables) {
  const matters = tables.find((t) => t.name === "Matters");
  if (!matters) return { count: 0, path: null, skipped: "Matters table not found" };
  const fieldNames = new Set(matters.fields.map((f) => f.name));
  const matterIdField = fieldNames.has("Matter ID")
    ? "Matter ID"
    : fieldNames.has("matter_id")
      ? "matter_id"
      : null;
  const clientNameField = fieldNames.has("Client Name")
    ? "Client Name"
    : fieldNames.has("DEPRECATED_client_name")
      ? "DEPRECATED_client_name"
      : null;
  if (!clientNameField) {
    console.log("BACKUP  Client Name column already removed/tombstoned — skipping backup.");
    return { count: 0, path: null, skipped: "no source column" };
  }
  const filename = `airtable-client-names-${ymd(new Date())}.jsonl`;
  const path = resolve(BACKUP_DIR, filename);
  if (existsSync(path)) {
    console.log(`BACKUP  ${path.replace(REPO_ROOT + "/", "")} already exists — skipping re-export.`);
    return { count: 0, path, skipped: "backup file exists" };
  }
  mkdirSync(BACKUP_DIR, { recursive: true });
  const requestFields = [clientNameField];
  if (matterIdField) requestFields.unshift(matterIdField);
  const rows = await listAllRecords("Matters", requestFields);
  const lines = [];
  for (const r of rows) {
    lines.push(
      JSON.stringify({
        record_id: r.id,
        matter_id: matterIdField ? (r.fields?.[matterIdField] ?? null) : null,
        client_name: r.fields?.[clientNameField] ?? null,
        backed_up_at: new Date().toISOString(),
      })
    );
  }
  writeFileSync(path, lines.join("\n") + (lines.length ? "\n" : ""), "utf8");
  console.log(`BACKUP  ${lines.length} rows -> ${path.replace(REPO_ROOT + "/", "")}`);
  return { count: lines.length, path };
}

async function applyTablePlan(tableName, table, plan) {
  console.log(`\n--- ${tableName} (${table.id})`);
  const byName = new Map(table.fields.map((f) => [f.name, f]));

  const renamed = [];
  const skipped = [];
  const failed = [];
  for (const [oldName, newName] of Object.entries(plan.renames ?? {})) {
    if (byName.has(newName)) {
      skipped.push({ oldName, newName, reason: "already migrated" });
      continue;
    }
    const field = byName.get(oldName);
    if (!field) {
      skipped.push({ oldName, newName, reason: "field not found" });
      continue;
    }
    try {
      await patchField(table.id, field.id, { name: newName });
      console.log(`  OK    ${oldName.padEnd(20)} -> ${newName}`);
      renamed.push({ oldName, newName, fieldId: field.id });
    } catch (err) {
      console.error(`  FAIL  ${oldName} -> ${newName}: ${err.message}`);
      failed.push({ oldName, newName, error: err.message });
    }
  }

  const added = [];
  for (const fieldDef of plan.add ?? []) {
    if (byName.has(fieldDef.name)) {
      skipped.push({ newName: fieldDef.name, reason: "already exists" });
      continue;
    }
    try {
      const created = await createField(table.id, fieldDef);
      console.log(`  OK    + ${fieldDef.name} (${fieldDef.type})${created?.id ? `  id=${created.id}` : ""}`);
      added.push({ name: fieldDef.name, id: created?.id });
    } catch (err) {
      console.error(`  FAIL  + ${fieldDef.name}: ${err.message}`);
      failed.push({ newName: fieldDef.name, error: err.message });
    }
  }

  const dropped = [];
  if (!SKIP_DROP) {
    for (const fieldName of plan.drop ?? []) {
      const field = byName.get(fieldName);
      if (!field) {
        skipped.push({ oldName: fieldName, reason: "already dropped" });
        continue;
      }
      try {
        await deleteField(table.id, field.id);
        console.log(`  OK    - dropped ${fieldName}`);
        dropped.push({ name: fieldName, fieldId: field.id });
      } catch (err) {
        console.error(`  FAIL  drop ${fieldName}: ${err.message}`);
        failed.push({ oldName: fieldName, error: err.message });
      }
    }
  }

  return { renamed, added, dropped, skipped, failed };
}

async function main() {
  console.log(
    `Airtable field migration — base ${BASE_ID}${
      DRY_RUN ? " [DRY RUN]" : ""
    }${SKIP_DROP ? " [SKIP DROP]" : ""}${BACKUP_ONLY ? " [BACKUP ONLY]" : ""}`
  );

  const tables = await listTables();
  const byName = new Map(tables.map((t) => [t.name, t]));

  const backup = await backupClientNames(tables);
  if (BACKUP_ONLY) {
    console.log("Backup-only mode: exiting without schema changes.");
    return;
  }

  const summary = {};
  for (const [tableName, plan] of Object.entries(PLAN)) {
    const t = byName.get(tableName);
    if (!t) {
      console.warn(`SKIP table ${tableName} — not found in base.`);
      continue;
    }
    summary[tableName] = await applyTablePlan(tableName, t, plan);
  }

  console.log("\n=== Migration summary");
  let totalRenamed = 0,
    totalAdded = 0,
    totalDropped = 0,
    totalFailed = 0;
  for (const [tableName, r] of Object.entries(summary)) {
    totalRenamed += r.renamed.length;
    totalAdded += r.added.length;
    totalDropped += r.dropped.length;
    totalFailed += r.failed.length;
    console.log(
      `  ${tableName.padEnd(18)} renamed=${r.renamed.length}  added=${r.added.length}  dropped=${r.dropped.length}  skipped=${r.skipped.length}  failed=${r.failed.length}`
    );
  }
  console.log(
    `\nTOTAL renamed=${totalRenamed} added=${totalAdded} dropped=${totalDropped} failed=${totalFailed}`
  );
  if (backup.path) {
    console.log(
      `PII backup: ${backup.count} rows -> ${backup.path.replace(REPO_ROOT + "/", "")}` +
        (backup.skipped ? `  (${backup.skipped})` : "")
    );
  } else if (backup.skipped) {
    console.log(`PII backup: skipped (${backup.skipped})`);
  }
}

main().catch((err) => {
  console.error("Migration crashed:", err);
  process.exit(2);
});
