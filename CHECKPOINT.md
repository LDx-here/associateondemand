# Agent checkpoint — AssociateOnDemand

**Last updated:** 2026-06-17 (EDT)  
**Workspace:** `/Users/ladaj/Developer/AssociateOnDemand`  
**Branch:** `cursor/phase0-foundation`  
**Remote:** `origin` → `git@github.com:LDx-here/associateondemand.git`

## Base status: **COMPLETE** (Phase 0 foundation)

The firm operating system base is **live and usable** for daily work at **PII tier 0**.

| Surface | URL |
|---------|-----|
| **Web (production)** | https://aod-next.vercel.app |
| **API (production)** | https://associateondemand-api.fly.dev |
| **Airtable base** | `appqwRBpXjg9xlnhZ` (11/11 tables) |

**What works in production today**

- Sign-in (Supabase) + protected dashboard/matters/tasks/calendar/inbox/settings  
- Live matters, tasks, events, assessment, timeline, knowledge map (Airtable)  
- Command Panel + Assessment dispatch → **Anthropic research memos** (SKILL + matter context)  
- PM orchestrator, inbox, corrections path, eImmigration import preview  
- Fly: Postgres (Supabase), Redis (Upstash), Alembic migrations, intake OCR (tier 0)  

**Smoke:** `bash scripts/smoke-production.sh` (prod) · `bash scripts/smoke-docker-e2e.sh` (local)

---

## Phase status

| Phase | Status | Notes |
|-------|--------|-------|
| 0 | **Done** | Docker, constitution, brain vault, governance |
| 1 | **Done** | Live base, 11/11 `test:airtable`, firm UI |
| 2 | **Done** | CRUD, assessment, command panel, global tasks/inbox/calendar/settings |
| 3 | **Base done** | OCR + intake UI, tier 0 gate; Presidio remains compose stub (tier 1 later) |
| 4 | **Base done** | PM + **live research LLM**; drafting/mass_audit/legal_mapping = inbox-safe stubs |
| 5 | **Base done** | Knowledge graph from live matters + drawer; Qdrant pattern agent deferred |
| 6 | **Done** | eImmigration Tier A + mapping preview |
| 7 | **Done** | Auth, Vercel, Fly, Supabase, Upstash, deploy runbooks |

**Post-base backlog** (not blocking daily use): full drafting/mass-audit/legal-mapping LLM agents, Presidio production sidecars, Qdrant pattern index, Contacts table UI, TanStack matter table, Midpage/Fastcase citator keys.

---

## Last completed

- **Base complete pass:** Production smoke script; tier-0 health = ok without Qdrant/Presidio; CHECKPOINT/README aligned to live prod.
- **Anthropic research:** `claude-sonnet-4-6` on Fly; memos use Research SKILL + Airtable matter context.
- **Auth + deploy:** Vercel `AOD_AUTH_ENABLED=true`; Supabase AOD project; Fly `associateondemand-api`; Redis `aod-prod`.
- **Prior:** OCR/migrations, skill-agent map, auth-aware home page, gap fixes, Docker E2E PASS.

---

## Commands to resume

```bash
cd /Users/ladaj/Developer/AssociateOnDemand
git checkout cursor/phase0-foundation
git pull origin cursor/phase0-foundation

bash scripts/smoke-production.sh          # prod
docker compose up -d --build              # local API
bash scripts/smoke-docker-e2e.sh
cd web && npm run dev -- -p 3003
npm run test:airtable
```

---

## Quick links

- [README.md](README.md) · [skill → agent map](docs/runbooks/skill-agent-map.md)
- [deploy](docs/runbooks/deploy.md) · [local-dev](docs/runbooks/local-dev.md)
- [BUILD_SPEC gap audit](docs/constitution/BUILD_SPEC-GAP-AUDIT.md)
