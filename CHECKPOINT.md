# Agent checkpoint — AssociateOnDemand

**Last updated:** 2026-05-26 (EDT)  
**Branch:** `cursor/phase0-foundation`  
**Remote:** `origin` → `git@github.com:LDx-here/associateondemand.git`

## Last completed

- **This session (post-`0c26e1b`):**
  - **Matters metadata backfill script.** Added [`scripts/airtable-matters-metadata-backfill.mjs`](scripts/airtable-matters-metadata-backfill.mjs) — idempotent PATCH of empty `title`, `country`, `posture`, `court` (when inferable from `case_type`/`summary` only), bumps `updated_at` (America/New_York). Uses `data/backups/airtable-client-names-*.jsonl` for country hints only; never writes client PII (BUILD_SPEC §13.4).
  - **Agent sandbox could not reach Airtable** this turn (`CONNECT tunnel failed, response 403` / `ENOTFOUND`). Run locally: `node scripts/airtable-matters-metadata-backfill.mjs` then `cd web && npm run test:airtable` and `curl -s http://localhost:3000/api/matters | jq '.matters[].title'`.

## Prior completed

- **Phase 0–2:** Docker stack (Postgres, Redis, Qdrant, API, Presidio stub), constitution pack, brain vault, Next.js app shell, Airtable client with `data/dev-seed.json` demo fallback, dashboard/matters/workbench, tasks/notes CRUD, timeline, case assessment, command search + `pm:` dispatch.
- **Phase 3 (partial):** Strong Reader OCR pipeline, intake agents, `/intake/*` + document upload UI; gated by `AOD_PII_TIER=1`.
- **Phase 4 (mostly green):** PM orchestrator + Redis inbox; **BUILD_SPEC §8 AgentResult contract** with `FiveAnchors`, `Uncertainty`, `GapQuestion`, `SourceRef`, `is_valid()`; PM Orchestrator now files an inbox card whenever `is_valid()` fails or the agent flags incomplete with gaps.
- **Phase 5 (partial):** D3 knowledge map + pattern/strategy agents (Qdrant health wired).
- **Phase 6:** eImmigration CSV/JSON import UI + API + runbook.
- **Phase 7 (partial):** Auth middleware stub (`AOD_AUTH_ENABLED`); deploy runbook.

- **This session (checkpoint follow-up to `68d0344`):**
  - **Matters BUILD_SPEC §2 spec columns staged.** Added `web/src/lib/airtable/fields.ts#SPEC_FIELDS.matters.{title, country, posture, court, judge, next_hearing, assessment_data, created_at, updated_at}` and expanded the frontend `Matter` type accordingly. `mapMatter` now reads the new columns and mirrors `posture` into the legacy `proceduralPosture` field so the workbench header keeps working. `MattersTable` exposes `Title`, `Country`, and `Posture` columns plus a posture filter (with `aria-label` on both selects). `saveCaseAssessmentInAirtable` and `updateMatterDeadlineInAirtable` bump `updated_at` on every PATCH.
  - **Idempotent provisioner script ready.** [`scripts/airtable-matters-columns.mjs`](scripts/airtable-matters-columns.mjs) lists the live Matters fields via the Meta API, POSTs only the missing 9 columns, then backfills `created_at`/`updated_at` on the 5 existing rows using each row's Airtable `createdTime` system field. The script shells out via `curl` so it works in sandboxes that block Node's DNS resolver.
  - **Sandbox blocker carried forward.** The agent could not actually POST to `api.airtable.com` this turn — the parent agent moved the workspace root mid-session and the outbound HTTPS proxy stopped allowlisting `api.airtable.com` for any Node-launched call. `npm run test:airtable` and `node scripts/airtable-matters-columns.mjs` both fail with `CONNECT tunnel failed, response 403` from inside the sandbox. They run cleanly on a normal developer machine. See [`docs/runbooks/known-page-errors.md`](docs/runbooks/known-page-errors.md) for the curl smoke commands the next agent (or the user) should run after pulling this commit.
  - **UI polish from the static page review:**
    - `web/src/components/GlobalTaskList.tsx` — added a confirmation modal in front of the Complete action so the BUILD_SPEC smoke can open and close it without firing a PATCH against a real task. Optimistic update is reverted on failure and the error surfaces in the modal.
    - `web/src/components/CalendarBoard.tsx` — friendly empty-state banner above the grid for both "no events at all" and "no events match the current filter" cases.
    - `web/src/app/(app)/settings/page.tsx` — tightened `maskPat` to leak only the constant `pat` prefix plus the length.
  - **Build green:** `cd web && rm -rf .next && npm run build` ✅ (Next 16.2.4 Turbopack, 14/14 routes).
- **Commits ready, push pending:** `2564c35` (checkpoint) and `dd18875` (activity log) are committed on `cursor/phase0-foundation` locally. Sandbox blocked outbound SSH and HTTPS auth to `github.com` in this session — run `git push origin cursor/phase0-foundation` from your machine to ship.

- **Prior session (commit `68d0344`):**
  - Real CLAUDE constitution + Research Memo SKILL landed (delivered upstream this turn).
  - **BUILD_SPEC v1 accepted.** Wrote [`docs/constitution/BUILD_SPEC-GAP-AUDIT.md`](docs/constitution/BUILD_SPEC-GAP-AUDIT.md) (~87% compliance after this round, gaps documented).
  - **Live Airtable schema migrated to snake_case.** Ran [`scripts/airtable-rename-fields.mjs`](scripts/airtable-rename-fields.mjs): 44 fields renamed across Matters/Contacts/Tasks/Notes/Documents/Legal Elements/PM Inbox; 4 additive columns added (Notes.type, PM Inbox.options/resolution/resolved_at); 1 PII column tombstoned (`Matters.Client Name` → `DEPRECATED_client_name` — Airtable Meta API rejects field DELETE on this plan, so the column stays in the base but no app code reads it). 5 Matters rows backed up to `data/backups/airtable-client-names-2026-05-26.jsonl` (gitignored). Documented in BUILD_SPEC gap audit under "Schema Adaptations".
  - **`LEGACY_FIELDS` retired.** `web/src/lib/airtable/fields.ts` and `queries.ts` read/write through `SPEC_FIELDS` exclusively. All consumers verified via `npm run build`.
  - **PM Inbox + Corrections promoted to Airtable.** `services/api/app/services/airtable.py` is the new FastAPI Airtable writer (uses `typecast: true` so unknown agent names auto-add as singleSelect options). `services/pm_queue.enqueue_inbox_review` mirrors every inbox card to Airtable PM Inbox; `routers/correction_router.submit_correction` writes a durable Corrections row in addition to the brain markdown/jsonl. Both writers fall back silently when Airtable is unconfigured. Smoke verified end-to-end via [`scripts/smoke-airtable-writes.mjs`](scripts/smoke-airtable-writes.mjs) (creates → reads-back → deletes; PM Inbox and Corrections both pass).
  - **Four BUILD_SPEC pages built.** All return HTTP 200 against live Airtable:
    - [`/inbox`](web/src/app/(app)/inbox/page.tsx) — PM Inbox cards with agent/matter/what-tried/what-needed, action buttons rendered from the `options` field, resolution modal → PATCH `status='Resolved'`, `resolution`, `resolved_at`. Dashboard KPI now reads `countUnreadInboxFromAirtable()`.
    - [`/calendar`](web/src/app/(app)/calendar/page.tsx) — Monthly grid keyed off `Events`; chips colored by `type`; click → side drawer with link to Matter; "Filing deadlines only" toggle; "+ Add event" composer POSTs to `/api/events`.
    - [`/tasks`](web/src/app/(app)/tasks/page.tsx) — Global task list with filters (Matter, Status, Priority, Assigned, Due Range, Filing Deadlines Only, search), Complete + Add Task wired to the existing matter-scoped task endpoints.
    - [`/settings`](web/src/app/(app)/settings/page.tsx) — Phase-1 read-only: Profile (live People row), Airtable connection (base id + redacted PAT), PII tier + auth status, doc links.
  - **Research agent unblocked.** Removed PENDING refuse guard; now follows BUILD_SPEC §9 multi-source protocol with MIDPAGE/FASTCASE key tier check + MANUAL FLAG inbox card when both keys absent.
  - **Five-Anchors AgentResult contract** wired (Pydantic v2). PM Orchestrator validates every result via `is_valid()` and routes failures to the inbox.
  - **Dashboard rebuilt** to BUILD_SPEC §7.1.
  - **Matter Detail tabs reordered to BUILD_SPEC §7.3.**
  - **Airtable lib migrated to BUILD_SPEC §3 layout** (`web/src/lib/airtable/{client,queries,fields,types}.ts`).
  - **Schema adaptations vs. BUILD_SPEC §2.** Airtable Meta API rejects `autoNumber`/`createdTime` field creation and field DELETE; bootstrap and rename scripts encode the workarounds. People/Events/Strategy Patterns/Corrections use Single line text primaries; `created_at` columns are writable `dateTime`; Matters keeps `DEPRECATED_client_name` tombstone.
  - **Smoke test green:** `cd web && npm run test:airtable` reports 11/11 OK (Matters 5, Contacts 0, Tasks 6, Notes 0, Documents 0, Legal Elements 6, PM Inbox 3, People 1, Events 0, Strategy Patterns 0, Corrections 0). PM Inbox + Corrections write smoke also green (`node scripts/smoke-airtable-writes.mjs`).
  - **Build green:** `cd web && rm -rf .next && npm run build` ✅ (Next 16.2.4 Turbopack, 14/14 routes including the four new pages).
  - **Dev-server page smoke:** `/inbox` `/calendar` `/tasks` `/settings` all return HTTP 200 with no console errors.
  - Removed staging dir `litigation-associate 3/`.
  - Runbook: [`docs/runbooks/airtable-base-setup.md`](docs/runbooks/airtable-base-setup.md) — 11-table copy-paste checklist + bootstrap instructions.

## Next step

1. **Run Matters metadata backfill** (if not done): `node scripts/airtable-matters-metadata-backfill.mjs` — confirm all 5 rows have non-empty `title` in `/api/matters`.
2. **Phase 3 Strong Reader** — flip `AOD_PII_TIER=1` after Presidio sidecars replace compose stub; verify `PRESIDIO_HEALTH_URL` and intake OCR path.
3. **Daily-driver checklist** — attorney uses live base for one full matter cycle (dashboard → matter detail → task → inbox resolve) without demo mode.
4. **Drafting / Mass Auditor / Legal Mapping / Strong Reader orchestrator** — wire as discrete agents under `services/api/app/agents/` per BUILD_SPEC §4 (items 4 + 5 deferred).
5. **Phase 7:** wire Clerk/Supabase and set `AOD_AUTH_ENABLED=true` before public deploy.

## Blockers

| Item | Notes |
|------|--------|
| Metadata backfill pending | Run `node scripts/airtable-matters-metadata-backfill.mjs` on a machine with Airtable API access (agent sandbox blocked `api.airtable.com` when the script was committed). |
| Airtable field DELETE | Meta API rejects field deletion on this base/plan. `Matters.DEPRECATED_client_name` tombstone remains in the base; remove via Airtable UI when convenient. |
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
