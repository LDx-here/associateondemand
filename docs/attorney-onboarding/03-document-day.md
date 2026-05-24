# Document day — Strong Reader (Phase 3)

Process scanned PDFs and photocopies through the OCR pipeline, review extracted facts, and confirm Obsidian sync.

## Prerequisites

### macOS (local API, not Docker)

```bash
brew install poppler tesseract
```

Verify:

```bash
which pdftoppm   # poppler
tesseract --version
```

### Docker (recommended)

The API image includes `poppler-utils` and `tesseract-ocr`. From repo root:

```bash
docker compose up -d --build
```

## Environment

| Variable | Purpose |
|----------|---------|
| `AOD_PII_TIER` | `0` = manual approval gate; `1` = requires Presidio health |
| `OCR_PROVIDER` | `tesseract` (default) or `textract` |
| `PRESIDIO_HEALTH_URL` | e.g. `http://localhost:8080` (tier 1+) |
| `UPLOAD_DIR` | Where raw uploads are stored |
| `AOD_BRAIN_ROOT` | Obsidian vault root (`brain/`) |
| `AWS_*` | Required only when `OCR_PROVIDER=textract` |

Web UI mirrors tier via `NEXT_PUBLIC_PII_TIER` in `web/.env.local`.

## Workflow

1. Open **Intake → Document intake** (http://localhost:3000/intake/upload).
2. At tier 0, check **manual attorney approval** (de-identified or firm-approved test docs only).
3. Upload a scanned PDF or image for a matter ID (e.g. `AOD-1001`).
4. Review OCR method (`pdfplumber` / `pypdf` / `tesseract` / `textract`), confidence, category, and extracted facts.
5. Confirm Obsidian note under `brain/01_Cases/<matter_id>/`.
6. For multiple files, use **Batch upload** (`/intake/batch`) — progress shows per file.

## API (curl)

Tier 0 with manual approval:

```bash
curl -X POST "http://localhost:8000/intake/upload" \
  -H "X-Manual-Review-Approved: true" \
  -F "matter_id=AOD-1001" \
  -F "manual_review_approved=true" \
  -F "file=@/path/to/scanned.pdf"
```

Case-scoped endpoint:

```bash
curl -X POST "http://localhost:8000/api/cases/AOD-1001/documents/upload" \
  -H "X-Manual-Review-Approved: true" \
  -F "manual_review_approved=true" \
  -F "file=@/path/to/photocopy.pdf"
```

List processed documents:

```bash
curl "http://localhost:8000/api/cases/AOD-1001/documents"
```

## OCR test matrix

| Input | Expected method |
|-------|-----------------|
| Digital PDF (text layer) | `pdfplumber` or `pypdf`, status `success` |
| Scanned / image-only PDF | `tesseract` (or `textract` if configured) |
| PNG/JPG photo of document | `tesseract` |
| Empty or corrupt file | status `failed`, confidence near 0 |

Synthetic test without a scan: create a one-page PDF in Preview with typed text — should skip OCR. Photograph it or print-scan to force tesseract path.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `503` tier 0 | Send manual approval header/field or raise `AOD_PII_TIER` |
| `503` Presidio | Start compose stack; set `PRESIDIO_HEALTH_URL` |
| `pdf2image` / poppler error | Install poppler (`brew install poppler`) |
| Tesseract not found | Install tesseract; set `TESSDATA_PREFIX` if needed |
| Low confidence on photocopies | Expected — attorney must verify dates/names against source |

## What gets stored

- **Postgres**: `documents` + `extracted_facts` rows (created on API startup).
- **Disk**: `{UPLOAD_DIR}/{matter_id}/{uuid}-{filename}`.
- **Obsidian**: markdown with YAML frontmatter and fact summary.

Next: map extracted facts to legal elements in the matter workbench (Phase 4).
