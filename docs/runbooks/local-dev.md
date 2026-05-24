# Local development runbook

## Stack

```bash
cp .env.example .env
docker compose up -d --build
cd web && cp .env.local.example .env.local && npm install && npm run dev
```

- Web: http://localhost:3000
- API: http://localhost:8000/docs

## Demo vs Airtable

Without `AIRTABLE_PAT` and `AIRTABLE_BASE_ID` in `web/.env.local`, the UI reads/writes `data/dev-seed.json`.

## Strong Reader (Phase 3)

Set `AOD_PII_TIER=1` and configure `PRESIDIO_HEALTH_URL` before `/intake/upload` accepts files.

## Production (Phase 7)

- Web: Vercel with env vars from `web/.env.local.example`
- API: Railway/Fly with managed Postgres, Redis, Qdrant
- Auth: add NextAuth or Clerk before public deploy
- Monitoring: Sentry DSN on web + API
