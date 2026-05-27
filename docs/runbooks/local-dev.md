# Local development runbook

## Stack

```bash
cp .env.example .env
docker compose up -d --build
cd web && cp .env.local.example .env.local && npm install && npm run dev
```

- Web: http://localhost:3000
- API: http://localhost:8000/docs

## E2E smoke script (Docker + API)

From the repo root, with **Docker Desktop running**:

```bash
cd /Users/ladaj/Documents/AssociateOnDemand
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
