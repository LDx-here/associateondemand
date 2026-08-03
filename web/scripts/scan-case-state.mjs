#!/usr/bin/env node
/**
 * Show the case state that would be proposed for each real matter.
 *
 * Read-only and local — writes nothing. Run this before any enrichment so the
 * proposals can be checked against the docket first.
 *
 *   npm run scan:case-state
 */
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

import { buildProposedMatters } from "../src/lib/practice-import.ts";
import { proposeCaseState } from "../src/lib/case-state.ts";

const ROOT =
  process.argv[2] ||
  join(
    homedir(),
    "Library/CloudStorage/GoogleDrive-ladajia@recovermyvalue.com/My Drive",
    "Recover My Value - Kingdom Counsel Firm/03 Clients Active",
  );

function safeReaddir(p) {
  try {
    return readdirSync(p, { withFileTypes: true });
  } catch {
    return [];
  }
}

function listFiles(dir, depth = 0) {
  const files = [];
  for (const entry of safeReaddir(dir)) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (depth < 2) files.push(...listFiles(path, depth + 1));
      continue;
    }
    try {
      files.push({ name: entry.name, modifiedAt: statSync(path).mtime.toISOString() });
    } catch {
      /* unreadable */
    }
  }
  return files;
}

function baseName(p) {
  const parts = p.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? "";
}

function collect(base, depth = 1, ancestors = []) {
  const out = [];
  for (const entry of safeReaddir(base)) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
    const path = join(base, entry.name);
    out.push({
      folderName: entry.name,
      parentFolder: ancestors[ancestors.length - 1] ?? baseName(base),
      files: listFiles(path),
    });
    if (depth < 3) out.push(...collect(path, depth + 1, [...ancestors, entry.name]));
  }
  return out;
}

const folders = collect(ROOT);
const matters = buildProposedMatters(folders);
const byFolder = new Map(folders.map((f) => [f.folderName, f.files]));
const now = new Date();

console.log(`\nProposed case state — ${matters.length} matters\n`);

for (const m of matters) {
  const files = byFolder.get(m.sourceFolder) ?? [];
  const state = proposeCaseState(files, now);
  console.log(`${m.matterNumber}  ${m.clientName}`);
  console.log(`   posture:  ${state.posture}`);
  if (state.postureEvidence) console.log(`             from "${state.postureEvidence}"`);
  if (state.nextDeadline) {
    console.log(`   deadline: ${state.nextDeadline}  (VERIFY against docket)`);
    console.log(`             from "${state.deadlineEvidence}"`);
    if (state.deadlineCandidates.length > 1) {
      console.log(`             +${state.deadlineCandidates.length - 1} other future date(s)`);
    }
  } else {
    console.log(`   deadline: none found in filenames`);
  }
  console.log();
}
