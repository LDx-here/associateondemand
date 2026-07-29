/**
 * Practice-import scan orchestrator — server-only.
 *
 * Order:
 *   1. Google Drive API when AOD_PRACTICE_DRIVE_FOLDER_ID (or
 *      GOOGLE_DRIVE_CLIENTS_FOLDER_ID) is set + service account credentials
 *      — the path that works on Vercel.
 *   2. Else local filesystem under the Mac Google Drive sync root
 *      (AOD_PRACTICE_ROOT or the default CloudStorage path).
 *
 * Records land in Google Sheets; client file bytes stay in Drive.
 */

import { readdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

import {
  FOLDER_MIME,
  getDriveFile,
  getPracticeDriveFolderId,
  isGoogleDrivePracticeConfigured,
  listDriveChildren,
} from "./google-drive/client";
import { getServiceAccountEmail, hasServiceAccountCredentials } from "./google-auth";
import type { ScannedFile, ScannedFolder } from "./practice-import";
import { buildProposedMatters, inferPracticeArea, type ProposedMatter } from "./practice-import";

const DEFAULT_ROOT = join(
  homedir(),
  "Library/CloudStorage/GoogleDrive-ladajia@recovermyvalue.com/My Drive",
  "Recover My Value - Kingdom Counsel Firm/03 Clients Active",
);

/** Walk this many folder levels under the root (Immigration/IIA/client). */
const MAX_FOLDER_DEPTH = 3;

export function defaultPracticeRoot(): string {
  return process.env.AOD_PRACTICE_ROOT?.trim() || DEFAULT_ROOT;
}

export type PracticeScan = {
  root: string;
  available: boolean;
  matters: ProposedMatter[];
  /** Set when the folder cannot be read. */
  reason?: string;
  /** Which backend produced the scan (for debug / UI). */
  source?: "drive" | "local" | "none";
};

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
 * Prefer an ancestor that maps to a known practice area so
 * Immigration/IIA/2026-001 gets parentFolder "Immigration", not "IIA".
 */
function parentForPracticeArea(ancestors: string[], immediate: string, rootName: string): string {
  const candidates = [immediate, ...[...ancestors].reverse(), rootName];
  for (const c of candidates) {
    if (c && inferPracticeArea(c) !== "unknown") return c;
  }
  return immediate || rootName;
}

/**
 * Client folders may sit under root, under a practice-area folder, or two
 * levels down (Immigration/IIA/client). Collect up to MAX_FOLDER_DEPTH.
 */
async function collectFoldersLocal(root: string): Promise<ScannedFolder[]> {
  const out: ScannedFolder[] = [];
  const rootName = baseName(root);

  async function walk(dir: string, depth: number, ancestors: string[]): Promise<void> {
    if (depth > MAX_FOLDER_DEPTH) return;
    for (const entry of await safeReaddir(dir)) {
      if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
      const path = join(dir, entry.name);
      const immediate = ancestors[ancestors.length - 1] ?? rootName;
      out.push({
        folderName: entry.name,
        parentFolder: parentForPracticeArea(ancestors, immediate, rootName),
        files: await listFiles(path),
      });
      if (depth < MAX_FOLDER_DEPTH) {
        await walk(path, depth + 1, [...ancestors, entry.name]);
      }
    }
  }

  await walk(root, 1, []);
  return out;
}

async function listDriveFiles(folderId: string, depth = 0): Promise<ScannedFile[]> {
  const children = await listDriveChildren(folderId);
  const out: ScannedFile[] = [];
  for (const child of children) {
    if (child.mimeType === FOLDER_MIME) {
      if (depth < 1) out.push(...(await listDriveFiles(child.id, depth + 1)));
      continue;
    }
    out.push({
      name: child.name,
      modifiedAt: child.modifiedTime ?? new Date(0).toISOString(),
    });
  }
  return out;
}

async function collectFoldersDrive(rootFolderId: string, rootLabel: string): Promise<ScannedFolder[]> {
  const out: ScannedFolder[] = [];

  async function walk(folderId: string, depth: number, ancestors: string[]): Promise<void> {
    if (depth > MAX_FOLDER_DEPTH) return;
    const children = await listDriveChildren(folderId);
    const folders = children.filter((c) => c.mimeType === FOLDER_MIME);
    for (const entry of folders) {
      const immediate = ancestors[ancestors.length - 1] ?? rootLabel;
      out.push({
        folderName: entry.name,
        parentFolder: parentForPracticeArea(ancestors, immediate, rootLabel),
        files: await listDriveFiles(entry.id),
      });
      if (depth < MAX_FOLDER_DEPTH) {
        await walk(entry.id, depth + 1, [...ancestors, entry.name]);
      }
    }
  }

  await walk(rootFolderId, 1, []);
  return out;
}

async function scanViaDrive(): Promise<PracticeScan> {
  const folderId = getPracticeDriveFolderId()!;
  const root = `drive:${folderId}`;
  try {
    // Probe folder metadata first — list returns [] when the SA cannot see the
    // folder (same as a truly empty folder), so files.get is required to catch 404.
    await getDriveFile(folderId);
    const folders = await collectFoldersDrive(folderId, "03 Clients Active");
    const matters = buildProposedMatters(folders);
    return { root, available: true, matters, source: "drive" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      root,
      available: false,
      matters: [],
      source: "drive",
      reason: msg.includes("Google Drive")
        ? msg
        : `Google Drive practice scan failed: ${msg}. Share the folder with the service account (${getServiceAccountEmail() ?? "see GOOGLE_SERVICE_ACCOUNT_JSON"}) as Viewer, and enable the Drive API.`,
    };
  }
}

async function scanViaLocal(root: string): Promise<PracticeScan> {
  try {
    const info = await stat(root);
    if (!info.isDirectory()) {
      return { root, available: false, matters: [], source: "local", reason: "Path is not a folder." };
    }
  } catch {
    return {
      root,
      available: false,
      matters: [],
      source: "none",
      reason: driveNotConfiguredReason(root),
    };
  }

  const folders = await collectFoldersLocal(root);
  return { root, available: true, matters: buildProposedMatters(folders), source: "local" };
}

function driveNotConfiguredReason(localRoot: string): string {
  const hasSa = hasServiceAccountCredentials();
  const folderId = getPracticeDriveFolderId();
  if (!folderId && !hasSa) {
    return (
      `Case folder not reachable at "${localRoot}". For production, set AOD_PRACTICE_DRIVE_FOLDER_ID ` +
      `(Drive folder ID from the URL) and GOOGLE_SERVICE_ACCOUNT_JSON, share that folder with the ` +
      `service account as Viewer, and enable the Google Drive API. Or run locally with synced Drive.`
    );
  }
  if (!folderId) {
    return (
      `Case folder not reachable at "${localRoot}". Service account is configured but ` +
      `AOD_PRACTICE_DRIVE_FOLDER_ID (or GOOGLE_DRIVE_CLIENTS_FOLDER_ID) is not set — add the ` +
      `"03 Clients Active" folder ID from Drive.`
    );
  }
  if (!hasSa) {
    return (
      `Drive folder ID is set but Google service account credentials are missing. ` +
      `Set GOOGLE_SERVICE_ACCOUNT_JSON (inline JSON on Vercel) or GOOGLE_APPLICATION_CREDENTIALS.`
    );
  }
  return (
    `Case folder not reachable at "${localRoot}". Import needs local synced Drive or Drive API ` +
    `(AOD_PRACTICE_DRIVE_FOLDER_ID + service account).`
  );
}

export async function scanPractice(root = defaultPracticeRoot()): Promise<PracticeScan> {
  if (isGoogleDrivePracticeConfigured()) {
    return scanViaDrive();
  }
  return scanViaLocal(root);
}

// Re-export for callers / tests that check config without importing drive client.
export { isGoogleDrivePracticeConfigured, getPracticeDriveFolderId };
