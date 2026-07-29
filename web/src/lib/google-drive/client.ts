/**
 * Google Drive API client (service account, read-only).
 * Used for practice import on Vercel where the Mac sync path is unavailable.
 */

import {
  getGoogleAccessToken,
  getServiceAccountEmail,
  GOOGLE_DEFAULT_SCOPES,
  hasServiceAccountCredentials,
} from "../google-auth";

const DRIVE_API = "https://www.googleapis.com/drive/v3";

export type DriveFileMeta = {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
};

export const FOLDER_MIME = "application/vnd.google-apps.folder";

/** Folder ID from Drive URL (`…/folders/FOLDER_ID`). */
export function getPracticeDriveFolderId(): string | null {
  const id =
    process.env.AOD_PRACTICE_DRIVE_FOLDER_ID?.trim() ||
    process.env.GOOGLE_DRIVE_CLIENTS_FOLDER_ID?.trim() ||
    "";
  return id || null;
}

/** True when SA credentials exist and a practice Drive folder ID is set. */
export function isGoogleDrivePracticeConfigured(): boolean {
  return Boolean(getPracticeDriveFolderId() && hasServiceAccountCredentials());
}

async function driveFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = await getGoogleAccessToken(GOOGLE_DEFAULT_SCOPES);
  return fetch(`${DRIVE_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
}

/**
 * Fetch folder/file metadata. Use this to distinguish "not shared / not found"
 * (404) from an empty-but-accessible folder (list returns []).
 */
export async function getDriveFile(fileId: string): Promise<DriveFileMeta> {
  const params = new URLSearchParams({
    fields: "id, name, mimeType, modifiedTime",
    supportsAllDrives: "true",
  });
  const resp = await driveFetch(`/files/${encodeURIComponent(fileId)}?${params}`);
  if (!resp.ok) {
    const text = await resp.text();
    const email = getServiceAccountEmail() ?? "(unknown SA email)";
    throw new Error(
      `Google Drive get ${resp.status}: ${text}. Share the folder with ${email} as Viewer, and enable the Drive API on the GCP project.`,
    );
  }
  const file = (await resp.json()) as DriveFileMeta;
  if (!file.id || !file.name || !file.mimeType) {
    throw new Error(`Google Drive get returned incomplete metadata for ${fileId}`);
  }
  return file;
}

/**
 * List direct children of a folder (files + subfolders).
 * Supports Shared Drives and folders shared into My Drive.
 */
export async function listDriveChildren(folderId: string): Promise<DriveFileMeta[]> {
  const out: DriveFileMeta[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      q: `'${folderId.replace(/'/g, "\\'")}' in parents and trashed=false`,
      fields: "nextPageToken, files(id, name, mimeType, modifiedTime)",
      pageSize: "1000",
      supportsAllDrives: "true",
      includeItemsFromAllDrives: "true",
      spaces: "drive",
    });
    if (pageToken) params.set("pageToken", pageToken);

    const resp = await driveFetch(`/files?${params.toString()}`);
    if (!resp.ok) {
      const text = await resp.text();
      const email = getServiceAccountEmail() ?? "(unknown SA email)";
      throw new Error(
        `Google Drive list ${resp.status}: ${text}. Share the folder with ${email} as Viewer, and enable the Drive API on the GCP project.`,
      );
    }
    const payload = (await resp.json()) as {
      files?: DriveFileMeta[];
      nextPageToken?: string;
    };
    for (const f of payload.files ?? []) {
      if (f.id && f.name && f.mimeType) out.push(f);
    }
    pageToken = payload.nextPageToken;
  } while (pageToken);

  return out;
}
