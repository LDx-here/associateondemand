#!/usr/bin/env node
/**
 * AssociateOnDemand — idempotent BUILD_SPEC §2 Matters metadata backfill.
 *
 * Populates empty `title`, `country`, `posture` (and optionally `court`)
 * on live Matters rows. Never writes client PII (BUILD_SPEC §13.4).
 * Uses `data/backups/airtable-client-names-*.jsonl` only to infer country
 * context — never writes deprecated client names to Airtable.
 *
 * Skips fields that are already populated. Bumps `updated_at` on every
 * row that receives at least one new field value.
 *
 * Usage: node scripts/airtable-matters-metadata-backfill.mjs [--dry-run]
 */

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV_PATH = resolve(__dirname, "..", "web/.env.local");
const BACKUP_DIR = resolve(__dirname, "..", "data/backups");

const DRY_RUN = process.argv.includes("--dry-run");

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

const DATA = `https://api.airtable.com/v0/${BASE}`;

function airtable(method, url, body) {
  const args = ["-sS", "--fail-with-body", "-X", method, "-H", "@-"];
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
    throw new Error(`${method} ${url} curl exit=${proc.status}: ${(proc.stderr || proc.stdout || "").trim()}`);
  }
  const text = (proc.stdout || "").trim();
  return text ? JSON.parse(text) : null;
}

function isEmpty(v) {
  return v === null || v === undefined || String(v).trim() === "";
}

/** Writable `updated_at` in America/New_York (BUILD_SPEC §2). */
function nowEtIso() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (type) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}.000Z`;
}

function loadBackupHints() {
  /** matter_id -> country hint from deprecated backup (PII never written). */
  const hints = new Map();
  if (!existsSync(BACKUP_DIR)) return hints;
  const files = readdirSync(BACKUP_DIR).filter((f) => f.startsWith("airtable-client-names") && f.endsWith(".jsonl"));
  for (const file of files) {
    for (const line of readFileSync(resolve(BACKUP_DIR, file), "utf8").split(/\r?\n/)) {
      if (!line.trim()) continue;
      try {
        const row = JSON.parse(line);
        const mid = row.matter_id;
        if (!mid) continue;
        // Country hints aligned with runbook seed + backup surname context only.
        const countryByMatter = {
          "AOD-1001": "Guatemala",
          "AOD-1002": "Vietnam",
          "AOD-1003": "Philippines",
          "AOD-1004": "Nigeria",
          "AOD-1005": "Mexico",
        };
        if (countryByMatter[mid]) hints.set(mid, countryByMatter[mid]);
      } catch {
        // skip malformed lines
      }
    }
  }
  return hints;
}

function proposeTitle(matterId, f) {
  const ct = String(f.case_type ?? "");
  const sum = String(f.summary ?? "").toLowerCase();
  if (ct.includes("Asylum")) return `Asylum defense — ${matterId}`;
  if (ct.includes("Employment") || sum.includes("h-1b")) return `Employment-based petition — ${matterId}`;
  if (ct.includes("Cancellation")) return `Cancellation of removal — ${matterId}`;
  if (ct.includes("Adjustment")) return `Adjustment of status — ${matterId}`;
  if (ct) return `${ct} — ${matterId}`;
  return `Immigration matter — ${matterId}`;
}

function proposePosture(f) {
  const ct = String(f.case_type ?? "").toLowerCase();
  const status = String(f.status ?? "").toLowerCase();
  const sum = String(f.summary ?? "").toLowerCase();

  if (status === "closed") return "Closed";
  if (ct.includes("cancellation") || sum.includes("eoir") || sum.includes("removal proceeding")) {
    return "Removal Defense";
  }
  if (
    ct.includes("employment") ||
    ct.includes("adjustment") ||
    sum.includes("h-1b") ||
    sum.includes("i-485") ||
    sum.includes("uscis")
  ) {
    return "USCIS Application";
  }
  if (ct.includes("asylum")) {
    if (status === "filed" || sum.includes("affirmative") || sum.includes("uscis asylum")) {
      return "Affirmative";
    }
    return "Removal Defense";
  }
  if (status === "intake") return "Pre-Litigation";
  return "Pre-Litigation";
}

function proposeCourt(f) {
  const blob = `${f.summary ?? ""} ${f.case_type ?? ""}`.toLowerCase();
  if (blob.includes("sixth circuit")) return "Sixth Circuit";
  if (blob.includes("bia")) return "BIA";
  if (blob.includes("eoir") || blob.includes("immigration court")) return "Immigration Court";
  if (blob.includes("uscis") || blob.includes("h-1b") || blob.includes("i-485")) return "USCIS";
  return null;
}

function buildPatch(recordId, matterId, fields, countryHints) {
  const patch = {};
  const applied = [];

  if (isEmpty(fields.title)) {
    patch.title = proposeTitle(matterId, fields);
    applied.push(`title=${patch.title}`);
  }
  if (isEmpty(fields.country) && countryHints.has(matterId)) {
    patch.country = countryHints.get(matterId);
    applied.push(`country=${patch.country}`);
  }
  if (isEmpty(fields.posture)) {
    patch.posture = proposePosture(fields);
    applied.push(`posture=${patch.posture}`);
  }
  const court = proposeCourt(fields);
  if (isEmpty(fields.court) && court) {
    patch.court = court;
    applied.push(`court=${court}`);
  }
  // judge / next_hearing: only set when already present in another column — never invent
  if (Object.keys(patch).length > 0) {
    patch.updated_at = nowEtIso();
    applied.push(`updated_at=${patch.updated_at}`);
  }
  return { patch, applied };
}

function listAllMatters() {
  const all = [];
  let offset;
  do {
    const params = new URLSearchParams({ pageSize: "100" });
    if (offset) params.set("offset", offset);
    const j = airtable("GET", `${DATA}/Matters?${params}`);
    all.push(...(j.records ?? []));
    offset = j.offset;
  } while (offset);
  return all;
}

function main() {
  console.log(`Matters metadata backfill (base ${BASE})${DRY_RUN ? " [DRY RUN]" : ""}…`);
  const countryHints = loadBackupHints();
  const rows = listAllMatters();
  console.log(`Found ${rows.length} Matters row(s).\n`);

  let patched = 0;
  let skipped = 0;
  const report = [];

  for (const row of rows) {
    const matterId = String(row.fields.matter_id ?? row.id);
    const { patch, applied } = buildPatch(row.id, matterId, row.fields, countryHints);
    if (applied.length === 0) {
      skipped += 1;
      console.log(`SKIP  ${matterId} — all target fields already populated`);
      report.push({ matterId, fieldsSet: [] });
      continue;
    }
    if (DRY_RUN) {
      console.log(`DRY   ${matterId} would set: ${applied.join(", ")}`);
      report.push({ matterId, fieldsSet: applied });
      continue;
    }
    airtable("PATCH", `${DATA}/Matters/${row.id}`, { fields: patch, typecast: true });
    patched += 1;
    console.log(`OK    ${matterId} — ${applied.join(", ")}`);
    report.push({ matterId, fieldsSet: applied });
  }

  console.log("\nSummary:");
  console.log(`  patched: ${patched}`);
  console.log(`  skipped: ${skipped}`);
  console.log("\nPer-matter report:");
  for (const r of report) {
    console.log(`  ${r.matterId} → ${r.fieldsSet.length ? r.fieldsSet.join("; ") : "(none)"}`);
  }
}

try {
  main();
} catch (err) {
  console.error("matters-metadata-backfill crashed:", err.message);
  process.exit(2);
}
