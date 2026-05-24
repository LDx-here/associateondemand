# Deploy checklist (Phase 7 placeholders)

1. **Secrets** — `AIRTABLE_PAT`, `OPENAI_API_KEY` / `ANTHROPIC_API_KEY`, DB URLs; never commit `.env.local`.
2. **Web (Vercel)** — root `web/`, `NEXT_PUBLIC_API_URL` → production API URL.
3. **API** — build from repo root (`dockerfile: services/api/Dockerfile`, `context: .`).
4. **Data** — managed Postgres + Redis + Qdrant; nightly Postgres backup.
5. **PII** — keep `AOD_PII_TIER=0` until Presidio health checks pass in staging.
6. **Auth** — gate `(app)` routes before external users.
7. **Alerts** — Resend for deadline reminders; calendar sync optional.
