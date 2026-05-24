# Agent checkpoint — AssociateOnDemand

**Last updated:** 2026-05-24 (America/New_York)  
**Branch:** `cursor/phase0-foundation`  
**Remote:** `origin` → `git@github.com:LDx-here/associateondemand.git`

## Last completed

- **Phase 0–2:** Docker stack (Postgres, Redis, Qdrant, API, Presidio stub), constitution pack, brain vault, Next.js app shell, Airtable client with `data/dev-seed.json` demo fallback, dashboard/matters/workbench, tasks/notes CRUD, timeline, case assessment, command search + `pm:` dispatch.
- **Phase 3 (partial):** Strong Reader OCR pipeline, intake agents, `/intake/*` + document upload UI; gated by `AOD_PII_TIER=1`.
- **Phase 4 (partial):** PM orchestrator + Redis inbox; Research agent **refuses** until SKILL is populated.
- **Phase 5 (partial):** D3 knowledge map + pattern/strategy agents (Qdrant health wired).
- **Phase 6:** eImmigration CSV/JSON import UI + API + runbook.
- **Phase 7 (partial):** Auth middleware stub (`AOD_AUTH_ENABLED`); deploy runbook.
- **Governance:** `activity_log.md`, `LEGAL_BOUNDARIES.md`, attorney onboarding docs, local/deploy/eImmigration runbooks.
- **This session:** Agent checkpoint & resume protocol (`CHECKPOINT.md`, runbook, `scripts/checkpoint.sh`, Cursor rule).

## Next step

1. On session start: read this file, then `docs/runbooks/agent-checkpoint-protocol.md`.
2. **Production connectors:** set `AIRTABLE_PAT` + `AIRTABLE_BASE_ID` in `web/.env.local`; run `cd web && npm run test:airtable`.
3. **Research agent:** replace PENDING stub at `docs/constitution/04-Research-Memo-SKILL.md` (deposit real SKILL via `.incoming/` per stub instructions).
4. **Strong Reader:** flip `AOD_PII_TIER=1` after Presidio sidecars replace compose stub; verify `PRESIDIO_HEALTH_URL`.
5. **Phase 7:** wire Clerk/Supabase and set `AOD_AUTH_ENABLED=true` before public deploy.

## Blockers

| Item | Notes |
|------|--------|
| Research SKILL | `docs/constitution/04-Research-Memo-SKILL.md` is **PENDING** — do not imply research automation works |
| Airtable PAT | Optional; demo seed works without it |
| Presidio production | Compose uses health stub until real sidecars |
| Production auth | Middleware stub only until Clerk/Supabase wired |

## Commands to resume

```bash
cd /Users/ladaj/Documents/AssociateOnDemand
git checkout cursor/phase0-foundation
git pull origin cursor/phase0-foundation   # if online

# Read checkpoint first (agents: CHECKPOINT.md → runbook → continue "Next step")
cat CHECKPOINT.md

# Stack
cp .env.example .env          # if missing
docker compose up -d --build
cd web && cp .env.local.example .env.local && npm install && npm run dev

# Save work before closing laptop
./scripts/checkpoint.sh "describe milestone" --push
```

## Quick links

- [README.md](README.md) · [FILE-MAP.md](FILE-MAP.md) · [local-dev runbook](docs/runbooks/local-dev.md)
- [Checkpoint protocol](docs/runbooks/agent-checkpoint-protocol.md)
- [Constitution](docs/constitution/README.md) · [LEGAL_BOUNDARIES.md](LEGAL_BOUNDARIES.md)
