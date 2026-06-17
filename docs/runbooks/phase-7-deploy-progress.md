# Phase 7 deploy — **COMPLETE** (2026-06-17)

Production firm base is live. See [CHECKPOINT.md](../../CHECKPOINT.md) for resume commands.

## Production URLs

| Service | URL |
|---------|-----|
| Web | https://aod-next.vercel.app |
| API | https://associateondemand-api.fly.dev |
| Supabase | Project **AOD** (`mqspbntzxerzlkdwhxku`) |
| Redis | Fly Upstash `aod-prod` |

## Verified

- `bash scripts/smoke-production.sh` — auth redirect, API health (tier 0), Anthropic research dispatch
- `bash scripts/smoke-docker-e2e.sh` — local Docker PASS
- `cd web && npm run test:airtable` — 11/11 tables
- Auth: `AOD_AUTH_ENABLED=true` on Vercel; Supabase redirect URLs configured
- Research: `ANTHROPIC_API_KEY` + `LLM_DEFAULT_MODEL=claude-sonnet-4-6` on Fly

## Deploy helper

```bash
bash scripts/phase7-finish-deploy.sh   # Alembic + Fly secrets + deploy + Vercel API URL
```

## Post-base (not blocking)

- Qdrant pattern index (`aod-qdrant` internal URL — health optional at tier 0)
- Presidio sidecars (tier 1)
- Full drafting / mass audit / legal mapping LLM agents

Historical notes from the 2026-06-15 deploy pass remain in git history; this file is the current status.
