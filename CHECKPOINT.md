# Agent checkpoint — AssociateOnDemand

**Last updated:** 2026-05-26 (EDT)  
**Branch:** `cursor/phase0-foundation`  
**Remote:** `origin` → `git@github.com:LDx-here/associateondemand.git`

## Last completed

- **Phase 0–2:** Docker stack (Postgres, Redis, Qdrant, API, Presidio stub), constitution pack, brain vault, Next.js app shell, Airtable client with `data/dev-seed.json` demo fallback, dashboard/matters/workbench, tasks/notes CRUD, timeline, case assessment, command search + `pm:` dispatch.
- **Phase 3 (partial):** Strong Reader OCR pipeline, intake agents, `/intake/*` + document upload UI; gated by `AOD_PII_TIER=1`.
- **Phase 4 (mostly green):** PM orchestrator + Redis inbox; **BUILD_SPEC §8 AgentResult contract** with `FiveAnchors`, `Uncertainty`, `GapQuestion`, `SourceRef`, `is_valid()`; PM Orchestrator now files an inbox card whenever `is_valid()` fails or the agent flags incomplete with gaps.
- **Phase 5 (partial):** D3 knowledge map + pattern/strategy agents (Qdrant health wired).
- **Phase 6:** eImmigration CSV/JSON import UI + API + runbook.
- **Phase 7 (partial):** Auth middleware stub (`AOD_AUTH_ENABLED`); deploy runbook.

- **This session:**
  - Real CLAUDE constitution + Research Memo SKILL landed (delivered upstream this turn).
  - **BUILD_SPEC v1 accepted.** Wrote [`docs/constitution/BUILD_SPEC-GAP-AUDIT.md`](docs/constitution/BUILD_SPEC-GAP-AUDIT.md) (~78% compliance after this round, gaps documented).
  - **Research agent unblocked.** Removed PENDING refuse guard; now follows BUILD_SPEC §9 multi-source protocol with MIDPAGE/FASTCASE key tier check + MANUAL FLAG inbox card when both keys absent.
  - **Five-Anchors AgentResult contract** wired (Pydantic v2). PM Orchestrator validates every result via `is_valid()` and routes failures to the inbox.
  - **Dashboard rebuilt** to BUILD_SPEC §7.1: time-aware greeting + today's date, 4 KPIs (Active matters / Overdue tasks / Upcoming filing deadlines 14d / PM inbox unread), Upcoming Deadlines table (30d, filing rows bold + red border), Overdue Tasks table, Recent Activity feed (last 7d).
  - **Matter Detail tabs reordered to BUILD_SPEC §7.3:** Assessment (default) · Timeline · Notes · Tasks · Documents · Legal Elements · Events. Notes/Tasks/Events now first-class tabs; Assessment renders the Element/Pathway × Assessment × Key Gap × Next Action table with Dispatch buttons.
  - **Airtable lib migrated to BUILD_SPEC §3 layout:** `web/src/lib/airtable/{client,queries,fields,types}.ts`. Legacy `lib/airtable-*.ts` files kept as one-line shim re-exports.
  - **Live Airtable schema bootstrapped.** Ran [`scripts/airtable-bootstrap.mjs`](scripts/airtable-bootstrap.mjs) against base `appqwRBpXjg9xlnhZ` and created the 4 missing tables: People `tbli83q37pINneS53`, Events `tblXOky0GIsgM991L`, Strategy Patterns `tbl6lhZXRb3G8MZOz`, Corrections `tbl7TaDDuu9fawhfA`. Idempotent re-run confirms skip-all behavior. Seeded foundational People row `La'Dajia Ferguson` → `recz8Twgpny19xDm5`.
  - **Schema adaptations vs. BUILD_SPEC §2.** Airtable Meta API rejects both `autoNumber` and `createdTime` field creation. Dropped `person_id` / `event_id` / `pattern_id` / `correction_id` from `SPEC_FIELDS`; primaries are now `name` / `summary` / `fact_pattern` / `agent` Single line text. Relations use Airtable's built-in `recXXX` IDs (exposed as `RECORD_ID` in `fields.ts`). `created_at` on the 4 new tables is a writable `dateTime` column; writers must set ISO timestamp on insert. Documented in BUILD_SPEC gap audit under "Schema Adaptations".
  - **Smoke test green:** `cd web && npm run test:airtable` reports 11/11 OK (Matters 5, Contacts 0, Tasks 6, Notes 0, Documents 0, Legal Elements 6, PM Inbox 3, People 1, Events 0, Strategy Patterns 0, Corrections 0).
  - Build: `cd web && rm -rf .next && npm run build` ✅ passes (Next 16.2.4, Turbopack).
  - Removed staging dir `litigation-associate 3/`.
  - Runbook: [`docs/runbooks/airtable-base-setup.md`](docs/runbooks/airtable-base-setup.md) — 11-table copy-paste checklist + bootstrap instructions.

## Next step

1. **Field-name migration on the 7 pre-existing tables.** `airtable-queries.ts` still reads `LEGACY_FIELDS` (`Matter ID`, `Client Name`, `Status`, …). Rename Airtable columns to snake_case per BUILD_SPEC §2 and retire `LEGACY_FIELDS`. The `Client Name` column also violates BUILD_SPEC §13.4 (Tier-0 PII leak) — drop in favor of `title`.
2. **Promote PM Inbox + Corrections writes from Redis to Airtable** now that the tables exist. `services/pm_queue.py` + `routers/correction_router.py` are the writers to update.
3. **Strong Reader:** flip `AOD_PII_TIER=1` after Presidio sidecars replace compose stub; verify `PRESIDIO_HEALTH_URL`.
4. **Phase 7:** wire Clerk/Supabase and set `AOD_AUTH_ENABLED=true` before public deploy.
5. Build missing BUILD_SPEC pages: `/inbox` (PM Inbox cards), `/calendar`, `/tasks` (global), `/settings`.

## Blockers

| Item | Notes |
|------|--------|
| Live schema migration | App still reads against the Phase 1 base shape via `LEGACY_FIELDS`. BUILD_SPEC §2 snake_case migration deferred until column renames in Airtable UI. |
| Presidio production | Compose uses health stub until real sidecars. |
| Production auth | Middleware stub only until Clerk/Supabase wired. |
| Docker | Not running locally this session — `/health` smoke skipped; confirm next session. |

## Commands to resume

```bash
cd /Users/ladaj/Documents/AssociateOnDemand
git checkout cursor/phase0-foundation
git pull origin cursor/phase0-foundation   # if online

cat CHECKPOINT.md

cp .env.example .env          # if missing
docker compose up -d --build
cd web && cp .env.local.example .env.local && npm install && npm run dev

# Airtable bootstrap (idempotent; all 11 BUILD_SPEC tables live as of 2026-05-26):
node scripts/airtable-bootstrap.mjs
cd web && npm run test:airtable

./scripts/checkpoint.sh "describe milestone" --push
```

## Quick links

- [README.md](README.md) · [FILE-MAP.md](FILE-MAP.md) · [local-dev runbook](docs/runbooks/local-dev.md)
- [Checkpoint protocol](docs/runbooks/agent-checkpoint-protocol.md)
- [Constitution](docs/constitution/README.md) · [LEGAL_BOUNDARIES.md](LEGAL_BOUNDARIES.md)
- [BUILD_SPEC](docs/constitution/BUILD_SPEC.md) · [BUILD_SPEC gap audit](docs/constitution/BUILD_SPEC-GAP-AUDIT.md) · [Airtable base setup](docs/runbooks/airtable-base-setup.md)
