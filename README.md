# AssociateOnDemand

Autonomous law-firm decision engine (Airtable + Next.js + FastAPI agents + Obsidian vault).

## Production (firm base — live)

| | |
|--|--|
| **Web** | https://aod-next.vercel.app |
| **API** | https://associateondemand-api.fly.dev |
| **Smoke** | `bash scripts/smoke-production.sh` |

Sign in with your Supabase user. Use Command Panel: `pm:research …` on a matter for Anthropic-backed research memos.

## Local quick start

**Prerequisites:** Node 20+, Docker Desktop (for API stack), Airtable PAT in `web/.env.local`.

```bash
cd ~/Developer/AssociateOnDemand
cp .env.example .env
docker compose up -d --build

cd web
cp .env.local.example .env.local   # add AIRTABLE_PAT + AIRTABLE_BASE_ID
npm install
npm run dev -- -p 3003
```

- Web: http://localhost:3003  
- API: http://localhost:8000/health  
- Local smoke: `bash scripts/smoke-docker-e2e.sh`  
- Airtable: `cd web && npm run test:airtable`

## Where files go

See [FILE-MAP.md](FILE-MAP.md) and [brain/README.md](brain/README.md).

## Phases

| Phase | Status | What you get |
|-------|--------|----------------|
| 0–2 | **Done** | Stack, Airtable 11/11, dashboard, matters, assessment, command, tasks, inbox, calendar |
| 3 | **Base done** | Strong Reader OCR path, tier-0 intake; Presidio stub until tier 1 |
| 4 | **Base done** | PM + live Anthropic research; drafting/audit/mapping stubs → inbox |
| 5 | **Base done** | Knowledge map from live matters; pattern/Qdrant optional later |
| 6 | **Done** | eImmigration import preview |
| 7 | **Done** | Supabase auth, Vercel + Fly + Upstash production deploy |

**Post-base backlog:** full drafting agents, Presidio production, Qdrant pattern index, citator API keys — see [CHECKPOINT.md](CHECKPOINT.md).

Runbooks: [local-dev](docs/runbooks/local-dev.md) · [deploy](docs/runbooks/deploy.md) · [skill-agent-map](docs/runbooks/skill-agent-map.md)

Constitution: [docs/constitution/README.md](docs/constitution/README.md)

## Resume point for agents

Read [CHECKPOINT.md](CHECKPOINT.md) first.
