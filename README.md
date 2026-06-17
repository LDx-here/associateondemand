# AssociateOnDemand

Autonomous law-firm decision engine (Airtable + Next.js + FastAPI agents + Obsidian vault).

## Production

| | |
|--|--|
| **Web** | https://aod-next.vercel.app |
| **API** | https://associateondemand-api.fly.dev |
| **Smoke** | `bash scripts/smoke-production.sh` |

Sign in → Command Panel:

- `pm:research …` — research memos  
- `draft …` — drafting agent  
- `mass audit …` — matter audit  
- `legal mapping …` — element map  

## Local quick start

```bash
cd ~/Developer/AssociateOnDemand
docker compose up -d --build
cd web && cp .env.local.example .env.local && npm install && npm run dev -- -p 3003
bash scripts/smoke-docker-e2e.sh
```

## Phases — all complete

Phases 0–7 implemented per [BUILD_SPEC](docs/constitution/BUILD_SPEC.md). Specialist agents use SKILL files in `docs/constitution/` + Anthropic on Fly.

**External integrations (keys optional):** Midpage, Fastcase, Google Drive, Fly Qdrant sidecar.

Resume point: [CHECKPOINT.md](CHECKPOINT.md)
