# Production deployment (Vercel + Fly.io + Supabase)

AssociateOnDemand production stack (attorney-approved, no Harvey/Wordsmith/Clio per `LEGAL_BOUNDARIES.md`):

| Layer | Provider | Role |
|-------|----------|------|
| Web UI | **Vercel** (Hobby where possible) | Next.js 16 App Router |
| API | **Fly.io** (free/low allowance) | FastAPI agents, intake, research |
| Auth + agent DB | **Supabase** | Sign-in (Auth) + Postgres for `agent_jobs` / `audit_logs` |
| Matters / tasks | **Airtable** | System of record (unchanged) |
| Queue | **Upstash Redis** (free tier) | PM job queue in production |
| Vectors | **Qdrant Cloud** (free tier) or defer | Pattern agent; optional at first deploy |

**Cost note:** Vercel Hobby + Fly.io free allowance + Supabase free tier + Upstash free Redis are sufficient for a single-firm pilot. Watch Supabase row/storage limits and Fly.io machine hours.

---

## 1. Supabase project (Auth + Postgres)

1. Create a project at [supabase.com](https://supabase.com).
2. **Authentication**
   - Enable Email provider.
   - For password sign-in: disable public sign-ups if you want invite-only; create users in Supabase Dashboard.
   - For magic links: set **Site URL** to your Vercel URL (e.g. `https://your-app.vercel.app`) and add redirect URL `https://your-app.vercel.app/auth/callback`.
3. **API keys** (Project Settings → API): copy **Project URL**, **anon public**, **service_role** (server only; never expose in client bundles except service role stays server-side).
4. **Postgres connection strings** (Project Settings → Database):
   - **Migrations (Alembic):** use the **direct** connection string (port `5432`, session mode). Run once per release from your laptop or CI.
   - **Fly.io runtime:** use the **Transaction pooler** URI (port `6543`). For SQLAlchemy + psycopg3, append query params as needed, e.g. `?sslmode=require` (Supabase dashboard provides the exact URI).

Example shapes (replace placeholders):

```text
# Direct (migrations only)
DATABASE_URL=postgresql+psycopg://postgres.[project-ref]:[PASSWORD]@db.[project-ref].supabase.co:5432/postgres

# Pooler (Fly.io API runtime)
DATABASE_URL=postgresql+psycopg://postgres.[project-ref]:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres?sslmode=require
```

5. **Run migrations** (from repo root, with direct `DATABASE_URL` exported):

```bash
cd services/api
pip install -r requirements.txt
export DATABASE_URL='postgresql+psycopg://...direct...'
alembic upgrade head
```

Docker Compose Postgres remains valid for **local** API development; production API uses Supabase only.

---

## 2. Vercel (Next.js `web/`)

1. Import the GitHub repo; set **Root Directory** to `web`.
2. Framework preset: Next.js (auto).
3. **Environment variables** (Production + Preview):

| Variable | Required | Notes |
|----------|----------|--------|
| `AIRTABLE_PAT` | Yes | Server-side Airtable |
| `AIRTABLE_BASE_ID` | Yes | Live base id |
| `NEXT_PUBLIC_API_URL` | Yes | `https://<your-fly-app>.fly.dev` |
| `NEXT_PUBLIC_SUPABASE_URL` | When auth on | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | When auth on | Anon key only |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional | Server routes only if you add admin tools later |
| `AOD_AUTH_ENABLED` | Yes | `false` until Supabase keys are set; then `true` |
| `NEXT_PUBLIC_PII_TIER` | Yes | `0` until Presidio is real |

4. Deploy. Confirm `/dashboard` loads; with `AOD_AUTH_ENABLED=true`, unauthenticated users redirect to `/login`.

**Do not** commit `.env.local` or paste keys into the repo.

---

## 3. Fly.io (FastAPI `services/api`)

From repository root (Dockerfile context is repo root):

```bash
fly launch --no-deploy   # name app e.g. associateondemand-api
# Confirm fly.toml points at services/api/Dockerfile (see repo fly.toml stub)
fly secrets set \
  DATABASE_URL='postgresql+psycopg://...pooler...' \
  REDIS_URL='rediss://...upstash...' \
  AIRTABLE_PAT='pat...' \
  AIRTABLE_BASE_ID='app...' \
  ANTHROPIC_API_KEY='sk-...' \
  ALLOWED_ORIGINS='https://your-app.vercel.app' \
  AOD_PII_TIER='0'
fly deploy
```

- Health check: `GET https://<app>.fly.dev/health`
- Container startup runs `alembic upgrade head` then uvicorn (see `services/api/Dockerfile`). Prefer running migrations manually with the **direct** URL first; pooler migrations can fail on some DDL.

**Optional secrets:** `MIDPAGE_API_KEY`, `FASTCASE_API_KEY`, `OPENAI_API_KEY`, `QDRANT_URL`, `QDRANT_API_KEY`.

---

## 4. Upstash Redis (production queue)

1. Create a free Redis database at [upstash.com](https://upstash.com).
2. Copy the **TLS** URL (`rediss://...`) into Fly secret `REDIS_URL`.
3. Local dev continues to use `redis://localhost:6379/0` from docker-compose.

---

## 5. Qdrant (optional / defer)

- **Defer:** Pattern agent and knowledge-map API fall back to Airtable-built graphs; sufficient for pilot.
- **Enable later:** Qdrant Cloud free tier → set `QDRANT_URL` and API key on Fly; run `POST /agents/pattern/seed` once.

---

## 6. Auth behavior summary

| `AOD_AUTH_ENABLED` | Supabase keys | Behavior |
|--------------------|---------------|----------|
| `false` | any | No middleware gate; local-friendly default |
| `true` | missing / placeholder | Login page warns; routes stay open (no hard lockout) |
| `true` | valid | Middleware enforces session on all routes except `/`, `/login`, `/auth/callback` |

---

## 7. Pre-flight checklist

- [ ] Supabase project created; email auth configured
- [ ] Alembic `upgrade head` against direct Postgres URL
- [ ] Vercel env vars set; `NEXT_PUBLIC_API_URL` points to Fly
- [ ] Fly secrets set; `ALLOWED_ORIGINS` matches Vercel URL
- [ ] Upstash `REDIS_URL` on Fly
- [ ] `AOD_PII_TIER=0` until Presidio sidecars are real
- [ ] `AOD_AUTH_ENABLED=true` only after Supabase keys verified
- [ ] No Harvey / Wordsmith / Clio integrations (`LEGAL_BOUNDARIES.md`)

---

## 8. Related runbooks

- [phase-7-deploy-checklist.md](./phase-7-deploy-checklist.md) (step-by-step for La'Dajia)
- [local-dev.md](./local-dev.md)
- [strong-reader-setup.md](./strong-reader-setup.md)
- [research-memo-export.md](./research-memo-export.md)
- [auth-email-setup.md](./auth-email-setup.md) — fix "Error sending magic link email"
