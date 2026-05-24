/**
 * Phase 1 readiness check.
 * Run after `AIRTABLE_PAT` + `AIRTABLE_BASE_ID` are set in `.env.local`.
 */
import { loadEnvConfig } from "@next/env";

const projectDir = process.cwd();
loadEnvConfig(projectDir);

async function main(): Promise<void> {
  const token = process.env.AIRTABLE_PAT;
  const baseId = process.env.AIRTABLE_BASE_ID;
  if (!token || !baseId) {
    console.error("Missing AIRTABLE_PAT or AIRTABLE_BASE_ID in web/.env.local");
    process.exit(1);
  }

  const mattersTable = encodeURIComponent("Matters");
  const url = `https://api.airtable.com/v0/${baseId}/${mattersTable}?maxRecords=5`;
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!resp.ok) {
    const text = await resp.text();
    console.error(`Airtable responded ${resp.status}: ${text}`);
    process.exit(1);
  }

  const payload = (await resp.json()) as { records?: Array<{ id: string }> };
  console.log(`Airtable reachable. Sample record count: ${payload.records?.length ?? 0}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
