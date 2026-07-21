#!/usr/bin/env tsx
/** Verify Documents create payload matches live Airtable schema (no ocr_status drift). */

import { buildDocumentCreateFields, LIVE_DOCUMENT_CREATE_FIELDS } from "../src/lib/airtable/document-create.ts";
import { FIELDS } from "../src/lib/airtable/fields.ts";

const d = FIELDS.documents;
const fields = buildDocumentCreateFields({
  title: "westlaw-memo.txt",
  category: "research",
  uploadedBy: "Attorney",
  matterRecordId: "recTEST123",
});

const keys = new Set(Object.keys(fields));
const expected = new Set([d.title, d.category, d.created_at, d.uploaded_by, d.matter_id]);

for (const key of expected) {
  if (!keys.has(key)) {
    console.error(`Missing expected field: ${key}`);
    process.exit(1);
  }
}

if (keys.has(d.ocr_status) || keys.has(d.pii_tier) || keys.has(d.file_type)) {
  console.error("Document create payload must not include drift columns (ocr_status, pii_tier, file_type)");
  process.exit(1);
}

if (LIVE_DOCUMENT_CREATE_FIELDS.size !== 5) {
  console.error("LIVE_DOCUMENT_CREATE_FIELDS count unexpected");
  process.exit(1);
}

console.log("OK document-create fields aligned to live schema");
