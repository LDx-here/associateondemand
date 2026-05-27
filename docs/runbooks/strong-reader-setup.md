# Strong Reader setup (Phase 3)

AssociateOnDemand Strong Reader runs in the FastAPI service (`services/api`). Tier 0 keeps uploads manual; tier 1 enables OCR + categorization when Presidio is healthy.

## Prerequisites (local macOS)

```bash
brew install tesseract poppler
```

Verify:

```bash
tesseract --version
pdftoppm -h
```

## Environment

| Variable | Purpose |
|----------|---------|
| `AOD_PII_TIER` | `0` = manual attorney approval on uploads; `1` = Strong Reader may process when Presidio passes |
| `NEXT_PUBLIC_PII_TIER` | Mirror for Next.js intake banners (same value as `AOD_PII_TIER`) |
| `PRESIDIO_HEALTH_URL` | Presidio analyzer health endpoint (compose stub or real sidecar) |
| `NEXT_PUBLIC_API_URL` | Web app → FastAPI base (default `http://localhost:8000`) |

Set in repo root `.env` and `web/.env.local`. Never commit these files.

## Flip to tier 1 checklist

1. Replace Presidio compose stubs with real `presidio-analyzer` / `presidio-anonymizer` images (see `docker-compose.yml`).
2. Set `AOD_PII_TIER=1` and `NEXT_PUBLIC_PII_TIER=1`.
3. `docker compose up -d --build`
4. `curl -s http://localhost:8000/health | jq`
5. Upload a de-identified PDF via `/intake/upload` or a matter Documents tab.
6. Confirm progress table shows category + OCR method.

## API routes

| Route | Method | Notes |
|-------|--------|-------|
| `/health` | GET | Stack health |
| `/intake/upload` | POST | Single file + `matter_id` |
| `/intake/batch` | POST | Multiple files |

Pipeline code: `services/api/app/services/document_categorizer.py`, `idi_pipeline.py`, `intake_processor.py`.

## Tier 0 firm policy

When tier is 0, the UI shows a manual approval banner. Attorneys must check the box before upload. The API rejects unapproved PII processing unless `X-Manual-Review-Approved: true` is sent (the web app sets this when the checkbox is checked).

## Curl smoke (after `docker compose up -d`)

Full script: `./scripts/smoke-docker-e2e.sh`

```bash
# Health
curl -s http://localhost:8000/health | jq

# PM + Research (no client PII in payload)
curl -s -X POST http://localhost:8000/agents/pm/dispatch \
  -H "Content-Type: application/json" \
  -d '{"matter_id":"AOD-1001","instruction":"pm:research What is the standard for past persecution?","priority":"normal"}' | jq '.summary, .gaps, .complete'

# Intake tier 0 (requires manual approval header)
curl -s -X POST http://localhost:8000/intake/upload \
  -H "X-Manual-Review-Approved: true" \
  -F "matter_id=AOD-1001" \
  -F "manual_review_approved=true" \
  -F "file=@data/uploads/smoke-test.pdf" | jq '.processing_status, .category, .ocr_method'

# Web command proxy (Next.js on port 3003)
curl -s -X POST http://localhost:3003/api/command \
  -H "Content-Type: application/json" \
  -d '{"query":"pm:research What is the standard for past persecution? AOD-1001"}' | jq
```

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Upload returns connection error | Start API: `docker compose up api` |
| OCR always stub | Install tesseract/poppler; rebuild API image |
| Presidio gate blocks | Check `PRESIDIO_HEALTH_URL`; use tier 0 until sidecars are real |
