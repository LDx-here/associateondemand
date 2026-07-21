# Local development runbook

## Stack

```bash
cp .env.example .env
docker compose up -d --build
cd web && cp .env.local.example .env.local && npm install && npm run dev
```

- Web: http://localhost:3000
- API: http://localhost:8000/docs
- Presidio analyzer: http://localhost:5002/health (optional Strong Reader tier 1)

### Run full stack locally (matters, documents, upload)

Use this when debugging matter links, Documents tab listings, or PDF preview against the Fly-compatible API:

```bash
cd /Users/ladaj/Developer/AssociateOnDemand

# 1. Start infra + API (Postgres, Redis, Qdrant, Presidio sidecars, FastAPI)
docker compose up -d --build

# 2. Wait for API health
curl -sf http://localhost:8000/health

# 3. Web app (separate terminal — not in compose yet)
cd web
cp .env.local.example .env.local   # once
# Set NEXT_PUBLIC_API_URL=http://localhost:8000 in web/.env.local
npm install && npm run dev

# 4. Optional: demo mode without Airtable (reads data/dev-seed.json)
# Leave AIRTABLE_PAT unset in web/.env.local, or AOD_FORCE_DEMO_MODE=true

# 5. E2E smoke (Docker + tier-0 upload)
bash scripts/smoke-docker-e2e.sh
```

**Compose services:** `postgres`, `redis`, `qdrant`, `presidio-analyzer`, `presidio-anonymizer`, `presidio` (stub :8080), `api`.

**Typical debug URLs:**

| Surface | URL |
|---------|-----|
| Matters list | http://localhost:3000/matters |
| Matter workbench | http://localhost:3000/matters/AOD-1001 |
| Assignment intake | http://localhost:3000/assignments/new |
| Settings (PII tier docs) | http://localhost:3000/settings |

## E2E smoke script (Docker + API)

From the repo root, with **Docker Desktop running**:

```bash
cd /Users/ladaj/Developer/AssociateOnDemand
bash scripts/smoke-docker-e2e.sh
```

Use `bash scripts/...` rather than `./scripts/...`. Cursor's integrated terminal sometimes fails with `Command not found` or `Could not create a new process and open a pseudo-tty`. In that case, open **Terminal.app** (or iTerm), `cd` to the repo, and run the same `bash` command.

The script runs `docker compose up`, checks `http://localhost:8000/health`, PM research dispatch, and a tier-0 intake upload using `scripts/fixtures/smoke-test.pdf` (no client PII).

## Demo vs Airtable

Without `AIRTABLE_PAT` and `AIRTABLE_BASE_ID` in `web/.env.local`, the UI reads/writes `data/dev-seed.json`.

## Strong Reader (Phase 3)

Set `AOD_PII_TIER=1` and configure `PRESIDIO_HEALTH_URL` before `/intake/upload` accepts files.

## Production (Phase 7)

- Web: Vercel with env vars from `web/.env.local.example`
- API: Railway/Fly with managed Postgres, Redis, Qdrant
- Auth: add NextAuth or Clerk before public deploy
- Monitoring: Sentry DSN on web + API
