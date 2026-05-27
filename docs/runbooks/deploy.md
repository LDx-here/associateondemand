# Deploy checklist (Phase 7 placeholders)

1. **Secrets** — `AIRTABLE_PAT`, `OPENAI_API_KEY` / `ANTHROPIC_API_KEY`, DB URLs; never commit `.env.local`.
2. **Web (Vercel)** — root `web/`, `NEXT_PUBLIC_API_URL` → production API URL.
3. **API** — build from repo root (`dockerfile: services/api/Dockerfile`, `context: .`).
4. **Data** — managed Postgres + Redis + Qdrant; nightly Postgres backup.
5. **PII** — keep `AOD_PII_TIER=0` until Presidio health checks pass in staging.
6. **Auth** — set `AOD_AUTH_ENABLED=true` and wire Clerk or Supabase in `web/src/middleware.ts` before external users. While `AOD_AUTH_ENABLED=false`, all `(app)` routes remain open (dev stub).
7. **Auth env (stub today)** — `AOD_AUTH_ENABLED` (default `false`), optional `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` when you adopt Clerk.
8. **Alerts** — Resend for deadline reminders; calendar sync optional.
