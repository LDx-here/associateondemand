# Phase 7 deploy checklist (La'Dajia)

Step-by-step production setup for AssociateOnDemand. Copy **variable names only** into each host; never paste real secrets into GitHub, Slack, or this repo.

**Order:** Supabase project, run migrations, Fly API, Vercel web, enable auth last.

**Legal:** No Harvey, Wordsmith, or Clio integrations (`LEGAL_BOUNDARIES.md`).

---

## Before you start

- GitHub repo: `LDx-here/associateondemand`, branch `cursor/phase0-foundation`
- Accounts: [supabase.com](https://supabase.com), [vercel.com](https://vercel.com), [fly.io](https://fly.io), [upstash.com](https://upstash.com)
- Laptop: `flyctl` installed (`brew install flyctl`), logged in (`fly auth login`)
- Airtable PAT and base id ready (same as local)

---

## 1. Supabase project (Auth + Postgres)

1. Sign in at supabase.com, click **New project**.
2. Pick organization, name (e.g. `associateondemand-prod`), strong database password (save in your password manager only).
3. Wait until the project status is **Active**.
4. **Authentication** (left sidebar):
   1. Click **Providers**, open **Email**.
   2. Turn **Enable Email provider** on.
   3. If invite-only: under **Sign up**, disable **Allow new users to sign up** (create users manually in step 5).
5. **URL configuration** (Authentication, **URL Configuration**):
   1. Set **Site URL** to your future Vercel URL placeholder, e.g. `https://associateondemand.vercel.app` (update after Vercel gives the real URL).
   2. Under **Redirect URLs**, add: `https://YOUR-VERCEL-HOST/auth/callback` and `http://localhost:3003/auth/callback` (local smoke test).
6. **API keys** (Project Settings, **API**):
   - Copy these names into your notes (values stay in Supabase only until step 4):
     - `NEXT_PUBLIC_SUPABASE_URL` (Project URL)
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (anon public)
     - `SUPABASE_SERVICE_ROLE_KEY` (service_role, server only, optional for now)
7. **Database URLs** (Project Settings, **Database**, **Connection string**):
   - **Direct** (port 5432): for Alembic migrations on your laptop. Export as `DATABASE_URL` when running migrations (step 2).
   - **Transaction pooler** (port 6543): for Fly.io runtime. Export as `DATABASE_URL` on Fly secrets (step 3).
8. **Create your user** (if sign-ups disabled): Authentication, **Users**, **Add user**, enter your firm email and a password.

**Verify**

- Dashboard shows project **Active**.
- Email provider enabled.
- You have noted the four Supabase-related env var **names** above (not committed anywhere).

---

## 2. Run database migrations (Alembic)

On your Mac, from the repo root:

```bash
cd /Users/ladaj/Documents/AssociateOnDemand
git checkout cursor/phase0-foundation
git pull origin cursor/phase0-foundation

cd services/api
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export DATABASE_URL='postgresql+psycopg://...'   # Supabase DIRECT URL, port 5432
alembic upgrade head
```

Use the **direct** connection string from Supabase (session mode, not pooler).

**Verify**

- Command ends with no error.
- In Supabase, **Table Editor**: tables such as `agent_jobs` / `audit_logs` exist (names per your migrations).

---

## 3. Fly.io API (`services/api`)

1. Open Terminal at repo root: `/Users/ladaj/Documents/AssociateOnDemand`.
2. If first time: `fly launch --no-deploy` and accept app name `associateondemand-api` (matches `fly.toml`).
3. Set secrets (replace values from Supabase, Upstash, Airtable; never commit):

```bash
fly secrets set \
  DATABASE_URL='...pooler URI port 6543...' \
  REDIS_URL='rediss://...' \
  AIRTABLE_PAT='...' \
  AIRTABLE_BASE_ID='...' \
  ANTHROPIC_API_KEY='...' \
  ALLOWED_ORIGINS='https://YOUR-VERCEL-HOST' \
  AOD_PII_TIER='0'
```

4. Deploy: `fly deploy` (from repo root; `fly.toml` uses `services/api/Dockerfile`).

**Fly secret / env names (API only)**

| Name | Purpose |
|------|---------|
| `DATABASE_URL` | Supabase pooler Postgres |
| `REDIS_URL` | Upstash TLS URL |
| `AIRTABLE_PAT` | Matters system of record |
| `AIRTABLE_BASE_ID` | Live base id |
| `ANTHROPIC_API_KEY` | Agent LLM calls |
| `ALLOWED_ORIGINS` | Vercel origin for CORS |
| `AOD_PII_TIER` | Keep `0` until Presidio is production-ready |

**Verify**

```bash
curl -s https://associateondemand-api.fly.dev/health
```

Expect JSON with a healthy status (exact shape per API).

---

## 4. Upstash Redis (production queue)

1. Sign in at upstash.com, click **Create database**.
2. Name it (e.g. `aod-prod`), region near `iad` (Fly primary region).
3. Open the database, copy the **TLS** connection string.
4. Paste into Fly: `fly secrets set REDIS_URL='rediss://...'` (if not set in step 3).
5. Redeploy if you only added Redis: `fly deploy`.

**Verify**

- Upstash console shows database **Active**.
- Fly app logs show no Redis connection errors after deploy.

---

## 5. Vercel web (`web/`)

1. vercel.com, **Add New**, **Project**, import `associateondemand` from GitHub.
2. **Root Directory:** set to `web` (not repo root).
3. Framework: Next.js (auto).
4. **Environment Variables** (Production; repeat for Preview if desired):

| Variable | Example / note |
|----------|----------------|
| `AIRTABLE_PAT` | Your PAT |
| `AIRTABLE_BASE_ID` | Live base id |
| `NEXT_PUBLIC_API_URL` | `https://associateondemand-api.fly.dev` |
| `NEXT_PUBLIC_PII_TIER` | `0` |
| `NEXT_PUBLIC_SUPABASE_URL` | From Supabase API settings |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key only |
| `AOD_AUTH_ENABLED` | **`false` for first deploy** |

5. Click **Deploy**. Note the production URL (e.g. `https://associateondemand-xxx.vercel.app`).
6. Return to Supabase **URL Configuration**: set **Site URL** and **Redirect URLs** to the real Vercel host (`/auth/callback`).
7. Update Fly: `fly secrets set ALLOWED_ORIGINS='https://YOUR-REAL-VERCEL-HOST'`.

**Verify**

- Open `https://YOUR-VERCEL-HOST/dashboard` (auth still off: loads without login).
- Settings page shows Airtable connected when PAT/base are correct.

---

## 6. Enable auth last

Only after Supabase keys are in Vercel and redirect URLs match.

1. Vercel, project **Settings**, **Environment Variables**.
2. Set `AOD_AUTH_ENABLED` to `true` for Production.
3. Confirm `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set (not placeholders).
4. **Redeploy** (Deployments, three dots on latest, **Redeploy**).
5. Open site in a private window: `/dashboard` should redirect to `/login`.
6. Sign in with password or magic link; confirm Settings shows **Signed in as** your email (and name if set in Supabase user metadata).

**Verify**

- Logged out: `/matters` redirects to `/login?next=/matters`.
- After sign-in: `/dashboard` loads; Settings **Account** row shows your email.
- Sign out button returns to `/login`.

---

## 7. Monday morning smoke test (5 minutes)

1. `curl -s https://associateondemand-api.fly.dev/health`
2. Open production URL, sign in.
3. Dashboard loads live matters (not sample data).
4. Open one matter, run Command Panel `pm:research` smoke (optional).
5. Settings: confirm document handling tier and signed-in account.

---

## Reference

- Full architecture notes: [deploy.md](./deploy.md)
- Local dev (auth off): [local-dev.md](./local-dev.md)
- Env template: `web/.env.local.example`
