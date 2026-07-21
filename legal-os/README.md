# RMV Legal OS (greenfield track)

Full-stack TypeScript Legal OS per the [Cursor Implementation Strategy](./docs/Recover%20My%20Value%20Legal%20OS%20%E2%80%94%20Cursor%20Implementation%20Strategy.md): React 19 + Express + tRPC 11 + Drizzle + MySQL.

**This is a sibling app to production AOD** (`web/` + `services/api/` + Airtable). It does not replace https://aod-next.vercel.app.

## Prerequisites

- Node.js 20+
- Docker (for local MySQL) **or** TiDB/MySQL `DATABASE_URL`

## Quick start

```bash
cd legal-os
cp .env.example .env

# Start MySQL (port 3307)
docker compose up -d

# Install & setup DB
npm install
npm run db:setup

# Terminal 1 — API (port 3001)
npm run dev

# Terminal 2 — Vite frontend (port 5173)
npx vite
```

Open http://localhost:5173/associate

Admin: http://localhost:5173/admin — set **Admin API key** banner to match `ADMIN_API_KEY` in `.env` (default `dev-admin-key-change-me`).

## Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | Yes | MySQL connection string |
| `ADMIN_API_KEY` | Dev | Admin tRPC auth header |
| `CRON_SECRET` | Cron | Abandoned session handler |
| `ANTHROPIC_API_KEY` | Optional | Claude drafting (fallback template without) |
| `OPENAI_API_KEY` | Optional | GPT drafting |
| `STRIPE_SECRET_KEY` | Optional | Checkout — invoice-after-delivery when unset |
| `STRIPE_WEBHOOK_SECRET` | Optional | Payment webhook |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Optional | Frontend Stripe |
| `CLIO_CLIENT_ID/SECRET/REDIRECT_URI` | Optional | Clio OAuth — **disabled until `CLIO_ENABLED=true`** per LEGAL_BOUNDARIES |
| `CLIO_WEBHOOK_SECRET` | Optional | Clio webhooks |
| `S3_*` | Optional | S3 storage — local `./uploads` fallback |
| `RESEND_API_KEY` | Optional | Abandoned intake follow-up emails |

## Matter Engine

Stage machine (forward only, except `intake → quote` Quick Upload skip):

```
intake → conflict_check → quote → engagement → drafting → review → delivery → closed
```

## Tests

```bash
npm test
```

## Auth roadmap: Supabase (not Manus OAuth)

Production AOD (`web/`) already uses **Supabase Auth** (magic link + password). Legal OS will converge on the same identity layer for a unified product — **not** Manus OAuth.

- **Today (local dev):** Admin routes authenticate via `ADMIN_API_KEY` header until Supabase JWT middleware is wired in `server/_core/trpc.ts`.
- **Next:** Add Supabase JWT verification (same project as prod AOD), map `auth.users` → Legal OS `users` table, retire the admin key banner for deployed environments.
- **Prod deploy:** Shared Supabase session across AOD web and Legal OS admin; role claims gate `/admin` vs intake surfaces.

## Production notes

- MySQL/TiDB required (schema uses Drizzle MySQL dialect — SQLite not supported without schema rewrite)
- Clio: per `LEGAL_BOUNDARIES.md`, no production connector until paying subscription + scoped need

## Dual-track relationship

| Track | Stack | Status |
|-------|-------|--------|
| **AOD production** | Next.js + FastAPI + Airtable | Live at aod-next.vercel.app |
| **Legal OS** | React + Express + tRPC + MySQL | Greenfield in `legal-os/` |

Strategy docs also copied to `.aod-context/technical/legal-os/`.
