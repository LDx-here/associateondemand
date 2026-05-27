### [2026-05-26] CHECKPOINT: checkpoint: snake_case fields, PM→Airtable, /inbox /calendar /tasks /settings

### [2026-05-26] CHECKPOINT: checkpoint: bootstrap 4 missing Airtable tables, live data online

### [2026-05-26] CHECKPOINT: snake_case fields, PM→Airtable, /inbox /calendar /tasks /settings — 44 fields renamed across 7 pre-existing tables, 4 additive columns (Notes.type, PM Inbox.options/resolution/resolved_at), Matters.Client Name tombstoned (PII backup at data/backups/airtable-client-names-2026-05-26.jsonl, 5 rows); LEGACY_FIELDS retired; FastAPI PM Inbox + Corrections writers durable via services/api/app/services/airtable.py (typecast=true); four BUILD_SPEC pages live and 200 OK; build green; 11/11 smoke; ~87% compliance

### [2026-05-26] CHECKPOINT: bootstrap 4 missing Airtable tables, live data online — People (tbli83q37pINneS53), Events (tblXOky0GIsgM991L), Strategy Patterns (tbl6lhZXRb3G8MZOz), Corrections (tbl7TaDDuu9fawhfA); seeded La'Dajia Ferguson (recz8Twgpny19xDm5); 11/11 tables reachable; BUILD_SPEC §2 schema adaptations documented (autoNumber/createdTime Meta API limitations)

### [2026-05-26] CHECKPOINT: checkpoint: real CLAUDE + SKILL, BUILD_SPEC audit, Phase 4 unblock

### [2026-05-26] CHECKPOINT: real CLAUDE + SKILL landed, BUILD_SPEC audit complete, Research agent unblocked, Five-Anchors AgentResult wired with is_valid() inbox routing, dashboard + matter detail aligned to BUILD_SPEC §7, lib/airtable/ layout migrated, schema bootstrap script ready (PAT regeneration required)

### [2026-05-24] CHECKPOINT: Agent checkpoint & resume protocol (CHECKPOINT.md, runbook, scripts/checkpoint.sh)

### [2026-05-23] FILE_WRITE: Phase 3 Strong Reader (OCR pipeline, intake agents, web UI)

- **Details:** Implemented functional OCR pipeline (pdfplumber/pypdf → pdf2image+Tesseract, optional Textract); categorizer, fact-extraction, and Obsidian sync agents with Five-Anchors base; Postgres `documents`/`extracted_facts` persistence; upload endpoints at `/intake/*` and `/api/cases/{id}/documents/upload`; tier-0 manual approval gate; Presidio health stub in docker-compose; intake upload/batch UI with per-file progress; attorney onboarding `03-document-day.md`.
- **Files Affected:** `services/api/app/services/idi_pipeline.py`, `services/api/app/agents/*`, `services/api/app/routers/cases.py`, `services/api/app/routers/intake.py`, `web/src/app/(app)/intake/**`, `web/src/components/IntakeUploadShared.tsx`, `docker-compose.yml`, `services/api/requirements.txt`, `docs/attorney-onboarding/03-document-day.md`, `.env.example`
- **Reason/Context:** Phase 3 requirement — extract text from scanned PDFs/photocopies, not just digital text layers; functional pipeline, not stubs.

### [2026-05-23] FILE_WRITE: Phases 0–7 implementation pass (Airtable client, agents, D3 map)

- **Details:** Split Airtable client/queries; wired CRUD for tasks/notes/deadlines; PM orchestrator + Redis inbox; Research agent blocks on PENDING SKILL; pattern/strategy agents; D3 knowledge map; auth middleware stub; attorney onboarding 02–03; eImmigration runbook; firm-rules + categorizer training seed.
- **Files Affected:** `web/src/lib/airtable-*.ts`, `web/src/components/*`, `services/api/app/agents/*`, `docs/attorney-onboarding/*`, `brain/03_Firm_Knowledge/*`, `README.md`
- **Reason/Context:** Close gaps across 8-phase build plan; production connectors remain env-gated per LEGAL_BOUNDARIES.md.


- **Details:** Wired dashboard, matters, matter workbench (timeline, case assessment, tasks, notes), Associate Command Panel, intake/knowledge-map/eImmigration pages; FastAPI routers for intake, agents (PM/research/pattern/strategy), eImmigration import; Docker build copies constitution + mounts brain vault.
- **Files Affected:** `web/src/**`, `services/api/app/**`, `docker-compose.yml`, `data/dev-seed.json`, `docs/runbooks/**`, `README.md`
- **Reason/Context:** Complete functional scaffold per 8-phase plan; production connectors (Airtable writes, Presidio, LLM) remain env-gated.

### [2026-05-05 04:06 AM EDT] FILE_WRITE: Completed AssociateOnDemand Phase 0 foundation scaffold

- **Details:** Added FastAPI `/health`, Docker Compose stack, Next.js application shell, constitution pack, LEGAL_BOUNDARIES.md, FILE-MAP.md, README quickstart instructions.
- **Files Affected:** `services/api/**`, `docker-compose.yml`, `.env.example`, `web/src/**`, `docs/constitution/**`, `LEGAL_BOUNDARIES.md`, `activity_log.md`, `FILE-MAP.md`, `README.md`
- **Command Executed:** (Cursor agent authoring + file writes)
- **Reason/Context:** Close Phase 0 gap vs authored plan — establish runnable foundation before Airtable work.
