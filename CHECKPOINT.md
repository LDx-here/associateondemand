# Agent checkpoint — AssociateOnDemand

**Last updated:** 2026-05-26 (EDT)  
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
| 7 | **Partial** | Settings attorney-safe + deploy link; auth stub only; no Vercel/Railway deploy |

**BUILD_SPEC compliance:** ~95% ([gap audit](docs/constitution/BUILD_SPEC-GAP-AUDIT.md))

## Last completed (overnight)

- **Milestone 1:** PM dispatch from Command Panel + Assessment Next Action; knowledge-map drawer; matter Documents upload; inbox options JSON already parsed; global `/tasks` filters verified.
- **Milestone 2:** `docs/runbooks/strong-reader-setup.md`; intake `UploadProgressTable` (§7.8); tier-0 banner copy without env leaks.
- **Milestone 3:** `pm:` / research routing; PM stubs for drafting, mass_audit, legal_mapping; pattern insufficient-data `AgentResult`.
- **Milestone 4:** `/api/knowledge-graph` builds from live matters + legal elements; eImmigration field-mapping preview.
- **Milestone 5:** Settings production deployment section → `deploy.md`.
- **Milestone 6:** CHECKPOINT, README, gap audit refreshed.
- **Verify:** `npm run build` pass; `npm run test:airtable` 11/11 OK.

## Next step (user return)

1. `git pull` and refresh dev server on port **3003**.
2. Optional: `node scripts/airtable-matters-metadata-backfill.mjs` if titles still empty.
3. `docker compose up -d` then `curl http://localhost:8000/health` for full PM/Research/upload.
4. Flip Strong Reader: follow `docs/runbooks/strong-reader-setup.md` when Presidio sidecars are real.
5. Phase 7: Clerk/Supabase + `AOD_AUTH_ENABLED=true` before public deploy.

## Blockers

| Item | Notes |
|------|--------|
| Presidio production | Compose stub until real sidecars |
| Full LLM agents | Drafting / mass auditor / legal mapping are inbox-safe stubs |
| Production auth/deploy | Documented only; user must execute |
| Docker | Confirm `/health` on return if agents offline |

## Commands to resume

```bash
cd /Users/ladaj/Documents/AssociateOnDemand
git checkout cursor/phase0-foundation
git pull origin cursor/phase0-foundation

cd web && npm run dev   # port 3003 per user preference
npm run test:airtable
docker compose up -d --build
curl -s http://localhost:8000/health | jq
```

## Quick links

- [README.md](README.md) · [BUILD_SPEC gap audit](docs/constitution/BUILD_SPEC-GAP-AUDIT.md)
- [Strong Reader setup](docs/runbooks/strong-reader-setup.md) · [local-dev](docs/runbooks/local-dev.md) · [deploy](docs/runbooks/deploy.md)
