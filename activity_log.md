### [2026-05-26] CHECKPOINT: checkpoint: Matters spec columns + live-data smoke + UI fixes

### [2026-05-26] CHECKPOINT: Matters spec columns + UI polish + sandbox-blocked Airtable smoke

- **Details:** Wrote idempotent provisioner `scripts/airtable-matters-columns.mjs` for the 9 missing BUILD_SPEC §2 Matters columns (`title`, `country`, `posture`, `court`, `judge`, `next_hearing`, `assessment_data`, `created_at`, `updated_at`) and a `created_at`/`updated_at` backfill pass against the 5 existing rows. Code-side migration completed: `SPEC_FIELDS.matters` extended, `Matter` type expanded with the new fields, `mapMatter` reads them (mirrors `posture` → `proceduralPosture`), `MattersTable` exposes `Title`/`Country`/`Posture` columns + posture filter, and `saveCaseAssessmentInAirtable` / `updateMatterDeadlineInAirtable` bump `updated_at`. UI polish landed: Tasks "Complete" now opens a confirmation modal (Cancel does not PATCH); Calendar gains a friendly empty-state banner; Settings `maskPat` no longer leaks bytes beyond the constant `pat` prefix. Sandbox outbound proxy blocked `api.airtable.com` for every Node-launched call this session (workspace moved mid-turn), so the Meta API POSTs and the `npm run test:airtable` smoke are deferred to a normal dev machine; provisioner is ready-to-run and idempotent. Build green via `cd web && rm -rf .next && npm run build` (14/14 routes).
- **Files Affected:** `scripts/airtable-matters-columns.mjs`, `web/src/lib/airtable/fields.ts`, `web/src/lib/airtable/queries.ts`, `web/src/lib/types.ts`, `web/src/components/MattersTable.tsx`, `web/src/components/GlobalTaskList.tsx`, `web/src/components/CalendarBoard.tsx`, `web/src/app/(app)/settings/page.tsx`, `docs/runbooks/known-page-errors.md`, `CHECKPOINT.md`, `activity_log.md`
- **Command Executed:** `node scripts/airtable-matters-columns.mjs` (sandbox-blocked); `cd web && rm -rf .next && npm run build` (pass).
- **Reason/Context:** Continue BUILD_SPEC §2 compliance from `68d0344` — get the Matters table to feature parity in code so the column migration is a single idempotent script away on any dev machine, and improve the BUILD_SPEC §7.4–7.5 page UX while we're touching the surface.

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
