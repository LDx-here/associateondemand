/**
 * Filesystem side of the practice importer — server-only.
 *
 * The firm's Drive is synced to the attorney's Mac, so the case folders are
 * ordinary local directories. Vercel's serverless runtime has no such folder,
 * which means importing is deliberately a *local* operation: run the app on
 * the machine holding the files, review, import. The records land in Google
 * Sheets, which production reads — so a one-time local import populates the
 * live system without client files ever leaving the machine.
 */

import { readdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

import type { ScannedFile, ScannedFolder } from "./practice-import";
import { buildProposedMatters, type ProposedMatter } from "./practice-import";

const DEFAULT_ROOT = join(
  homedir(),
  "Library/CloudStorage/GoogleDrive-ladajia@recovermyvalue.com/My Drive",
  "Recover My Value - Kingdom Counsel Firm/03 Clients Active",
);

export function defaultPracticeRoot(): string {
  return process.env.AOD_PRACTICE_ROOT?.trim() || DEFAULT_ROOT;
}

async function safeReaddir(dir: string) {
  try {
    return await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

/** Files in a folder and one level below — case folders nest ("LOR/", "Crash report/"). */
async function listFiles(dir: string, depth = 0): Promise<ScannedFile[]> {
  const out: ScannedFile[] = [];
  for (const entry of await safeReaddir(dir)) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (depth < 1) out.push(...(await listFiles(path, depth + 1)));
      continue;
    }
    try {
      const info = await stat(path);
      out.push({ name: entry.name, modifiedAt: info.mtime.toISOString() });
    } catch {
      /* unreadable file — skip rather than fail the scan */
    }
  }
  return out;
}

function baseName(path: string): string {
  const parts = path.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? "";
}

/**
 * Client folders sit either directly under the root or one level deeper
 * inside a practice-area folder ("Personal Injury/2026-002-Hammond, Jeremiah").
 */
async function collectFolders(root: string): Promise<ScannedFolder[]> {
  const out: ScannedFolder[] = [];
  for (const entry of await safeReaddir(root)) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
    const path = join(root, entry.name);
    out.push({
      folderName: entry.name,
      parentFolder: baseName(root),
      files: await listFiles(path),
    });

    for (const sub of await safeReaddir(path)) {
      if (!sub.isDirectory() || sub.name.startsWith(".")) continue;
      out.push({
        folderName: sub.name,
        parentFolder: entry.name,
        files: await listFiles(join(path, sub.name)),
      });
    }
  }
  return out;
}

export type PracticeScan = {
  root: string;
  available: boolean;
  matters: ProposedMatter[];
  /** Set when the folder cannot be read — usually "not running locally". */
  reason?: string;
};

export async function scanPractice(root = defaultPracticeRoot()): Promise<PracticeScan> {
  try {
    const info = await stat(root);
    if (!info.isDirectory()) {
      return { root, available: false, matters: [], reason: "Path is not a folder." };
    }
  } catch {
    return {
      root,
      available: false,
      matters: [],
      reason:
        "Case folder not reachable. Import reads your synced Drive, so it only runs on the machine holding the files — not on the deployed site.",
    };
  }

  return { root, available: true, matters: buildProposedMatters(await collectFolders(root)) };
}
