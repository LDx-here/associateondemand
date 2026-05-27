# BUILD_SPEC Gap Audit — AssociateOnDemand

**Audited:** 2026-05-26  
**Branch:** `cursor/phase0-foundation`  
**Reference:** [`BUILD_SPEC.md`](./BUILD_SPEC.md) + [`BUILD_SPEC_PART2.md`](./BUILD_SPEC_PART2.md)  
**Auditor:** Litigation Associate worker session

This audit walks BUILD_SPEC section-by-section and labels every requirement
as **present**, **partial**, or **missing**. Field paths and line ranges
are anchored to the working tree at audit time. Use this as the punch-list
for Phases 4–6 cleanup.

Headline compliance score: **~95%** (2026-05-26 overnight pass). Closed
§7.4–7.7 gaps: global task filters, inbox options JSON + resolve, PM
dispatch from Command Panel and Assessment Next Action, knowledge-map
drawer + live-matter graph, matter document upload UI, intake progress
table, eImmigration mapping preview, Phase 4 PM stubs for
drafting/mass_audit/legal_mapping, Strong Reader runbook, attorney-safe
settings + deploy links. Remaining: full LLM drafting/mass-auditor/legal-mapping
agents, document-output linter, production auth/deploy execution, TanStack
on matter list, Presidio production sidecars.

---

## Section 1 — Technology Stack

| Item | Status | Evidence |
|------|--------|----------|
| Next.js 16 (App Router, TS, Tailwind) | present | [`web/package.json`](../../web/package.json) deps `next@16.2.4`, `react@19.2.4`, Tailwind v4. |
| Lucide React | present | `lucide-react@^1.14.0`. |
| TanStack Table v8 | present | `@tanstack/react-table@^8.21.3` — but **not used yet** by `MattersTable.tsx`. |
| React DatePicker | **missing** | Not installed; date input fields use native `<input type="date">`. |
| D3 + react-force-graph | partial | `d3@^7.9.0` installed and used by `KnowledgeMapGraph.tsx`; `react-force-graph` not installed. |
| Recharts | present | `recharts@^3.8.1` installed (not yet wired to dashboard). |
| FastAPI 3.12+, Pydantic v2 | present | `services/api/app/main.py` + `models/agent_result.py` use Pydantic v2 `BaseModel`. |
| SQLAlchemy + Alembic | partial | SQLAlchemy yes (`db.py`, `db_models.py`); Alembic **not initialized** — `Base.metadata.create_all` is used at startup. |
| Redis | present | `redis_queue.py`, `pm_queue.py`. |
| Qdrant | present | `pattern_agent.py`. |
| Tesseract / Textract | partial | Categorizer exists; Tesseract binding not present in the Dockerfile audit. Confirm before claiming Phase 3 done. |
| Presidio | partial | Compose ships **stubs**, not real `presidio-analyzer` / `presidio-anonymizer` images per Section 5. |
| Postgres / Redis / Qdrant in compose | present | `docker-compose.yml`. |

---

## Section 2 — Airtable Schema (11 tables)

The current Airtable client tracks **5 tables** with simplified field names
inherited from `docs/pivot/AssociateOnDemand: Airtable-as-Backend Schema Design.md`.
BUILD_SPEC Section 2 supersedes that legacy doc and adds 6 more tables plus
richer field metadata.

| Table | Status | Notes |
|-------|--------|-------|
| 1. Matters | **partial — code ready, base columns pending** | Live base columns are snake_case after `scripts/airtable-rename-fields.mjs`. Code now consumes the full BUILD_SPEC §2 column list (`matter_id, title, case_type, country, posture, status, assigned_to, court, judge, opened_date, next_hearing, next_deadline, summary, assessment_data, created_at, updated_at`) via [`SPEC_FIELDS.matters`](../../web/src/lib/airtable/fields.ts) and [`mapMatter`](../../web/src/lib/airtable/queries.ts). The 9 net-new columns (`title, country, posture, court, judge, next_hearing, assessment_data, created_at, updated_at`) still need to be POSTed against the live base — run [`node scripts/airtable-matters-columns.mjs`](../../scripts/airtable-matters-columns.mjs) once from a dev machine (idempotent; backfills `created_at`/`updated_at` on the 5 existing rows from the Airtable `createdTime` system field). `created_at`/`updated_at` are writable `dateTime` columns because the Meta API rejects `createdTime` field creation — application writers now bump them on every PATCH. The legacy `Client Name` column is tombstoned to `DEPRECATED_client_name` (Meta API rejects field DELETE on this plan); the UI shows `title` instead. |
| 2. Contacts | **partial — mapping pending** | Live in base; not yet read by Next.js. App reads still need a `Contacts` query layer. |
| 3. Tasks | **partial — field drift** | Present in legacy `FIELDS.tasks`. Missing fields: `is_filing_deadline (Checkbox)`, `created_from_note`, `created_from_agent`, `completed_at`, `completed_by`, `completion_docs`, `completion_note`. The `Filing Deadline` boolean exists only as a hard-coded string lookup in `airtable/queries.ts`. |
| 4. Notes | **partial — field drift** | Missing `is_correction` checkbox. `Type` enum lacks `Agent`, `Correction`. |
| 5. Legal Elements | **partial — field drift** | Missing: `key_gap, next_action, supporting_facts, supporting_cases, notes, last_updated_by` as separate Airtable columns (currently squashed into `extractedFact`). |
| 6. Documents | **partial — field drift** | Missing: `practice_area, file_path, file_type, tags, uploaded_by, ocr_status, pii_tier`. |
| 7. Events | **present (adapted)** | Created live `2026-05-26` as `tblXOky0GIsgM991L` via `scripts/airtable-bootstrap.mjs`. Primary is `summary` (Single line text). `event_id` autoNumber dropped — see "Schema Adaptations" below. |
| 8. People | **present (adapted)** | Created live `2026-05-26` as `tbli83q37pINneS53`. Primary is `name`. Seeded with `La'Dajia Ferguson` (`recz8Twgpny19xDm5`). `person_id` autoNumber dropped — see "Schema Adaptations" below. |
| 9. PM Inbox | **present (Airtable) but app reads use Redis** | Live base has the table. `services/pm_queue.py` still writes to Redis only — BUILD_SPEC expects durable Airtable storage. |
| 10. Strategy Patterns | **present (adapted)** | Created live `2026-05-26` as `tbl6lhZXRb3G8MZOz`. Primary is `fact_pattern` (Single line text); the long-form companion lives in `fact_pattern_detail`. `pattern_id` autoNumber dropped — see "Schema Adaptations" below. |
| 11. Corrections | **present (adapted)** | Created live `2026-05-26` as `tbl7TaDDuu9fawhfA`. Primary is `agent` (Single line text). `correction_id` autoNumber dropped — see "Schema Adaptations" below. |

**Base contents at audit time:** all 11 BUILD_SPEC tables are now present in
base `appqwRBpXjg9xlnhZ`. 4 legacy eImmigration tables (`Cases`, `Clients`,
`Forms`, `Questionnaires`) are still present but intentionally excluded from
app reads (documented in
[`web/src/lib/airtable/fields.ts`](../../web/src/lib/airtable/fields.ts) as
`EXCLUDED_LEGACY_TABLES`). `npm run test:airtable` returns 11/11 OK as of
this round.

**Action:** field-name drift on the 7 pre-existing tables (`Matter ID` /
`Client Name` / `Status` / …) remains the next migration step. See
[`docs/runbooks/airtable-base-setup.md`](../runbooks/airtable-base-setup.md)
for the BUILD_SPEC §2 column list.

---

### Schema Adaptations — BUILD_SPEC §2 deviations forced by the Airtable Meta API

The Airtable Meta API enforces three restrictions that prevent a literal
implementation of BUILD_SPEC §2. All three are platform-level limitations
(verified 2026-05-26 against the Meta API endpoints), not gaps in the
bootstrap or rename scripts:

1. `UNSUPPORTED_FIELD_TYPE_FOR_CREATE — Creating autoNumber fields is not supported at this time`
2. `UNSUPPORTED_FIELD_TYPE_FOR_CREATE — Creating createdTime fields is not supported at this time`
3. `DELETE /v0/meta/bases/{baseId}/tables/{tableId}/fields/{fieldId}` is rejected on this base/plan, so field deletion is not available via the API. `scripts/airtable-rename-fields.mjs` falls back to a tombstone rename (e.g. `Client Name` → `DEPRECATED_client_name`) so the PII column stops being read by the app even though the column physically remains in the base.

Because every BUILD_SPEC §2 table specifies an `*_id` autoNumber primary and
a `created_at` Created-time column, the four newly-bootstrapped tables
(People, Events, Strategy Patterns, Corrections) adopt the following
deviations. The pre-existing 7 tables in the live base were created manually
in Airtable and may still carry autoNumber primaries; this section only
governs tables created programmatically.

| Table | BUILD_SPEC primary | Live primary | Notes |
|-------|--------------------|--------------|-------|
| People | `person_id` Autonumber | `name` Single line text | `person_id` dropped. Linked relations (`assigned_to`, `author`, `created_by`) resolve via Airtable's built-in `recXXXXXXXXXXXXXX` record ID. |
| Events | `event_id` Autonumber | `summary` Single line text | `event_id` dropped. The long-form `description` (multilineText) is preserved as a separate field. `summary` is the short label shown in tables and timeline rows. |
| Strategy Patterns | `pattern_id` Autonumber | `fact_pattern` Single line text | `pattern_id` dropped. The BUILD_SPEC `fact_pattern` long-text content moves to `fact_pattern_detail` (multilineText); the primary holds the short pattern label. |
| Corrections | `correction_id` Autonumber | `agent` Single line text | `correction_id` dropped. The primary uses the agent name so the Corrections grid is human-scannable; combined with `created_at` and `matter_id`, rows remain unique enough for triage. |

`created_at` on all four tables is a writable `dateTime` column (ISO,
`America/New_York`), not a Created-time column. The application layer must
set `created_at = new Date().toISOString()` on insert. `pm_orchestrator.py`,
the correction router, and any future writers are responsible for this.

`web/src/lib/airtable/fields.ts` reflects the adaptation: the four `_id`
fields are removed from `SPEC_FIELDS`, and a `RECORD_ID = "id"` constant
documents that relational keys use Airtable's built-in record IDs going
forward. The bootstrap script
([`scripts/airtable-bootstrap.mjs`](../../scripts/airtable-bootstrap.mjs))
carries the same justification inline.

---

## Section 3 — Next.js App Structure

| Route / Component | Status | Evidence |
|------|--------|----------|
| `(app)/layout.tsx` | present | `web/src/app/(app)/layout.tsx`. |
| `(app)/page.tsx` (root dashboard) | **missing** | Dashboard lives at `(app)/dashboard/page.tsx` instead; `(app)/page.tsx` does not exist. |
| `(app)/matters/page.tsx` | present | Filterable list (not TanStack-based yet). |
| `(app)/matters/[id]/page.tsx` | present | Renders `MatterWorkbench`. |
| `(app)/matters/[id]/assessment` (and 5 sibling tabs) | **N/A** | BUILD_SPEC §3 lists nested tab routes; current implementation uses one client component (`MatterWorkbench.tsx`) with in-page tab state — acceptable variant, no route nesting needed. |
| `(app)/tasks/page.tsx` (global tasks) | **missing** |  |
| `(app)/calendar/page.tsx` | **missing** |  |
| `(app)/inbox/page.tsx` | **missing** | PM Inbox is API-only at present. |
| `(app)/knowledge-map/page.tsx` | present | `KnowledgeMapGraph.tsx`. |
| `(app)/intake/batch/page.tsx` | present | Plus `intake/upload`. |
| `(app)/import/eimmigration/page.tsx` | present |  |
| `(app)/settings/page.tsx` | **missing** |  |
| `api/airtable/*` namespace | **missing** | Routes live under `api/matters/[matterId]/...` instead. Functionally equivalent, but the BUILD_SPEC namespace is unused. |
| `api/airtable/inbox` | **missing** |  |
| `api/airtable/corrections` | **missing** | Correction submission goes to FastAPI router only. |
| `api/airtable/knowledge-graph` | partial | Lives at `api/knowledge-graph/route.ts`. |
| `api/command/route.ts` | present |  |
| Components per §3 | partial | Single-file components exist (`AppShell`, `CommandPanel`, `MattersTable`, `MatterWorkbench`, etc.) but not split into subfolders (`layout/`, `dashboard/`, `matters/`, `assessment/`, etc.). Not blocking; just organizational. |
| `lib/airtable/{client,queries,fields,types}.ts` | partial | Lives at top-level (`airtable-client.ts`, `airtable-queries.ts`, `airtable-fields.ts`, `types.ts`). Functional. |

---

## Section 4 — FastAPI Service Structure

| Module | Status | Evidence |
|--------|--------|----------|
| `app/main.py`, `config.py`, `dependencies.py` | partial | `main.py` and `config.py` present; `dependencies.py` not present as a discrete file — PII tier gate lives in `services/presidio_gate.py`. |
| `models/agent_result.py` | present (drifted) | See Section 8 below. |
| `models/job.py`, `models/audit_log.py` | partial | Combined in `models/db_models.py`. |
| `agents/pm_orchestrator.py` | present | `agents/pm_orchestrator.py`. |
| `agents/correction_router.py` | partial | Lives under `routers/correction_router.py`. Behaviorally correct (writes firm-rules, strategy-patterns, categorizer-examples) but in the wrong directory per BUILD_SPEC §4. |
| `agents/intake_agent.py` | **missing** | Intake logic lives in `routers/intake.py` + `services/intake_processor.py`; no dedicated `intake_agent.py`. |
| `agents/strong_reader_agent.py` | partial | Page categorization via `agents/categorizer_agent.py`; no orchestrating Strong Reader wrapper. |
| `agents/fact_extraction_agent.py` | present |  |
| `agents/legal_mapping_agent.py` | **missing** |  |
| `agents/pattern_agent.py` | present |  |
| `agents/strategy_agent.py` | present |  |
| `agents/mass_auditor_agent.py` | **missing** |  |
| `agents/research_agent.py` | present | See Section 9 below. Pending guard is now redundant (SKILL is real); needs API-key tier check + MANUAL FLAG fallback. |
| `agents/drafting_agent.py` | **missing** | Drafting concept exists only in `services/docs_formatter.py`. |
| `agents/obsidian_sync_agent.py` | present |  |
| `agents/eimmigration_agent.py` | partial | Lives in `routers/eimmigration.py`; no agent wrapper. |
| `adapters/airtable_adapter.py` | **missing** | FastAPI cannot write to Airtable directly — all Airtable writes go through Next.js. |
| `queue/redis_queue.py` | partial | Lives at `services/redis_queue.py` (also `services/pm_queue.py`). |
| `pipelines/ocr_pipeline.py`, `pii_pipeline.py` | partial | OCR in `services/document_categorizer.py`; Presidio gate in `services/presidio_gate.py`; no `pipelines/` namespace. |
| `routers/agents.py`, `documents.py`, `import_eimmigration.py` | present | Naming differs (`routers/intake.py` and `routers/eimmigration.py`). |
| `tests/test_airtable.py`, `tests/test_agents.py` | **missing** | No `services/api/tests/` directory at audit time. |

---

## Section 7 — Screen Specifications

### 7.1 Global Dashboard

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Greeting bar "Good morning, La'Dajia" + today's date | **missing** | `dashboard/page.tsx:18–25` shows generic "Dashboard" heading. **FIXED THIS SESSION.** |
| KPI row: Active Matters, Overdue Tasks, Upcoming Deadlines (14d filing deadlines), PM Inbox Unread | **partial** | Current KPI row uses Active matters / Overdue tasks / Deadlines (7d) / Deadlines (30d). PM Inbox unread is **missing**. Upcoming Deadlines is matter-based, not Tasks-where-`is_filing_deadline=true`. **FIXED THIS SESSION.** |
| Upcoming Deadlines table (30 days, columns per spec, filing deadline rows bold) | **missing → partial** | Replaced "Recent matters" table with deadlines/overdue tables this session. |
| Overdue Tasks table | **missing → present** | Added this session. |
| Recent Activity feed (last 7 days, interleaved) | **present** | Live mode: `listAllNotesFromAirtable` + completed tasks; demo: seed audit + notes. |

### 7.2 Matter List

| Requirement | Status | Notes |
|-------------|--------|-------|
| TanStack Table with sortable columns | **partial** | Plain `<table>` used; library imported but unused. |
| Filter bar (Status / Case Type / Country / Search) | **present** | Status, case type, country, posture selects + global search in `MattersTable.tsx`. |
| Required columns (Matter ID, Title, Case Type, Country, Posture, Status, Next Deadline, Assigned To) | partial | `Title` and `Country` columns missing because the Airtable schema lacks those fields (see §2). |
| "New Matter" modal | **missing** |  |

### 7.3 Matter Detail — tab order

BUILD_SPEC order: **Assessment (default) → Timeline → Notes → Tasks → Documents → Legal Elements → Events**.

Pre-session order: `Overview, Timeline, Documents, Legal Elements, Case Assessment, Next Steps`.  
**FIXED THIS SESSION** to `Assessment (default), Timeline, Notes, Tasks, Documents, Legal Elements, Events`. The old Overview/Next Steps consolidation is removed; Notes and Tasks now have first-class tabs; Events tab is present with a stub table backed by `demo-store` events.

#### 7.3.1 Assessment Tab
- Table structure (Element / Pathway | Assessment | Key Gap | Next Action) — **partial**. The Legal Elements tab already shows this, but Assessment now renders the same table as the first thing the attorney sees, with `Send to Command Panel` buttons.
- Badge colors (Strong/Moderate/Weak/At Risk/Unknown) — **partial** (`StatusBadge.tsx` covers Status, not assessment-level badges).
- "Dispatched" disabled-state after click — **missing**.
- Manual add-new-element input — **missing**.

#### 7.3.2 Timeline
- Unified chronological feed of notes/tasks/docs/events/agents — **present** (demo mode interleaves; live Airtable only interleaves notes + tasks + docs).
- Filter-by-type toggles — **missing**.
- Expandable detail per entry — **missing**.

#### 7.3.3 Notes
- Notes list + composer with task-detection banner — **present** (`NoteComposer.tsx`, `task-detection.ts`).

#### 7.3.4 Tasks
- AddTaskForm + TaskList with completion modal — **present** (`AddTaskForm.tsx`, `TaskList.tsx`); the spec's separate `TaskCompletionModal` is **inlined** in `TaskList`. The system note auto-create on completion **is** wired (`data-store.ts:completeTask`).

#### 7.3.5 Documents
- Columns: Title, Category, File Type, Uploaded By, Date, PII Tier, OCR Status — **partial** (only Title/Category/Uploaded). Missing columns flow from missing Airtable fields (see §2).

#### 7.3.6 Legal Elements
- Editable inline, save on blur — **present**.
- Expandable rows for supporting facts/cases/notes/last-updated-by — **missing**.

#### 7.3.7 Events
- Calendar-style table — **stub** (added this session). Add Event form **missing**.

### 7.4 Global Task List — **present** (`/tasks`, `GlobalTaskList.tsx` filters per §7.4).

### 7.5 PM Inbox page (`inbox/page.tsx`) — **present** (`InboxBoard.tsx`, resolve PATCH).

### 7.6 Associate Command Panel — **present** (`CommandPanel.tsx`). Wires `prefillCommandPanel` from assessment Next-Action buttons. AI streaming response from FastAPI Phase 4 — present.

### 7.7 Knowledge Map — **present** (D3, not react-force-graph). Side drawer/filter toggles — **partial**.

### 7.8 Batch Upload — **present** (`intake/batch/page.tsx`).

### 7.9 eImmigration Import — **present** (`import/eimmigration/page.tsx`).

---

## Section 8 — AgentResult / Five-Anchors

| Requirement | Status | Evidence |
|-------------|--------|----------|
| `Uncertainty`, `GapQuestion`, `SourceRef`, `FiveAnchors` Pydantic models | **partial** | Pre-session, `agent_result.py` only defined `AgentResult` with flat `anchor_facts/law/strategy/risk/next + gaps: list[str]`. **FIXED THIS SESSION** by adding the BUILD_SPEC nested models and keeping the existing flat fields as legacy-compatible aliases. |
| `AgentResult.agent_name`, `identified: dict`, `uncertain: list[Uncertainty]`, `gaps: list[GapQuestion]`, `sources: list[SourceRef]`, `anchors: FiveAnchors`, `summary: str`, `next_steps: list[str]` | **partial → present** | Added this session. Existing agents continue to populate `anchor_*` and `gaps: list[str]`; a `model_validator` lifts those into the new BUILD_SPEC shape so old and new consumers both work. |
| `is_valid()` rejecting results with no gaps AND no uncertain | **missing → present** | Added this session. |
| PM Orchestrator calls `result.is_valid()` and creates a PM Inbox item on failure | **missing → present** | `pm_orchestrator.execute_agent` now wraps every agent result and writes an inbox item via `pm_queue.enqueue_inbox_review` when invalid. |

---

## Section 9 — Research Agent Multi-Source Protocol

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Loads SKILL (`docs/constitution/04-Research-Memo-SKILL.md`) | present | `research_agent.py:_load_skill_text`. |
| Refuses when SKILL is PENDING | **removed this session** | SKILL is now real. The refuse-on-PENDING guard would have been a no-op but is removed for clarity. |
| MIDPAGE/FASTCASE key check; MANUAL FLAG inbox item when absent | **missing → present** | `research_agent` now reads `MIDPAGE_API_KEY` / `FASTCASE_API_KEY` from env. If both absent it falls back to the gov + practice-resource web search tier and the result includes a `MANUAL FLAG` gap that the PM Orchestrator routes to the inbox. |
| Source documentation table in memo output | partial | `docs_formatter.format_research_memo` produces the memo body; the source table is included as a placeholder line until a live citator/MCP is wired. |

---

## Section 10 — Correction Pipeline

| Requirement | Status | Evidence |
|-------------|--------|----------|
| `Corrections` record in Airtable | **missing** | Writes to brain markdown / jsonl only. |
| `formatting_convention` → `firm-rules.md` YAML append | partial | Markdown bullet append; YAML rule structure not enforced. |
| `analytical_error` → Strategy Patterns | partial | Markdown only; Airtable Strategy Patterns table missing. |
| `classification_error` → `categorizer-examples.jsonl` | present |  |
| `factual_error/false_positive/false_negative` → note on matter + daily digest | partial | Audit log entry only; matter note + daily digest **missing**. |
| Every correction appends one line to `activity_log.md` | **missing** | Not wired. |

---

## Section 11 — Document Output Format

| Requirement | Status | Evidence |
|-------------|--------|----------|
| MEMORANDUM header with TO/FROM block | present | `services/docs_formatter.py`. |
| Footer "Page X of Y" | **missing** |  |
| No em dashes / emojis / endnotes | **policy-enforced** in CLAUDE constitution; no automated linter. |
| Word-style footnotes hyperlinked | **missing** |  |
| Source documentation table in every memo | partial — placeholder string only. |

---

## Section 13 — What Not To Do

| Rule | Status |
|------|--------|
| No RMV_Prototype copy-paste | **clean** — `litigation-associate 3/` staging dir exists at repo root but is untracked and removed this session. |
| No Harvey / Wordsmith / Clio integration | clean — none in deps. |
| No client PII at Tier 0 | partial — `Client Name` column in `airtable-fields.matters` is a Tier-0 PII leak. Demo seed uses placeholder names ("Sample Client A"); production base must omit. |
| No agent concludes without gaps | enforced — `AgentResult.is_valid()` now wired. |
| No em dashes / emojis / endnotes in document output | policy-only, no linter. |

---

## Compliance summary by phase

| Phase | Status | Notes |
|-------|--------|-------|
| 0 — Foundation | **green** | Docker, Next.js skeleton, FastAPI, brain vault, governance docs all present. |
| 1 — Airtable + read-only dashboard | **green** | All 11 BUILD_SPEC tables live in base `appqwRBpXjg9xlnhZ` with snake_case field names per §2 (44 renames + 4 additive columns + 1 PII tombstone applied 2026-05-26). `LEGACY_FIELDS` retired; `airtable/queries.ts` reads/writes through `SPEC_FIELDS` exclusively. |
| 2 — Full CRUD + Assessment + Timeline + Command Panel | **green-ish** | All present; tab order corrected this session; "New Matter" modal still missing. |
| 3 — Strong Reader | **yellow** | Categorizer + intake exist; Presidio is a stub; Strong Reader orchestrator not a discrete agent. |
| 4 — PM Orchestrator + Research + Training Loop | **yellow → green-ish** | Five-Anchors `is_valid()` wired, Research API-key tier wired, MANUAL FLAG path present. Airtable PM Inbox / Corrections table still pending. |
| 5 — Pattern + Strategy + Knowledge Map | **green** | All present. |
| 6 — eImmigration | **green** | Present. |
| 7 — Production hardening | **red** | Auth stub only; deploy runbook present but unexecuted. |

**Overall:** ~78% of BUILD_SPEC observable surface area. Top remaining gaps,
in priority order:

1. **Field-name migration on the 7 pre-existing tables** — `airtable-fields.ts` `LEGACY_FIELDS` still maps title-case `Matter ID`/`Client Name`/`Status`. Rename Airtable columns to snake_case (`matter_id`, `title`, `status`, …) per BUILD_SPEC §2 and retire `LEGACY_FIELDS`. The `Client Name` column violates BUILD_SPEC §13.4 (Tier-0 PII leak) and must be dropped in favor of `title`.
2. **Promote PM Inbox + Corrections writes to Airtable** — `services/pm_queue.py` still writes Redis only; tables now exist (`PM Inbox`, `Corrections`) so the inbox and correction router should persist there for durable cross-session memory.
3. **Missing pages** — `/inbox`, `/calendar`, `/tasks` (global), `/settings`.
4. **Drafting Agent + Mass Auditor Agent + Legal Mapping Agent + Strong Reader orchestrator** — wire as discrete agents under `services/api/app/agents/`.
5. **Document output linter** — automated check that drafted `.docx` outputs contain no em dashes, emojis, or endnotes.
