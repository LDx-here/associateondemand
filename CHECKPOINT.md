# AssociateOnDemand — Agent checkpoint

**Last updated:** 2026-06-17 (EDT)  
**Workspace:** `/Users/ladaj/Developer/AssociateOnDemand`  
**Branch:** `cursor/phase0-foundation`  
**Remote:** `origin` → `git@github.com:LDx-here/associateondemand.git`

## Project status: **COMPLETE** (BUILD_SPEC implementation)

Production firm OS is live with all Phase 0–7 surfaces and Phase 4 specialist agents wired to Anthropic + SKILL files.

| Surface | URL |
|---------|-----|
| **Web** | https://aod-next.vercel.app |
| **API** | https://associateondemand-api.fly.dev |
| **Airtable** | `appqwRBpXjg9xlnhZ` (11/11 tables) |

### Agents (Anthropic when `ANTHROPIC_API_KEY` set)

| Agent | SKILL | Command examples |
|-------|-------|------------------|
| Research | `04-Research-Memo-SKILL.md` | `pm:research …` |
| Drafting | `05-Drafting-SKILL.md` | `draft cover letter …` |
| Mass audit | `06-Mass-Audit-SKILL.md` | `mass audit AOD-1001` |
| Legal mapping | `07-Legal-Mapping-SKILL.md` | `legal mapping elements` |
| Pattern | Qdrant + Airtable seed | `pattern similar cases` |
| Strategy | Heuristic + patterns | `strategy approach …` |
| Strong Reader | OCR pipeline orchestrator | `/agents/strong-reader/run` |

### Web UI (complete)

Dashboard (KPIs + Recharts), matters (TanStack + **New matter**), contacts, tasks, calendar, inbox, knowledge map, intake, eImmigration import, settings, auth.

### Smoke & tests

```bash
bash scripts/smoke-production.sh
bash scripts/smoke-docker-e2e.sh
cd web && npm run test:airtable
cd services/api && python -m pytest tests/ -q
```

### Optional / external keys (not code blockers)

- **Midpage / Fastcase** citator APIs — env keys enable future live calls; memos flag Shepardizing today
- **Google Drive** document storage — not integrated (BUILD_SPEC stretch)
- **LiteLLM** Presidio scrub proxy — compose has real Presidio images locally; Fly tier-0 uses manual approval gate
- **Qdrant on Fly** — pattern seed from Airtable via `POST /agents/pattern/seed`; internal Fly Qdrant optional

---

## Commands to resume

```bash
cd /Users/ladaj/Developer/AssociateOnDemand
git pull origin cursor/phase0-foundation
bash scripts/smoke-production.sh
docker compose up -d --build
cd web && npm run dev -- -p 3003
```

## Quick links

- [README.md](README.md) · [skill → agent map](docs/runbooks/skill-agent-map.md)
- [BUILD_SPEC gap audit](docs/constitution/BUILD_SPEC-GAP-AUDIT.md)
