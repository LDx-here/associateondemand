# Agent checkpoint — AssociateOnDemand

**Last updated:** 2026-05-27 (EDT)  
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
| 7 | **Scaffold complete** | Auth middleware, login (password/magic link), Settings session row, `fly.toml`, `deploy.md`. LD checklist: [phase-7-deploy-checklist.md](docs/runbooks/phase-7-deploy-checklist.md). **Blocked on you:** Supabase project, Alembic on direct URL, Vercel/Fly/Upstash deploy clicks |

**BUILD_SPEC compliance:** ~97% ([gap audit](docs/constitution/BUILD_SPEC-GAP-AUDIT.md))

## Last completed (E2E session)

- **Docker smoke:** Daemon not running on agent host; added `./scripts/smoke-docker-e2e.sh` and curl examples in `strong-reader-setup.md` for user machine.
- **Gap fixes:** Matter Events tab loads live Airtable + Add Event form (`MatterEventsPanel`, `POST /api/events`); dashboard Recent Activity includes PM Inbox agent rows; `POST /api/corrections` writes Corrections table via Next.js; `data/uploads/smoke-test.pdf` for intake smoke (gitignored path).
- **Verify:** `npm run build` pass; `test:airtable` 11/11.
- **Audit UX fixes:** Matter **Assessment** tab: `CaseAssessmentEditor` + `MatterDeadlineForm` above legal element pathway matrix; clearer matrix heading/helper line. Knowledge map drawer: adjacent matter IDs from graph links for concept nodes (`...and N more` overflow); optional matter `snippet` from `listMatters` summaries in `/api/knowledge-graph`. Command Panel: `/api/command` forwards `fullMemo` (128k cap, `fullMemoTruncated`), `AgentResultPanel` summary + expandable full memo + clipboard copy only.
- **Phase 7 complete:** `@supabase/ssr` middleware (gated by `AOD_AUTH_ENABLED` + keys), login page, `/auth/callback`, Settings session (email/name), `docs/runbooks/deploy.md`, `docs/runbooks/phase-7-deploy-checklist.md`, root `fly.toml`, `web/.env.local.example`.
- **BUILD_SPEC backlog pass:** §7.3.3 richer task detection + composer banner; inbox resolve **Suggested next steps** + optional tasks POST; DOCX memo export (`POST /agents/research/memo-export`, Next `/api/research/memo-export`); Correction `formatting_convention` YAML append when `firm-rules.md` exists; KM drawer snippets for linked matters list.

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

1. Start **Docker Desktop**, then from repo root: `bash scripts/smoke-docker-e2e.sh` (use Terminal.app if Cursor reports pseudo-tty or command not found).
2. `cd web && npm run dev` (port **3003**): test Command Panel `pm:research …` and Assessment **Dispatch**.
3. Matter **Events** tab: add a test event; confirm it appears on `/calendar`.
4. Flip Strong Reader when ready: `docs/runbooks/strong-reader-setup.md`.

## Blockers

| Item | Notes |
|------|--------|
| Presidio production | Compose stub until real sidecars |
| Full LLM agents | Drafting / mass auditor / legal mapping are inbox-safe stubs |
| Production auth/deploy | Scaffold in repo; user must create Supabase + Vercel + Fly accounts and paste secrets |
| Docker daemon | Must be running locally for `/health`, PM dispatch, and intake OCR (`bash scripts/smoke-docker-e2e.sh`) |

## Commands to resume

```bash
cd /Users/ladaj/Documents/AssociateOnDemand
git checkout cursor/phase0-foundation
git pull origin cursor/phase0-foundation

cd web && npm run dev   # port 3003 per user preference
npm run test:airtable
bash scripts/smoke-docker-e2e.sh   # Docker Desktop must be running; use bash not ./
docker compose up -d --build
curl -s http://localhost:8000/health | jq
```

## Quick links

- [README.md](README.md) · [BUILD_SPEC gap audit](docs/constitution/BUILD_SPEC-GAP-AUDIT.md)
- [Strong Reader setup](docs/runbooks/strong-reader-setup.md) · [local-dev](docs/runbooks/local-dev.md) · [deploy](docs/runbooks/deploy.md)
