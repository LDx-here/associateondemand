# Agent checkpoint — AssociateOnDemand

**Last updated:** 2026-06-15 (EDT)  
**Workspace:** `/Users/ladaj/Developer/AssociateOnDemand` (moved from `~/AssociateOnDemand` / `~/Documents/…` — old tree had iCloud eviction; do not use)  
**Branch:** `cursor/phase0-foundation`  
**Remote:** `origin` → `git@github.com:LDx-here/associateondemand.git`

## Phase status (honest)

| Phase | Status | Notes |
|-------|--------|-------|
| 0 | **Done** | Docker, constitution, brain vault, governance |
| 1 | **Done** | Live base `appqwRBpXjg9xlnhZ`, 11/11 `test:airtable`, firm UI polish |
| 2 | **Done** | CRUD, assessment default tab, command panel, global tasks/inbox/calendar/settings |
| 3 | **Partial** | OCR pipeline + intake UI; tier 0 gate; runbook `docs/runbooks/strong-reader-setup.md`; Presidio still stub |
| 4 | **Partial** | PM + Research wired; Assessment dispatch → `/api/command` → FastAPI; drafting/mass_audit/legal_mapping stubs |
| 5 | **Partial** | Knowledge graph from live matters; node drawer; pattern insufficient-data message |
| 6 | **Done** | eImmigration Tier A + mapping preview UI |
| 7 | **Scaffold complete — deploy next** | Auth middleware, login, `fly.toml`, `deploy.md`, LD checklist. **Next:** Supabase + Alembic + Fly + Vercel + Upstash (see [phase-7-deploy-checklist.md](docs/runbooks/phase-7-deploy-checklist.md)) |

**BUILD_SPEC compliance:** ~97% ([gap audit](docs/constitution/BUILD_SPEC-GAP-AUDIT.md))

## Last completed (E2E session)

- **Repo move:** Fresh clone at `/Users/ladaj/Developer/AssociateOnDemand`; copied `web/.env.local`; retired broken iCloud-evicted `~/AssociateOnDemand`.
- **Docker smoke PASS:** `bash scripts/smoke-docker-e2e.sh` — health, PM research dispatch, intake OCR upload (tier 0).
- **API fixes:** OCR deps in Docker image (`pdf2image`, tesseract, poppler); Alembic `002_documents_extracted_facts`; unified `app.db` ORM for intake persistence.
- **Production web:** Vercel live at https://aod-next.vercel.app (Airtable routes; API/Command Panel pending Fly).

## Prior (overnight + continuation)

- **Continuation:** Matter list filters (status, case type, country, posture); dashboard recent activity reads live Notes from Airtable; metadata backfill confirmed 5/5 rows populated; auth env vars documented in `deploy.md`.
- **Milestone 1:** PM dispatch from Command Panel + Assessment Next Action; knowledge-map drawer; matter Documents upload; inbox options JSON already parsed; global `/tasks` filters verified.
- **Milestone 2:** `docs/runbooks/strong-reader-setup.md`; intake `UploadProgressTable` (§7.8); tier-0 banner copy without env leaks.
- **Milestone 3:** `pm:` / research routing; PM stubs for drafting, mass_audit, legal_mapping; pattern insufficient-data `AgentResult`.
- **Milestone 4:** `/api/knowledge-graph` builds from live matters + legal elements; eImmigration field-mapping preview.
- **Milestone 5:** Settings production deployment section → `deploy.md`.
- **Milestone 6:** CHECKPOINT, README, gap audit refreshed.
- **Verify:** `npm run build` pass; `npm run test:airtable` 11/11 OK.

## Next step (user return)

1. **Production deploy** — follow [phase-7-deploy-checklist.md](docs/runbooks/phase-7-deploy-checklist.md) (Supabase → Alembic → Fly → Upstash → Vercel → enable auth).
2. Local smoke (already passing): `bash scripts/smoke-docker-e2e.sh` then `cd web && npm run dev -- -p 3003`.
3. UI spot-check: Command Panel `pm:research …`, Assessment **Dispatch**, Events → `/calendar`.

## Blockers

| Item | Notes |
|------|--------|
| Presidio production | Compose stub until real sidecars |
| Full LLM agents | Drafting / mass auditor / legal mapping are inbox-safe stubs |
| Production auth/deploy | Supabase/Vercel/Fly/Upstash accounts + CLI login (`fly auth login`, `vercel login`); paste secrets into hosts only |
| Docker daemon | Required for local API/intake; smoke script verifies stack |

## Commands to resume

```bash
cd /Users/ladaj/Developer/AssociateOnDemand
git checkout cursor/phase0-foundation
git pull origin cursor/phase0-foundation

docker compose up -d --build
bash scripts/smoke-docker-e2e.sh
cd web && npm run dev -- -p 3003
npm run test:airtable
curl -s http://localhost:8000/health | jq
```

## Quick links

- [README.md](README.md) · [BUILD_SPEC gap audit](docs/constitution/BUILD_SPEC-GAP-AUDIT.md)
- [Strong Reader setup](docs/runbooks/strong-reader-setup.md) · [local-dev](docs/runbooks/local-dev.md) · [deploy](docs/runbooks/deploy.md)
