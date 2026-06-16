# Phase 7 deploy progress — 2026-06-15

Tracked during autonomous deploy pass from `/Users/ladaj/Developer/AssociateOnDemand`.

## Done (agent)

| Step | Status | Notes |
|------|--------|-------|
| Git push | ✅ | `13b7d0e` on `cursor/phase0-foundation` — OCR + documents migration |
| CHECKPOINT.md | ✅ | New workspace path + smoke status |
| Vercel CLI login | ✅ | Account `ldx-here` |
| Vercel link | ✅ | Project `aod-next` → `web/` |
| Vercel env | ✅ | `AIRTABLE_PAT`, `AIRTABLE_BASE_ID`, `NEXT_PUBLIC_PII_TIER=0`, `AOD_AUTH_ENABLED=false` |
| Vercel deploy | ✅ | **https://aod-next.vercel.app** (root dir fixed to `web/`) |
| Fly CLI login | ✅ | `ladajia@recovermyvalue.com` |
| Local Docker smoke | ✅ | `scripts/smoke-docker-e2e.sh` PASS |

## Blocked — needs you (one-time)

### 1. Fly.io — account verification (hard blocker for API)

```
Error: Your account has been marked as high risk.
→ https://fly.io/high-risk-unlock
```

After unlock, from repo root:

```bash
fly launch --no-deploy --copy-config --name associateondemand-api --region iad --yes
fly secrets set \
  DATABASE_URL='...supabase pooler 6543...' \
  REDIS_URL='...upstash rediss...' \
  AIRTABLE_PAT='...' \
  AIRTABLE_BASE_ID='appqwRBpXjg9xlnhZ' \
  ANTHROPIC_API_KEY='...' \
  ALLOWED_ORIGINS='https://aod-next-ldx-heres-projects.vercel.app' \
  AOD_PII_TIER='0'
fly deploy
curl -s https://associateondemand-api.fly.dev/health
```

Then Vercel:

```bash
cd web
vercel env add NEXT_PUBLIC_API_URL production
# value: https://associateondemand-api.fly.dev
vercel deploy --prod
```

### 2. Supabase — CLI login + project

Run in Terminal (browser step):

```bash
supabase login
supabase projects list
```

Create project in dashboard or CLI, then:

```bash
cd services/api
source .venv/bin/activate  # or create venv
export DATABASE_URL='postgresql+psycopg://...direct 5432...'
alembic upgrade head
```

Add to Vercel when ready for auth:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Set `AOD_AUTH_ENABLED=true` and redeploy **last**

### 3. Upstash Redis

Create database at [upstash.com](https://upstash.com), paste TLS URL into `fly secrets set REDIS_URL=...`.

## Production URLs

| Service | URL |
|---------|-----|
| Web (Vercel) | https://aod-next.vercel.app |
| API (Fly) | pending unlock → `https://associateondemand-api.fly.dev` |

## What works on Vercel today (auth off)

- Dashboard / matters / tasks / calendar (Airtable-backed routes)
- Command Panel + intake upload **require** `NEXT_PUBLIC_API_URL` pointing at live Fly API

## Resume command

```bash
cd /Users/ladaj/Developer/AssociateOnDemand
bash scripts/smoke-docker-e2e.sh
```
