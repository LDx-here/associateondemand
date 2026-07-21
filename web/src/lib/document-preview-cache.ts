/** Session-scoped cache for document preview metadata and in-memory blob URLs. */

const STORAGE_PREFIX = "aod-doc-preview:";

export type CachedDocPreview = {
  postgresDocumentId?: string;
  filename?: string;
};

function storageKey(matterId: string, airtableDocId: string): string {
  return `${STORAGE_PREFIX}${matterId}:${airtableDocId}`;
}

export function cacheDocumentPreview(
  matterId: string,
  airtableDocId: string,
  data: CachedDocPreview,
): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(storageKey(matterId, airtableDocId), JSON.stringify(data));
  } catch {
    // Quota or private mode — preview still works via upload state when present.
  }
}

export function getCachedDocumentPreview(
  matterId: string,
  airtableDocId: string,
): CachedDocPreview | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(storageKey(matterId, airtableDocId));
    if (!raw) return null;
    return JSON.parse(raw) as CachedDocPreview;
  } catch {
    return null;
  }
}

const blobUrlCache = new Map<string, string>();

function blobKey(matterId: string, airtableDocId: string): string {
  return `${matterId}:${airtableDocId}`;
}

/** Keep an object URL for the just-uploaded file (same browser session). */
export function setBlobPreview(matterId: string, airtableDocId: string, file: File): string {
  const key = blobKey(matterId, airtableDocId);
  const existing = blobUrlCache.get(key);
  if (existing) URL.revokeObjectURL(existing);
  const url = URL.createObjectURL(file);
  blobUrlCache.set(key, url);
  return url;
}

export function getBlobPreview(matterId: string, airtableDocId: string): string | undefined {
  return blobUrlCache.get(blobKey(matterId, airtableDocId));
}
