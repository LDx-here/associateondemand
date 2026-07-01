# AssociateOnDemand — Agent checkpoint

**Last updated:** 2026-06-16 (vision + marketplace charter added)
**Workspace:** `/Users/ladaj/Developer/AssociateOnDemand`  
**Branch:** `cursor/phase0-foundation`  
**Remote:** `origin` → `git@github.com:LDx-here/associateondemand.git`

## Project status: **BUILD_SPEC complete** (code)

Production firm OS is live. All Phase 0–7 surfaces, Phase 4 specialist agents, intake→Airtable persistence, PM inbox approve→resume, document linter on export, matter workbench UX, and GitHub CI are implemented in code.

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

### Recently closed gaps (2026-06-15)

- Intake OCR → **Documents** row in Airtable; matter Documents tab refreshes after upload
- Agent corrections → **Notes** / **Strategy Patterns** in Airtable
- PM valid runs → agent memo persisted to matter **Notes**
- **PM Inbox Approve** → `/agents/pm/dispatch` resume with attorney resolution
- **Document linter** (§11) on memo export; DOCX **Page X of Y** footer
- Matter workbench: timeline filters, legal element add/expand, richer document columns
- **GitHub CI**: pytest + Next build + eslint
- Docker compose: `PRESIDIO_HEALTH_URL` → real Presidio analyzer

### UX polish (2026-06-16)

- **Citation package ZIP** download from Associate panel + `/api/drafting/citation-package`
- **Tasks list**: single Airtable query (`listAllTasksFromAirtable`) instead of N+1
- **Associate panel**: HTTP error surfacing, linter issues inline, export failure messages
- **Matters table**: pagination (25/50/100) with row counts
- **Auth UX**: forgot/reset password flow, sidebar sign-in/out, signed-in home → dashboard redirect
- **Quick actions**: require open matter (no more silent `AOD-1001` fallback)

### Full-project pass (2026-06-16 overnight)

- **Intake OCR pipeline** fixed (`pipelines/ocr_pipeline.py`) — Tesseract + PDF text + PII anonymization hook
- **eImmigration Tier A** writes to Airtable (`upsert_matter_from_import`)
- **PM orchestrator** creates Airtable tasks from agent gap questions
- **Research memos** append source documentation table; Midpage/Fastcase client stubs
- **Matter edit modal** (court, judge, posture, deadlines) + PATCH `/api/matters/[id]`
- **Task completion modal** on matter tab with completion docs/note → Airtable + system note
- **Live timeline** interleaves calendar events; inbox unread badge in sidebar
- **18 API tests** pass; Next build green

### Optional / external keys (not code blockers)

- **Midpage / Fastcase** citator APIs — env keys enable live calls
- **Google Drive** document storage — not integrated (BUILD_SPEC stretch)
- **LiteLLM** Presidio scrub proxy — compose uses Presidio sidecars directly
- **Qdrant on Fly** — pattern seed via `POST /agents/pattern/seed`; cloud Qdrant optional

## Product vision — verified associate marketplace (2026)

**North star:** A platform where a client (or contracting attorney) submits an assignment — *“I need X drafted; here are the facts and attachments”* — and receives **associate-quality work** that reads like it came from a person, not a raw chatbot. **La'Dajia (RMV) verifies** first; later, **contract associate attorneys** verify work they take on — matching entry-level lawyers who want flexible, Docketly-style contract work without full employment.

**Docketly analogy (adapted for associate work):**
| Docketly (coverage) | AssociateOnDemand (deliverables) |
|---------------------|----------------------------------|
| Hearing assignment + attachments | Writing assignment + fact packet + templates |
| Local attorney appears | Verified associate output + attorney sign-off |
| Platform handles logistics | PM orchestrator + specialist agents + inbox |

**Usage tiers (template labor model):**
1. **Template tier** — Firm workbook / DOCX templates exist (AOS brief, research memo, cover letter). Agent fills from facts; attorney approves.
2. **Custom tier** — No template yet. Extra labor: build template once, then reuse at tier 1. Billable as setup + execution.
3. **Research / audit tier** — Memo, mass audit, legal mapping — already wired via agents + citation packages.

**Human feel (not “AI slop”):**
- PM inbox when agents pause (gaps, MANUAL FLAG, linter failures)
- Attorney corrections → Notes + Strategy Patterns (training loop)
- Citation verification packages + document linter before export
- Future: named associate persona, assignment queue, SLA/status like “In review / Returned for revision / Approved”

**Multi-attorney future (permissions-aware build order):**
1. **Now:** Single verifying attorney (Supabase auth + RMV inbox)
2. **Next:** Assignment request form (facts + attachments + deliverable type + tier)
3. **Then:** Review queue + approve/reject/return workflow on PM Inbox
4. **Later:** Contractor roles (verify-only vs draft-only), payout/assignment routing — needs user OAuth, billing, bar rules (document in LEGAL_BOUNDARIES)

**Autonomous agent charter (between check-ins every few days):**
- Ship code that works without external keys; scaffold with graceful fallbacks
- Prefer: assignment intake → agent run → export → attorney inbox over new infrastructure
- Run smoke + pytest + build before push/deploy
- Only block on user for: SMTP/auth secrets, API keys, Airtable schema writes, legal/billing decisions
- Update this CHECKPOINT when a pass completes

### Scheduled automation (laptop can be closed)

| Mechanism | What runs | Laptop needed? |
|-----------|-----------|----------------|
| **Cursor Automation** (Mon/Thu cron + Cloud Agent) | Full build pass per `docs/runbooks/autonomous-agent-pass.md` | No — runs in Cursor cloud after you save the automation |
| **GitHub Actions** `scheduled-health.yml` | pytest + Next build + production smoke curl | No |
| **This chat / local dev server** | Only while Cursor is open | Yes |

Enable Cloud Agents: https://cursor.com/dashboard?tab=cloud-agents

---

```bash
bash scripts/smoke-production.sh
bash scripts/smoke-docker-e2e.sh
cd web && npm run test:airtable
cd services/api && python -m pytest tests/ -q
cd web && npm run build
```

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
