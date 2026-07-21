import { FIELDS } from "./fields";

/** Writable Documents columns on live base `appqwRBpXjg9xlnhZ`. */
export const LIVE_DOCUMENT_CREATE_FIELDS = new Set([
  "title",
  "matter_id",
  "category",
  "created_at",
  "uploaded_by",
]);

const d = FIELDS.documents;

export type DocumentCreateInput = {
  title: string;
  category: string;
  matterRecordId?: string;
  uploadedBy?: string;
  createdAt?: string;
};

/** Build an Airtable Documents create payload aligned to the live schema. */
export function buildDocumentCreateFields(input: DocumentCreateInput): Record<string, unknown> {
  const fields: Record<string, unknown> = {
    [d.title]: input.title.slice(0, 240),
    [d.category]: input.category.slice(0, 120) || "uncategorized",
    [d.created_at]: input.createdAt ?? new Date().toISOString(),
  };
  if (input.uploadedBy) {
    fields[d.uploaded_by] = input.uploadedBy.slice(0, 120);
  }
  if (input.matterRecordId) {
    fields[d.matter_id] = [input.matterRecordId];
  }
  return fields;
}
