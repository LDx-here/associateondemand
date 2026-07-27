# Airtable → Google Sheets migration audit (Phase 1)

**Date:** 2026-07-26  
**Live Airtable base:** `appqwRBpXjg9xlnhZ` (11 tables)

## What Airtable was doing

Airtable was the **system of record** for all firm OS data:

| Table | Domain | Read frequency | Write frequency | Quota impact |
|-------|--------|----------------|-----------------|--------------|
| **Matters** | Matter list, workbench header, intake linking | Every dashboard, matters list, matter page SSR | Create on assignment/intake; PATCH on edit | High — list all on every matters view |
| **Notes** | Timeline, agent output, facts, templates meta | Per-matter + dashboard activity | Agent dispatch, fact save, template upload, task complete | High — N+1 per matter; large template JSON |
| **Tasks** | Dashboard deadlines, matter Tasks tab, global list | Dashboard + matter pages | Assignment create, task complete | Medium |
| **Documents** | Matter Documents tab, templates | Per matter | OCR upload, template register | Medium |
| **PM Inbox** | Inbox board, assignments | Inbox + matter review | Assignment lifecycle, agent escalations | Medium |
| **Legal Elements** | Matter Legal Elements tab | Per matter | Manual add/edit | Low |
| **Contacts** | `/contacts`, matter Overview | List + per matter | Create/link | Low |
| **Events** | Calendar, timeline | Per matter | Calendar sync | Low |
| **Strategy Patterns** | Firm Memory, pattern agent | Templates, agent seed | Firm Memory save, skills | Low |
| **Corrections** | Training loop | Rare | Save as skill | Low |
| **People** | Settings profile | Settings page | Manual in base | Very low |

### Code touchpoints

**Web (primary reader/writer):**
- `web/src/lib/airtable/` — client, queries, fields, types
- `web/src/lib/data-store.ts` — demo/quota fallback facade
- ~40 API routes and components import Airtable queries or `data-store`

**Fly API (agent persistence):**
- `services/api/app/services/airtable.py` — PM Inbox, Notes, Documents, Corrections, Strategy Patterns
- Used by PM orchestrator, intake OCR, eImmigration import, agents

**Env vars:**
- `AIRTABLE_PAT`, `AIRTABLE_BASE_ID` (web + Fly)
- `AOD_FORCE_DEMO_MODE` — force bundled sample data

### Why quota burned without “active use”

1. **SSR reads** — dashboard loads matters + tasks + notes + inbox on every visit
2. **No server-side cache** — each Vercel request hit Airtable fresh (`cache: no-store`)
3. **Pagination via full table scans** — `airtableListAll` paginates entire tables
4. **Scheduled health checks** — GitHub Actions smoke + cron pings production
5. **Airtable billing model** — monthly API call cap on plan tier, not just rate limit

## Phase 1 migration (shipped)

| Capability | Store |
|------------|--------|
| Matters list/detail/create/edit | **Google Sheets** (when configured) |
| Notes list/create/update (all note types) | **Google Sheets** |
| Tasks, Documents, Inbox, Contacts, etc. | **Airtable** (unchanged) or demo |
| Fly API agent writes | **Airtable** (Phase 2) |

**Feature flag:** `DATA_STORE=google_sheets` | `airtable` | auto-detect (Sheets preferred)

## Google Sheets schema mapping

Each Airtable table → one sheet tab; columns mirror BUILD_SPEC §2 snake_case (`web/src/lib/google-sheets/schema.ts`).

Relationships use plain-text `matter_id` (e.g. `AOD-1001`) instead of Airtable linked record IDs — simpler export and no formula quirks.

## Export paths

- Native: Google Sheets UI → CSV/XLSX
- App: Settings → Open firm spreadsheet; `GET /api/data-source` returns URLs
- Demo fallback: `data/dev-seed.json` when no store configured
