#!/usr/bin/env node
/**
 * Scan the firm's client folders and report what would be imported.
 *
 * Read-only and local: nothing is written, nothing leaves the machine. Run it
 * to see the proposed matters before any import touches the data store.
 *
 *   npm run scan:practice -- "/path/to/03 Clients Active"
 */
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

import {
  buildProposedMatters,
  caseTypeFor,
  daysSinceActivity,
} from "../src/lib/practice-import.ts";

const DEFAULT_ROOT = join(
  homedir(),
  "Library/CloudStorage/GoogleDrive-ladajia@recovermyvalue.com/My Drive",
  "Recover My Value - Kingdom Counsel Firm/03 Clients Active",
);

const root = process.argv[2] || DEFAULT_ROOT;

/** Client folders live either directly under the root or one level deeper. */
function collectFolders(base) {
  const out = [];
  let entries;
  try {
    entries = readdirSync(base, { withFileTypes: true });
  } catch (err) {
    console.error(`Cannot read ${base}: ${err.message}`);
    process.exit(1);
  }

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
    const path = join(base, entry.name);
    out.push({ folderName: entry.name, parentFolder: baseName(base), files: listFiles(path) });

    for (const sub of safeReaddir(path)) {
      if (!sub.isDirectory() || sub.name.startsWith(".")) continue;
      out.push({
        folderName: sub.name,
        parentFolder: entry.name,
        files: listFiles(join(path, sub.name)),
      });
    }
  }
  return out;
}

function baseName(p) {
  const parts = p.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? "";
}

function safeReaddir(p) {
  try {
    return readdirSync(p, { withFileTypes: true });
  } catch {
    return [];
  }
}

/** Files in the folder and one level below (case files nest: "LOR/", "Crash report/"). */
function listFiles(dir, depth = 0) {
  const files = [];
  for (const entry of safeReaddir(dir)) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (depth < 1) files.push(...listFiles(path, depth + 1));
      continue;
    }
    try {
      files.push({ name: entry.name, modifiedAt: statSync(path).mtime.toISOString() });
    } catch {
      /* unreadable file — skip rather than fail the whole scan */
    }
  }
  return files;
}

const matters = buildProposedMatters(collectFolders(root));
const now = new Date();

console.log(`\nScanned: ${root}`);
console.log(`Matters found: ${matters.length}\n`);

for (const m of matters) {
  const quiet = daysSinceActivity(m, now);
  console.log(`${m.matterNumber}  ${m.clientName}`);
  console.log(`   ${caseTypeFor(m)}${m.tag ? ` [${m.tag}]` : ""} · ${m.documents.length} documents` +
    (quiet === null ? " · no activity yet" : ` · last activity ${quiet}d ago`));
  if (m.timeline.length > 0) {
    console.log(`   timeline:`);
    for (const e of m.timeline) {
      console.log(`     ${e.occurredAt.slice(0, 10)}  ${e.category.padEnd(14)} ${e.title.slice(0, 58)}`);
    }
  }
  console.log();
}

const counts = matters.reduce((acc, m) => {
  acc[caseTypeFor(m)] = (acc[caseTypeFor(m)] ?? 0) + 1;
  return acc;
}, {});
console.log("By practice area:", counts);
