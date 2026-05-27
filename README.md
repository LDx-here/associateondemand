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
| 1 | Done | Live Airtable 11/11 tables, dashboard KPIs, professional firm UI |
| 2 | Done | Tasks/notes CRUD, assessment-first workbench, timeline, command + PM dispatch |
| 3 | Partial | Strong Reader OCR path, tier-0 banner, intake progress table; flip tier 1 when Presidio is real |
| 4 | Partial | PM orchestrator, Research SKILL + Anthropic, inbox on failure; drafting/audit/mapping stubs |
| 5 | Partial | D3 knowledge map + live-matter graph drawer; pattern "insufficient data" path |
| 6 | Done | eImmigration import with field-mapping preview table |
| 7 | Partial | Attorney-safe settings, auth stub, deploy runbook links (no production deploy yet) |

Runbooks: [docs/runbooks/local-dev.md](docs/runbooks/local-dev.md) · [docs/runbooks/deploy.md](docs/runbooks/deploy.md) · [docs/runbooks/eimmigration-import.md](docs/runbooks/eimmigration-import.md)

Onboarding: [docs/attorney-onboarding/](docs/attorney-onboarding/)

Constitution: [docs/constitution/README.md](docs/constitution/README.md)

## User action required

- **Airtable:** PAT + base ID in `web/.env.local` — run `npm run test:airtable`
- **Research agent:** Replace PENDING stub at `docs/constitution/04-Research-Memo-SKILL.md`
- **Strong Reader:** Flip `AOD_PII_TIER=1` after Presidio sidecars replace compose stub
- **Production auth:** Wire Clerk/Supabase and set `AOD_AUTH_ENABLED=true`
