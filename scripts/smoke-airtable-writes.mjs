#!/usr/bin/env node
/**
 * Smoke test for PM Inbox + Corrections writers (BUILD_SPEC §10 / §7.5).
 *
 * Posts one disposable row to each table via the Airtable REST API using
 * the same shape the FastAPI service writes. Verifies the row appears in
 * a follow-up list and then deletes it so the live base stays clean.
 *
 * Required PAT scopes: data.records:read, data.records:write.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

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
  console.error("Missing AIRTABLE_PAT / AIRTABLE_BASE_ID in web/.env.local");
  process.exit(1);
}

async function call(method, table, idOrPath, body) {
  const url = `https://api.airtable.com/v0/${BASE}/${encodeURIComponent(table)}${idOrPath ? "/" + idOrPath : ""}`;
  const resp = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${PAT}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await resp.text();
  if (!resp.ok) throw new Error(`${method} ${table} ${resp.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

const stamp = new Date().toISOString();

console.log("PM Inbox: create…");
const inbox = await call("POST", "PM Inbox", null, {
  typecast: true,
  fields: {
    title: `SMOKE inbox ${stamp}`,
    agent: "PM Orchestrator",
    what_tried: "Posted a smoke-test row from scripts/smoke-airtable-writes.mjs.",
    what_needed: "Attorney to verify durability and delete this row.",
    options: JSON.stringify(["Approve", "Reject"]),
    status: "Pending",
  },
});
console.log(`  created PM Inbox id=${inbox.id}`);

console.log("Corrections: create…");
const corr = await call("POST", "Corrections", null, {
  typecast: true,
  fields: {
    agent: "smoke-runner",
    original_output: "[smoke test] original agent output",
    attorney_edit: "[smoke test] attorney edit",
    correction_type: "Analytical",
    reason: "smoke test",
    applied_to: "Notes only",
    created_at: stamp,
  },
});
console.log(`  created Corrections id=${corr.id}`);

await new Promise((r) => setTimeout(r, 600));

console.log("Verifying via list…");
const inboxList = await call("GET", "PM Inbox", null);
const found = inboxList.records.find((r) => r.id === inbox.id);
console.log(`  PM Inbox visible: ${Boolean(found)}`);
const corrList = await call("GET", "Corrections", null);
const cfound = corrList.records.find((r) => r.id === corr.id);
console.log(`  Corrections visible: ${Boolean(cfound)}`);

console.log("Cleaning up…");
await call("DELETE", "PM Inbox", inbox.id);
await call("DELETE", "Corrections", corr.id);
console.log("Done.");
