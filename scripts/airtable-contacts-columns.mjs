#!/usr/bin/env node
/**
 * AssociateOnDemand — provision BUILD_SPEC §2 Contacts.linked_matters
 * (multipleRecordLinks → Matters). Idempotent.
 *
 * Required PAT scopes: schema.bases:read, schema.bases:write.
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
  console.error("Missing AIRTABLE_PAT / AIRTABLE_BASE_ID in web/.env.local.");
  process.exit(1);
}

const META = `https://api.airtable.com/v0/meta/bases/${BASE}`;

async function airtable(method, url, body) {
  const resp = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${PAT}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await resp.text();
  const json = text ? JSON.parse(text) : null;
  if (!resp.ok) {
    throw new Error(`${method} ${url} ${resp.status}: ${text}`);
  }
  return json;
}

const tables = (await airtable("GET", `${META}/tables`)).tables ?? [];
const contacts = tables.find((t) => t.name === "Contacts");
const matters = tables.find((t) => t.name === "Matters");
if (!contacts || !matters) {
  console.error("Contacts or Matters table missing from base.");
  process.exit(1);
}

const existing = contacts.fields.find((f) => f.name === "linked_matters");
if (existing) {
  console.log(`OK: linked_matters already present (${existing.id}).`);
  process.exit(0);
}

const created = await airtable("POST", `${META}/tables/${contacts.id}/fields`, {
  name: "linked_matters",
  type: "multipleRecordLinks",
  options: { linkedTableId: matters.id },
});
console.log(`Created linked_matters (${created.id}). Inverse field appears on Matters as "Contacts".`);
