# AssociateOnDemand

Autonomous law-firm decision engine (Airtable + Next.js + FastAPI agents + Obsidian vault).

## Quick start

**Prerequisites:** Node 20+, Docker Desktop (for API stack), optional Airtable PAT.

```bash
# 1) API + data services
cd /Users/ladaj/Documents/AssociateOnDemand
cp .env.example .env
docker compose up -d --build

# 2) Web UI
cd web
cp .env.local.example .env.local
# Optional: set AIRTABLE_PAT + AIRTABLE_BASE_ID (else demo data loads automatically)
npm install
npm run dev
```

- Web: http://localhost:3000  
- API health: http://localhost:8000/health  
- API docs: http://localhost:8000/docs  

## Where files go

See [FILE-MAP.md](FILE-MAP.md) and [brain/README.md](brain/README.md).

## Phases

| Phase | Status | What you get |
|-------|--------|----------------|
| 0 | Done | Docker stack, constitution, FILE-MAP, brain vault, governance |
| 1 | Done | Airtable client + dashboard/matters (demo fallback via `data/dev-seed.json`) |
| 2 | Done | Tasks/notes CRUD, case assessment, timeline, command search + `pm:` dispatch |
| 3 | Partial | `/intake/upload` gated by `AOD_PII_TIER=1`; Presidio stub in compose |
| 4 | Partial | PM orchestrator + Redis inbox; Research **blocked** until SKILL.md populated |
| 5 | Partial | D3 knowledge map + pattern/strategy agents (Qdrant health wired) |
| 6 | Done | eImmigration CSV/JSON import UI + API + runbook |
| 7 | Partial | Auth middleware stub (`AOD_AUTH_ENABLED`); deploy runbook |

Runbooks: [docs/runbooks/local-dev.md](docs/runbooks/local-dev.md) · [docs/runbooks/deploy.md](docs/runbooks/deploy.md) · [docs/runbooks/eimmigration-import.md](docs/runbooks/eimmigration-import.md)

Onboarding: [docs/attorney-onboarding/](docs/attorney-onboarding/)

Constitution: [docs/constitution/README.md](docs/constitution/README.md)

## User action required

- **Airtable:** PAT + base ID in `web/.env.local` — run `npm run test:airtable`
- **Research agent:** Replace PENDING stub at `docs/constitution/04-Research-Memo-SKILL.md`
- **Strong Reader:** Flip `AOD_PII_TIER=1` after Presidio sidecars replace compose stub
- **Production auth:** Wire Clerk/Supabase and set `AOD_AUTH_ENABLED=true`
