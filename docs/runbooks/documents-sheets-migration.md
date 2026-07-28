# Documents → Google Sheets migration (Python/Fly)

**Status:** Flagged for joint architecture review — do not implement OCR writes to Sheets without aligning both services.

## Problem

On production with `DATA_STORE=google_sheets`, the matter **Documents** tab is empty because:

| Layer | Current backend |
|-------|-----------------|
| Next.js reads (`listDocumentsForMatter`) | Degrades to empty when Sheets mode (see `readAirtableLegacy` in `data-store.ts`) |
| Fly API writes (`create_document` in `services/api/app/services/airtable.py`) | Airtable only |
| OCR pipeline (`intake_processor.py`, `idi_pipeline.py`) | Persists via Airtable + Postgres metadata |

Migrating only Next.js reads would split-brain against Fly writes (Pass 42 finding).

## Target shape

Both services should use the same **Documents row contract** already defined for Sheets:

```
row_id | matter_id | title | category | created_at | uploaded_by | ocr_status | pii_tier | file_type
```

Headers live in `web/src/lib/google-sheets/schema.ts` (`TAB_HEADERS.documents`).

## Interface contract (proposed)

### Python side (`services/api`)

1. Add `app/services/data_store.py` with a factory mirroring Next.js:
   - `DATA_STORE=google_sheets` → `GoogleSheetsDocumentsBackend`
   - default / `airtable` → existing `airtable.create_document`

2. `GoogleSheetsDocumentsBackend.create_document(...)` must:
   - Resolve `matter_id` human code (e.g. `AOD-1001`) — same as Matters tab lookup
   - Append row to **Documents** tab via service account (reuse env: `GOOGLE_SHEETS_SPREADSHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_JSON`)
   - Return `{ id: row_id, ... }` shape compatible with existing API responses

3. OCR text / extracted facts stay in Postgres + Assessment Document notes until a separate blob store decision (Google Drive stretch in BUILD_SPEC).

### Next.js side (`web`)

1. Implement `listDocumentsFromGoogleSheets` + `createDocumentInGoogleSheets` in `google-sheets/queries.ts` (read path first).
2. Wire `documentsBackend()` in `data-store.ts` (same pattern as Tasks/Notes/PM Inbox).
3. Remove Documents from `readAirtableLegacy` unmigrated list once Fly writes to Sheets.

## Auth

- Vercel already has `GOOGLE_SERVICE_ACCOUNT_JSON` + `GOOGLE_SHEETS_SPREADSHEET_ID`.
- Fly needs the same secrets (`fly secrets set`) before Python can write.
- Service account must have **Editor** on the firm spreadsheet.

## Safe rollout order

1. **Read path** on Next.js (Sheets) while Fly still writes Airtable — only after dual-write or one-time backfill.
2. **Dual-write** on Fly (Airtable + Sheets) behind `AOD_DOCUMENTS_DUAL_WRITE=1` for verification.
3. **Sheets-only write** on Fly; retire Airtable Documents writes.
4. Optional: backfill historical Airtable Documents rows to Sheets tab.

## Out of scope for overnight passes

- Guessing OCR field mappings or changing PII tier behavior
- Google Drive binary storage
- Migrating Assessment Templates / Firm Samples reads alone (they filter Documents by category — same table)

## Verification checklist (when implemented)

```bash
cd services/api && .venv/bin/python -m pytest tests/ -q
cd web && npm run test:google-sheets && npm run build
bash scripts/smoke-production.sh
# Manual: upload PDF on matter Documents tab → row appears on Sheets Documents tab + UI list
```

## Related files

| File | Role |
|------|------|
| `web/src/lib/data-store.ts` | `listDocumentsForMatter`, legacy degrade |
| `web/src/lib/google-sheets/schema.ts` | Documents tab headers |
| `services/api/app/services/airtable.py` | `create_document` |
| `services/api/app/services/intake_processor.py` | OCR orchestration |
| `services/api/app/routers/intake.py` | Upload endpoint |
