# Documents → Google Sheets migration (Python/Fly)

**Status:** Next.js Documents CRUD shipped (Pass 55). Fly dual-write scaffolded — enable with secrets below.

## Problem

On production with `DATA_STORE=google_sheets`, the matter **Documents** tab was empty because:

| Layer | Current backend |
|-------|-----------------|
| Next.js reads (`listDocumentsForMatter`) | **Sheets** via `documentsBackend()` |
| Next.js writes (`createDocumentForMatter` / assessment/template register) | **Sheets** when `DATA_STORE=google_sheets` |
| Fly API writes (`services/api` OCR) | Airtable by default; **dual-write to Sheets** when `AOD_DOCUMENTS_DUAL_WRITE=1` + Sheets secrets |

## Target shape

Both services use the same **Documents row contract**:

```
row_id | matter_id | title | category | created_at | uploaded_by | ocr_status | pii_tier | file_type
```

Headers live in `web/src/lib/google-sheets/schema.ts` (`TAB_HEADERS.documents`).

## What works now (web)

- `listDocumentsForMatter` / assessment templates / firm samples / deliverable templates read Sheets
- `POST /api/matters/[id]/documents` registers metadata (used after Fly OCR upload so the list updates without waiting for Fly dual-write)
- Assessment + template registration (`registerAssessmentDocument`, etc.) writes Sheets in Sheets mode
- Matter supporting-doc upload also POSTs metadata to Next.js after Fly OCR

## Fly secrets required (attorney / ops)

```bash
fly secrets set -a associateondemand-api \
  GOOGLE_SHEETS_SPREADSHEET_ID="<same as Vercel>" \
  GOOGLE_SERVICE_ACCOUNT_JSON='<paste full service-account JSON>' \
  AOD_DOCUMENTS_DUAL_WRITE=1
# Optional when ready to retire Airtable Documents writes:
# DATA_STORE=google_sheets
```

Service account must have **Editor** on the firm spreadsheet.

## Interface contract

### Python side (`services/api`)

1. `app/services/data_store.py` — factory used by `intake_processor`
2. `app/services/google_sheets.py` — append Documents row via service account
3. Dual-write behind `AOD_DOCUMENTS_DUAL_WRITE=1`

### Next.js side (`web`) — done

1. `listDocumentsFromGoogleSheets` + `createDocument` / `registerDocument` in `google-sheets/queries.ts`
2. `documentsBackend()` in `data-store.ts`
3. Documents no longer on the empty Airtable-legacy degrade path

## Safe rollout order

1. ~~**Read path** on Next.js (Sheets)~~ ✅
2. ~~**Web write path** (assessment/template/POST register)~~ ✅
3. **Dual-write** on Fly (set secrets + `AOD_DOCUMENTS_DUAL_WRITE=1`) — pending attorney
4. **Sheets-only write** on Fly (`DATA_STORE=google_sheets`); retire Airtable Documents writes
5. Optional: backfill historical Airtable Documents rows to Sheets tab

## Out of scope

- Google Drive binary storage
- Changing PII tier behavior

## Verification checklist

```bash
cd services/api && .venv/bin/python -m pytest tests/ -q
cd web && npm run test:google-sheets && npm run build
bash scripts/smoke-production.sh
# Manual: upload PDF on matter Documents tab → row on Sheets Documents + UI list
# Manual: note with activity+minutes → Notes columns G–I populated
```

## Related files

| File | Role |
|------|------|
| `web/src/lib/data-store.ts` | `documentsBackend()`, `listDocumentsForMatter`, `createDocumentForMatter` |
| `web/src/lib/google-sheets/schema.ts` | Documents + Notes (activity/minutes/billable) headers |
| `web/src/lib/google-sheets/queries.ts` | Sheets Documents CRUD |
| `services/api/app/services/data_store.py` | Fly factory + dual-write |
| `services/api/app/services/google_sheets.py` | Fly Sheets append |
| `services/api/app/services/intake_processor.py` | OCR → data_store.create_document |
