### [2026-07-28] CHECKPOINT: Pass 55 — live Notes activity/minutes/billable headers; Documents Sheets CRUD + POST register; Fly dual-write scaffold; pytest 124; next build; Vercel + Fly

### [2026-07-28] CHECKPOINT: pass 54 Journal arc — Case story narrative on Case activity tab; note→drafting-facts heuristic extraction in NoteComposer; documents-sheets-migration runbook; pytest 118; test:note-fact-extraction; next build --webpack; Vercel prod

### [2026-07-27] CHECKPOINT: prod SSR fix 89b64eb — calendar routed through data-store listAllEvents; Settings skips Airtable People when Sheets primary; degraded-mode banner for unmigrated tables on Airtable 429

### [2026-07-27] CHECKPOINT: prod SSR fix — skip Airtable reads when DATA_STORE=google_sheets; restore quota fallback; matter detail/inbox/dashboard no longer 500 on Airtable 429

### [2026-07-26] CHECKPOINT: pass 38 real client path + AOS intelligence — paste summary extract (Fly /agents/aos/extract-facts + heuristic fallback), scorecard follow-ups, prior-matter fact templates, Google Sheets skills; pytest 118; test:aos-intelligence

### [2026-07-26] CHECKPOINT: pass 38 Google Sheets data store Phase 1 — DATA_STORE flag, Matters+Notes adapter, Settings link, runbooks; Vercel prod; Airtable fallback kept

### [2026-07-23] CHECKPOINT: pass 37 Inbox assignment detail drawer — clickable board cards → side panel with matter/client, facts, draft preview, missing checklist, status actions; GET /api/inbox/[itemId]/preview; e27a4f0; next build; Vercel prod

### [2026-07-23] CHECKPOINT: pass 36 AOS brief builder integrated into template/drafting flow — removed standalone /tools/aos-brief-builder + AOS_Selection_Menu.html (redirect to /templates); GET /api/aos/library + native AosVariantSelector (alerts, live preview) as fact-guide step 4; /templates "Draft with variants"; picks → fields.paragraphSelections; backend generator unchanged; next build

### [2026-07-23] CHECKPOINT: pass 35 Contacts — list/add/link to matters; Airtable linked_matters; Overview Add client contact; test:contacts; next build; Vercel

### [2026-07-23] CHECKPOINT: pass 34 AOS Output Fix — PRESERVE Patel/Arai verbatim; FILL via paragraph library (no API default); certificate of service; selection menu /tools/aos-brief-builder; pytest 115; next build; Fly + Vercel

### [2026-07-22] CHECKPOINT: pass 33 AOS full Part 8.1/8.2 prompts + extended thinking — aos_system_prompt + section prompts; drafting primary aos_brief_generator; pytest 108; Fly API

### [2026-07-22] CHECKPOINT: pass 32 templates full text + structure map — raise text_preview/Airtable caps; Extracted text Full document scroll; vertical brief Structure map; pytest AOS 21; next build; Fly + Vercel

### [2026-07-22] CHECKPOINT: pass 31 AOS brief PRESERVE/FILL pipeline — brief_parser + aos_brief_generator; firm DOCX → briefTemplate meta; architecture intake; Structure badges; drafting validator; pytest 102; next build; Fly + Vercel

### [2026-07-22] CHECKPOINT: pass 30 auto legal elements + Firm Memory home — core elements auto-seed by matter type; optional dropdown; Firm Memory → /firm-memory + Settings; USCIS autofill future; test:firm-knowledge; pytest 81; next build; Vercel prod

### [2026-07-22] CHECKPOINT: pass 29 templates UX — How-it-works → /help#templates; practice-area browse + Cards/List; Open preview → Structure mapping; Firm Memory collapsed; next build; smoke PASS

### [2026-07-22] CHECKPOINT: pass 28 firm letterhead + document assembly — Settings Firm profile, certificate of service merge fields, unlock labels, default blank honesty, How templates work; pytest 81; next build; smoke PASS

### [2026-07-22] CHECKPOINT: pass 27 Firm Knowledge → matters — Legal Elements load from knowledge map by case type, needed-facts checklist, Memory vs Knowledge UX, filtered knowledge-map; test:firm-knowledge; pytest 77; next build; Vercel prod

### [2026-07-22] CHECKPOINT: pass 26 CREAC template structure — DOCX Structure tab + section parser, meta.sections, drafting Rule preserve + FACTS FOR ANALYSIS; pytest 77; next build; Fly + Vercel prod

### [2026-07-21] CHECKPOINT: pass 25 topic-aware immigration knowledge — select_immigration_knowledge_files by case type/SKU/keywords; core AOS/waiver/asylum sets; pytest 71; Fly API redeploy

### [2026-07-21] CHECKPOINT: pass 24 knowledge map firm outlines — extend /knowledge-map with Firm knowledge tab (brain MD → committed JSON); sync script; Templates link; next build; Vercel prod

### [2026-07-21] CHECKPOINT: pass 23b FIRM-TEMPLATES auto-create — fix Matter not found on /templates replace; Closed administrative matter on first upload; pytest 66; next build; Fly + Vercel prod

### [2026-07-21] CHECKPOINT: pass 23 template catalog + DOCX — OCR DOCX extract, /templates source+preview+replace+tweaks, deliverable_template Airtable role, drafting excerpt inject; pytest 65; next build; Fly + Vercel prod

### [2026-07-21] CHECKPOINT: pass 22 draft QC + immigration knowledge — Associate Draft QC checklist, Firm Memory in matter_context, brain immigration .md excerpts, linter chatbot checks, draft-quality-control runbook; pytest 59; next build; Vercel prod

### [2026-07-21] CHECKPOINT: matter workbench reorg — close matter, tab restructure (Case activity / Procedural timeline / Legal elements), task templates, workflow strip; commit 9299349; pytest 46; next build; Vercel prod

### [2026-07-21] CHECKPOINT: fact extraction QC — attorney verify/edit extracted facts, OCR confidence honesty, case assessment summary on matter header, case-type extraction hints; pytest 46; next build; smoke pass; Fly + Vercel prod

### [2026-07-21] CHECKPOINT: document upload UX — Matter Documents tab primary; Airtable list filter fix; View PDF on all upload paths; PII tier 0 in Settings; pytest 43; next build; Vercel prod

### [2026-07-21] CHECKPOINT: pass 17 — port Legal OS drafting + workflow wins to production AOD (Firm Memory prompts, matter stage chip, conflict check, intake UX); pytest 43; next build; smoke pass; Fly + Vercel prod

### [2026-07-20] CHECKPOINT: pass 16: Stripe checkout, pay-before-dispatch, billing UX finish

### [2026-07-06] CHECKPOINT: pass 16 — Stripe Checkout + webhook, pay-before-dispatch, billing UX (Settings/Inbox/Dashboard), Firm Memory count KPI; Vercel prod; smoke pass

### [2026-07-06] CHECKPOINT: pass 15 — Master Roadmap Phase 2 intelligent intake (onboarding wizard, guidance panel, OCR prefill, context sidebar); Fly + Vercel prod; smoke pass

### [2026-07-06] CHECKPOINT: pass 12 assessment-as-document — Documents tab upload path, firm templates on /templates, OCR feeds agent prompts; Assessment tab removed; Fly + Vercel prod; smoke pass

### [2026-07-06] CHECKPOINT: pass 11 assessment-as-document — Documents tab upload path, firm templates on /templates, OCR feeds agent prompts; Assessment tab removed; Fly + Vercel prod; smoke pass

### [2026-07-06] CHECKPOINT: pass 10 practice-area fact intake — Immigration/PI guided checklists, Facts notes → agent prompts, completeness indicator on matter + intake; Fly + Vercel prod; smoke pass

### [2026-07-06] CHECKPOINT: pass 9 unified command + matter review — inline agent alerts, deliverable-ready gate, cross-panel refresh; Fly + Vercel prod; smoke pass

### [2026-07-06] CHECKPOINT: pass 6 deployed to Fly + Vercel production; smoke-production PASS

### [2026-07-05] CHECKPOINT: pass 6 editable agent output + Save as skill (Strategy Patterns) — Notes tab, Command panel, new API routes

### [2026-07-05] CHECKPOINT: pass 5 strategic lock, day-one SKUs, intake disclaimer, strategy docs, prod deploy

### [2026-07-05] CHECKPOINT: Closeout pass — all gates green (smoke/pytest/build/docker-e2e), pass 4 pricing committed, handoff ready for B2B pilot launch

### [2026-07-05] CHECKPOINT: Draft quality pass — structured case assessment prompts, deliverable-ready PM routing, Ready for review auto-gate on assignment intake

### [2026-06-17] CHECKPOINT: Full project complete — all Phase 4 agents, contacts, charts, tests

### [2026-06-17] CHECKPOINT: Phase 0 foundation base complete — prod live, Anthropic research, smoke scripts

### [2026-05-27] CHECKPOINT: Phase 7 complete + LD deploy checklist

### [2026-05-27] CHECKPOINT: Phase 7 Supabase auth+Postgres + Vercel/Fly deploy scaffold

### [2026-05-27] CHECKPOINT: full plan backlog - notes/task/inbox/docx

### [2026-05-27] CHECKPOINT: Assessment layout, KM drawer matters, full memo in panel

### [2026-05-27] CHECKPOINT: command panel AgentResult UI

### [2026-05-27] CHECKPOINT: fix: smoke-docker-e2e runnable via bash

### [2026-05-27] CHECKPOINT: checkpoint: Docker E2E + PM/Research smoke + gap fixes

### [2026-05-27] CHECKPOINT: checkpoint: matter filters live activity auth docs

### [2026-05-26] CHECKPOINT: checkpoint: overnight milestones 1-6 gap closure

### [2026-05-26] CHECKPOINT: checkpoint: professional firm UI polish

### [2026-05-26] CHECKPOINT: checkpoint: Matters metadata backfill

### [2026-05-26] CHECKPOINT: Matters metadata backfill script (sandbox blocked live PATCH)

- **Details:** Added `scripts/airtable-matters-metadata-backfill.mjs` — idempotent PATCH for empty `title`, `country`, `posture`, `court` (when inferable), bumps `updated_at`. Never writes client PII; backup JSONL used for country hints only. Agent sandbox could not reach `api.airtable.com`; run locally: `node scripts/airtable-matters-metadata-backfill.mjs`.
- **Files Affected:** `scripts/airtable-matters-metadata-backfill.mjs`, `CHECKPOINT.md`, `activity_log.md`
- **Reason/Context:** Populate BUILD_SPEC §2 header fields on 5 live Matters rows after `0c26e1b`.

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

## 2026-07-06 — Pass 7: inbox workflow UX (agent alerts)

- **Details:** Replaced comment-style Approve/Reject on PM Inbox agent escalations with workflow actions (Resume agent, Provide guidance, Defer, Dismiss); assignment board relabeled; resolve API resumes PM on guidance; deployed Fly + Vercel.
- **Files Affected:** `web/src/components/InboxBoard.tsx`, `web/src/lib/inbox-alert-actions.ts`, `web/src/components/AssignmentBoard.tsx`, `web/src/app/(app)/inbox/page.tsx`, `web/src/app/api/inbox/[itemId]/resolve/route.ts`, `CHECKPOINT.md`
- **Command Executed:** `pytest tests/ -q`, `npm run build`, `flyctl deploy`, `vercel deploy --prod`, `scripts/smoke-production.sh`
- **Reason/Context:** Attorney feedback — inbox felt static/incomplete with orphan accept/reject comment UX instead of integrated workflow actions.

## 2026-07-06 — Pass 8: matter workbench review drawer

- **Details:** Inline Deliverable review panel on matter page — fetch assignments per matter, show Ready-for-review (and in-progress/submitted) with agent-output preview, Approve deliverable / Request revision via same inbox status API, optimistic update + toast; approved compact state; secondary View in inbox link.
- **Files Affected:** `web/src/components/MatterAssignmentReview.tsx`, `web/src/app/api/matters/[matterId]/assignments/route.ts`, `web/src/components/MatterWorkbench.tsx`, `web/src/app/(app)/matters/[id]/page.tsx`, `web/src/lib/data-store.ts`, `CHECKPOINT.md`
- **Command Executed:** `pytest tests/ -q`, `npm run build`, `flyctl deploy`, `vercel deploy --prod`, `scripts/smoke-production.sh`
- **Reason/Context:** Pass 7 follow-up — attorney should approve deliverables in matter context without switching to `/inbox` Kanban.

## 2026-07-06 — Pass 11: B2B Overflow Counsel pivot

- **Details:** Integrated `.aod-context/` strategy docs; intelligent intake v2 with deliverable-aware fact prompts; Firm Memory v1 (`POST /api/firm-memory`); sample discount (20%) on assignment intake; deployed Fly + Vercel.
- **Files Affected:** `.aod-context/`, `web/src/lib/practice-area-facts.ts`, `PracticeAreaFactGuide.tsx`, `AssignmentIntakeForm.tsx`, `deliverable-catalog.ts`, `api/firm-memory`, `FirmMemoryBadge.tsx`, `CHECKPOINT.md`, `docs/strategy/README.md`
- **Command Executed:** `pytest tests/ -q`, `npm run test:facts`, `npm run build`, `flyctl deploy`, `vercel deploy --prod`, `scripts/smoke-production.sh`
- **Reason/Context:** Strategic pivot to B2B Overflow Counsel — align product with Firm Memory, Workflow Fluency, and Production Cost Pricing docs.

- **2026-07-06:** Restored CI lint as blocking gate; added /book route, dashboard New assignment CTA, Phase 0 invoicing/booking runbook notes; deployed Vercel prod (964d99c).

- **2026-07-06 (pass 14):** Master Roadmap Phase 1 — integrated strategy docs, Site Reviewer Agent, nav streamlining, dashboard relief KPIs, context-aware Associate panel; deployed Fly + Vercel.
- **Files Affected:** `.aod-context/`, `SidebarNav.tsx`, `dashboard/page.tsx`, `CommandPanel.tsx`, `GettingStartedBanner.tsx`, `KpiCard.tsx`, `dashboard-aggregates.ts`, `AppShell.tsx`, `inbox/page.tsx`, `docs/runbooks/site-reviewer-agent.md`, `.cursor/rules/site-reviewer.mdc`, `CHECKPOINT.md`
- **Command Executed:** `pytest`, `npm run build`, `scripts/smoke-production.sh`, `flyctl deploy`, `vercel deploy --prod`
- **Reason/Context:** Strategy partner product-completion package; execute Master Implementation Roadmap Phase 1 UX directives.
- **Files Affected:** `practice-area-facts.ts`, `deliverable-catalog.ts`, `FirmMemorySetup.tsx`, `FirmMemoryPrompt.tsx`, `GettingStartedBanner.tsx`, `templates/page.tsx`, `settings/page.tsx`, `api/firm-memory`, `api/firm-samples`, `docs/runbooks/overflow-counsel-user-journey.md`, `CHECKPOINT.md`
- **Command Executed:** `pytest`, `npm run test:catalog`, `test:facts`, `test:assessment-docs`, `npm run build`, `scripts/smoke-production.sh`, `flyctl deploy`, `vercel deploy --prod`
- **Reason/Context:** User feedback on Stripe honesty, Firm Memory entry point, AOS fact mapping, and overflow counsel user journey clarity.

## 2026-07-21 — Upload 422 fix + research/workflow UX

- **Action:** Fixed Airtable Documents create 422 (`UNKNOWN_FIELD_NAME: ocr_status`); added Westlaw research paste, attorney instructions, workflow strip, Associate panel show-your-work.
- **Files Affected:** `airtable.py`, `document-create.ts`, `queries.ts`, `matter_context.py`, `MatterWorkbench.tsx`, `ResearchInputPanel.tsx`, `AttorneyInstructionsPanel.tsx`, `MatterWorkflowStrip.tsx`, `AgentResultPanel.tsx`, `command/route.ts`, tests
- **Command Executed:** `pytest` (34 passed), `npm run test:document-create`, `npm run build`, `flyctl deploy`, `vercel deploy --prod`
- **Reason/Context:** User blocked on document upload; requested Westlaw research path, persistent instructions, and visible agent reasoning.

### [2026-07-21] CHECKPOINT: document upload UX — list refresh, preview, storage clarity

- **Action:** Documents list above upload form with breadcrumb, status badges, expandable OCR preview, post-upload toast + row highlight; clarifies Airtable storage (not file-system folder).
- **Files Affected:** `MatterDocumentsList.tsx`, `document-display.ts`, `MatterDocumentUpload.tsx`, `MatterWorkbench.tsx`, `CaseAssessmentPanel.tsx`, `StatusBadge.tsx`
- **Command Executed:** `npm run build`, commit, push, `vercel deploy --prod`
- **Reason/Context:** Upload showed green success but users could not find where files went or preview them.

### [2026-07-21] CHECKPOINT: Pass 18 gap closure — E2E, conflicts, delivered, abandoned intake

- **Action:** Shipped assignment pilot E2E script, full conflict check (Matters+Contacts), Delivered stage on export, abandoned intake session API + cron, Stripe setup checklist; deferred marketplace/$99 tier to Phase 3+ docs.
- **Files Affected:** `scripts/smoke-assignment-e2e.sh`, `scripts/stripe-setup-checklist.sh`, `web/src/lib/conflict-check.ts`, `web/src/lib/assignment-transitions.ts`, `web/src/lib/intake-session-store.ts`, `web/src/app/api/cron/abandoned-intake/`, `web/vercel.json`, `CHECKPOINT.md`
- **Command Executed:** `pytest` (43), `npm run build`, `bash scripts/smoke-production.sh`, `bash scripts/smoke-assignment-e2e.sh`
- **Reason/Context:** Close BUILD_SPEC gaps with minimal attorney involvement; only Stripe/Resend secrets remain user-side.

## 2026-07-21 — Document UX + QA screenshots

- **Action:** Fixed matter document listing (Airtable linked-record filter), clickable matter rows, PII tier copy moved to Settings, View PDF on all upload paths; added `docs/qa/` screenshots; deployed Vercel prod.
- **Files Affected:** `web/src/lib/airtable/queries.ts`, `MattersTable.tsx`, `IntakeUploadShared.tsx`, `PiiTierComplianceSection.tsx`, `docs/qa/*`, `docs/runbooks/local-dev.md`, `CHECKPOINT.md`
- **Command Executed:** `pytest` (43), `npm run build`, `bash scripts/smoke-production.sh`, `vercel deploy --prod`
- **Reason/Context:** User-reported UX issues on matters/documents/intake PII messaging.

### 2026-07-21 — LLM fact enrichment + legal element mapping UX
- **Action:** Added Claude enrichment pass (`fact_enrichment.py`, `POST /intake/enrich-facts`) to map heuristic OCR facts to legal elements with human labels and element-fit explanations; auto-triggers on low-diversity heuristics (e.g. repeated "name"); UI grouped ExtractedFactsReview, Re-analyze with AI button, element counts in CaseAssessmentSummary; runbook updated.
- **Files Affected:** `services/api/app/services/fact_enrichment.py`, `intake_processor.py`, `intake.py`, `web/src/components/ExtractedFactsReview.tsx`, `LegalElementsPanel.tsx`, `CaseAssessmentSummary.tsx`, `docs/runbooks/fact-extraction-and-accuracy.md`
- **Command Executed:** `pytest` (51), `npm run build`, `flyctl deploy`, `vercel deploy --prod`
- **Reason/Context:** User feedback — generic "name, name, name" labels without legal element mapping after assessment upload.

### [2026-07-21] CHECKPOINT: Pass 19 partner-firm billing model — removed operator-side Stripe Checkout on internal intake; submit→dispatch→inbox restored; overflow-counsel-billing-model runbook; pytest 51; next build; smoke-production PASS

### [2026-07-21] CHECKPOINT: Pass 20 matter navigation fix — setState-during-render infinite loop on matter detail (500); dashboard quick actions; matter workflow next-step hint; smoke E2E matter detail 200

### [2026-07-21] CHECKPOINT: Pass 20 partner funnel — `/partner/submit` + `/api/partner/assignments`; Stripe checkout when enabled; inbox partner badge; drafting prompt hardening; pytest 53; next build; smoke-production + smoke-assignment-e2e PASS; Fly + Vercel prod

### [2026-07-21] CHECKPOINT: Pass 21 UX — removed sidebar; top header nav + More dropdown; `/help` site guide; full-width layout; pytest 53; next build; smoke-production PASS; Vercel prod

### [2026-07-21] CHECKPOINT: pass 22 — draft QC checklist + Firm Memory/brain knowledge wiring honesty; linter chatbot/placeholder rules; runbooks; pytest + next build

### [2026-07-22] CHECKPOINT: Pass 33 AOS drafting quality — full Part 8.1 system prompt + extended thinking (8192) + Part 8.2 full client facts; drafting primary path aos_brief_generator; pytest 108; Fly API

### [2026-07-24] CHECKPOINT: AOS prose polish — pronoun caps at sentence start, Section A care-slot dedupe, community-service list punctuation; pytest 115; Fly API

### [2026-07-26] CHECKPOINT: Pass 40 (continuation agent) — Record-decision action closes Filed/Awaiting Decision→Resolution, the one lifecycle transition with no automatic trigger; caught+fixed a race bug (failed calls leaked a stray note) via live testing before shipping; pytest 118; next build; Fly + Vercel

### [2026-07-27] CHECKPOINT: Pass 41 (continuation agent) — migrated Contacts/Legal Elements/Events to Google Sheets (were silently empty; conflict-check-relevant since Contacts feeds that flow); caught a missing-import bug the WASM type-checker reported as an opaque crash; fixed broken local `node_modules/typescript` install along the way; Documents/OCR-pipeline flagged for joint review (cross-service, Python/Fly side); pytest 118; next build; Fly + Vercel

### [2026-07-27] CHECKPOINT: Pass 42 (continuation agent) — Case Assessment migrated to Google Sheets (new assessment_data column on Matters); confirmed the remaining readAirtableLegacy items (Assessment Templates/Firm Samples/Deliverable Templates) are all Documents-table reads and belong with the flagged Documents/OCR-pipeline item, not migrated separately; verified live GET/PATCH round-trip; pytest 118; next build; Fly + Vercel

### [2026-07-27] CHECKPOINT: Pass 43 (continuation agent) — dashboard "Matters by lifecycle stage" widget, giving the caseload-wide stage distribution built up over passes 39-42 actual visibility instead of requiring a per-matter Tasks-tab visit; gated to Sheets/demo; verified live against fresh demo seed; pytest 118; next build; Fly + Vercel

### [2026-07-27] CHECKPOINT: Pass 44 (continuation agent) — task editing (PATCH /api/tasks/[taskId]) across Airtable/Sheets/demo; fixes filing-deadline tasks being permanently invisible to Upcoming Deadlines/Calendar since they're auto-created with dueDate:null; TaskList.tsx now warns + offers inline due-date editor on incomplete filing-deadline tasks missing a date; verified live with isolated request (ruled out a demo-mode file-persistence race from rapid sequential testing as the earlier confusing signal, confirmed no second concurrent instance via ps/git log); pytest 118; next build; Fly + Vercel

### [2026-07-27] CHECKPOINT: Pass 45 (continuation agent) — dashboard warning for filing deadlines missing a date (filingDeadlinesMissingDate), direct follow-on to Pass 44's task-editing fix; small additive change, verified via code review + tsc + build rather than full live test per resource-conservation note; pytest 118; next build; Fly + Vercel

### [2026-07-27] CHECKPOINT: Pass 46 (continuation agent) — filing-deadline tasks now merge into the Calendar page (calendar/page.tsx fetches listAllTasks(), maps into CalendarEntry alongside real Events); fixed a real pre-existing bug found while verifying (createTaskForMatter demo-mode branch never called persistSeed, silently dropping tasks on dev-server module reload — production unaffected, demo-mode only); pytest 118; next build; Fly + Vercel

### [2026-07-27] CHECKPOINT: Pass 47 (continuation agent) — regression tests for lifecycle-stage logic (npm run test:matter-lifecycle-stage): normalizeLifecycleStage, isValidLifecycleTransition, stageTaskTemplates (incl. no-duplicate-id check against the createdFrom idempotency tag), matterLifecycleBreakdown, filingDeadlinesMissingDate; pure test addition, no behavior change; pytest 118; next build; Fly + Vercel

### [2026-07-27] CHECKPOINT: Pass 48 (PI depth pass 1) — Demand Letter fact schema rebuilt to 21-field AOS-level staged depth (identity/incident -> case architecture -> damages/treatment/evidence); PI_BASE gained carrier/claim/lien fields; Demand Letter moved to "Available now" (confirmed flag is UI-only, not a functional gate); deliberately did not author persuasive-argument content (needs LD's real templates, same as AOS did); caught+fixed a real test:catalog failure (missing billing note) before shipping; verified live against both PI and Immigration matter types (no cross-contamination); pytest 118, test:catalog, test:facts; next build; Fly + Vercel. Pilot click-through done first (Dashboard/Matters/workbench/intake/Templates in local demo mode, no prod credentials available) -- found the "fragmented" feeling is mostly RMV-third-party language, and PI/Immigration don't feel separate because PI was genuinely never built out (1 deliverable vs Immigration's 4+paragraph library). LD chose asylum+family-based as next Immigration priority (not cancellation/VAWA).

### [2026-07-27] CHECKPOINT: Pass 49 (Immigration breadth 1, "stronger" half of "stronger then add") — asylum/withholding/CAT (21 fields) and family-based (15 fields) intake now staged at AOS depth, resolvePracticeArea splits them out from the generic immigration bucket via keyword match (cancellation/other untouched, per LD's confirmed scope); found+fixed 5 regressions the new sub-areas would have silently caused (AOS-brief-on-asylum-matter schema override, stage-task-template gating, legal-elements gating, PracticeAreaFactGuide label, and generalizing the staged-UI rendering from AOS-only to any staged schema which also fixes a Pass-48 PI gap); test:facts caught+fixed one real regression in its own fixtures, added permanent AOS-preservation regression guard; verified live against AOD-1001 (General Asylum) — full 21-field staged UI renders correctly; new dedicated priced SKUs (Asylum Brief/Family-Based Brief) deliberately not built, flagged for LD pricing input; pytest 118; test:facts, test:catalog, test:contacts; tsc; next build; Fly + Vercel

### [2026-07-27] CHECKPOINT: Pass 50 (RMV rename pass 1) — internal/operator screens (Dashboard, Inbox, matter workbench, onboarding wizard, New Assignment intake, consent checkbox) no longer frame RMV as a third party the attorney submits work to; the genuinely-external partner funnel (/partner/submit) explicitly left untouched since third-party framing is correct there; intake-disclaimer.ts (shared between internal + partner forms) got an isPartnerSubmission flag so each flow gets accurate consent language instead of one wording breaking the other; verified live in demo mode (Dashboard quick-action, matter workbench "what to do next" strip); grep-confirmed zero remaining internal RMV occurrences in touched files and byte-for-byte unchanged partner files; scoped out Settings billing copy (correctly partner-facing, not a bug) and non-user-facing code comments; second pass could cover Templates/Firm Memory/Settings pages; pytest 118; tsc; test:facts/test:catalog/test:contacts/test:matter-lifecycle-stage; next build; Fly + Vercel

### [2026-07-28] CHECKPOINT: Pass 51 (Journal pass 1) — every note can now be a billable work entry; found by grep that the system had ZERO time/work capture, which is the mechanical cause of LD's unbilled-time problem; new lib/work-entry.ts (8 activity types, tenth-hour increments, roll-ups, unbilled-time detector), Notes gained activity/minutes/billable across type+Sheets schema+API+data-store+demo; friction was the design constraint — picking an activity auto-fills a typical duration so one tap logs a complete entry, and sub-6-minute work rounds UP to 0.1 rather than down to zero; extends the existing NoteComposer (already had task detection) rather than building parallel, per "strengthen what we have"; surfaced as per-note badge, per-matter roll-up, and a dashboard KPI that REPLACED the near-meaningless "Hours saved this month" estimate with real logged billable hours + an unbilled-notes alarm; caught a real bug during live demo verification (leak counter said 2 when only 1 was attorney work — exact-match type filter let the seed's "System Log" note through), fixed with loose machine-note matching + regression tests; Airtable path takes the param and ignores it for signature parity (stays dormant, not deleted); NEEDS LD: add activity/minutes/billable headers to the live Sheets Notes tab; pytest 118, new test:work-entry, test:facts/test:catalog/test:matter-lifecycle-stage; tsc; next build; Vercel

### [2026-07-28] CHECKPOINT: Pass 52 (Intelligence 1) — practice importer. Logged into LD's live session via Claude-in-Chrome and found the real problem: production held "Sample overflow matter" and "nm" while her actual caseload lived in Drive folders, and 7 of 9 dashboard KPIs measure the B2B overflow-marketplace business she does not run (all zeros). Built lib/practice-import.ts (folder-name -> matter number + client, parent folder -> practice area with filename-signal fallback, filename -> document category, file dates -> procedural timeline, quiet-case detection), practice-import-fs.ts (server-side scan), /api/import/practice (GET scan, POST commit that rescans rather than trusting client payload), and /import/practice review screen (pre-selected, deselect-to-exclude). Tests written against REAL observed filenames caught two genuine bugs: regex \b does not cross underscores (Viazovikova_Declaration_DRAFT went unclassified) and top-level client folders have no parent to infer practice area from. Verified on real data: 5 matters recovered — Makhammad (immigration, active today), Augustine (empty), Akyaa (PI, quiet 44d), Hammond (PI, quiet 76d), Konst (DV, quiet 182d). Import is local-only by design (Vercel has no synced Drive); records land in Sheets which production reads. History note states plainly that dates are file timestamps not certified filing dates. Clio research (Manage AI proactive Action Card: suggests time entries from unlogged calls/emails/notes, flags deadline/risk matters) confirms the propose-don't-prompt pattern for next passes. pytest 118; test:practice-import, test:work-entry, test:facts; tsc; next build; Vercel

### [2026-07-28] CHECKPOINT: Pass 53 (Phase 2 Sheets — PM Inbox) — migrated PM Inbox full CRUD to Google Sheets so production /inbox and assignment intake work without Airtable quota; shared lib/pm-inbox-options.ts for options JSON parse/serialize; inboxBackend() in data-store; resolve route through data-store; pytest 118, test:pm-inbox-options/test:google-sheets/test:assignment-transitions; next build; Vercel prod d4e7faf
### [2026-07-28] CHECKPOINT: Fly Documents dual-write secrets set on associateondemand-api (GOOGLE_SHEETS_SPREADSHEET_ID + GOOGLE_SERVICE_ACCOUNT_JSON + AOD_DOCUMENTS_DUAL_WRITE=1 Deployed); ANTHROPIC_API_KEY already present; /health ok; DATA_STORE left unset (dual-write stage only)
### [2026-07-29] CHECKPOINT: Pass 57 (Drive practice scan verified) — 03 Clients Active shared with service account, Drive scan returns 7 matters incl. Immigration/IIA nesting; AOD_PRACTICE_DRIVE_FOLDER_ID set locally + Vercel; fixed data-store-config only detecting inline GOOGLE_SERVICE_ACCOUNT_JSON (GOOGLE_APPLICATION_CREDENTIALS path fell back to demo mode, imports would not persist); imported 2026-006 as AOD-1003 in Sheets; test:practice-import + next build --webpack
### [2026-07-29] CHECKPOINT: imported all 7 practice matters to Sheets (AOD-1003..AOD-1009); repaired truncated local next install (missing swc-darwin-arm64 .node + app-page-turbo.runtime.dev.js) so npm run dev works without --webpack
### [2026-07-29] CHECKPOINT: Anthropic credits check — ANTHROPIC_API_KEY present/Deployed on Fly but live smoke llm=template; Fly logs 401 invalid x-api-key (not billing); rotate Fly secret; AOD_AOS_USE_API left unset

### [2026-08-07] CHECKPOINT: Pass 57 (Journal 2, task #23) — case story panel renders the matter as prose above the workbench; sentences omitted when data is absent rather than showing em-dash placeholders; machine-note distinction carried through so imported-but-untouched matters read "You have not logged any work on it yet"; caught and fixed a date-only UTC-parsing bug that displayed a filing deadline one day early; verified on production against Viazovikova (AOD-1008); found but did not fix a discrepancy where the import summary claims 40 documents while the Documents tab shows 0 — importer counts Drive files but creates no Document rows; 136 pytest, 7 web suites, next build, Vercel

### [2026-08-27] CHECKPOINT: Pass 58 (scheduled autonomous pass) — assignment intake -> inbox -> template catalog re-verified end to end (flow already existed since 2026-07-02); fixed 4 CI-blocking regressions found via clean-install verification: services/api/requirements-dev.txt (CI pytest job had no pytest module since before 2026-07-27), 13 react-hooks/set-state-in-effect lint errors across 11 components (3 real fixes -- useMemo for derived state, render-time state reset instead of effect, ref mutation moved into an effect -- + 10 scoped eslint-disable with rationale for legitimate sync/hydration patterns), a stale verify-assessment-documents.mjs assertion (entry_date raw key vs humanized "entry date" label), and a smoke-assignment-e2e.sh hang for piped callers (orphaned next-server escaping the cleanup trap; fixed with process-group kill + port fallback). Flagged the real underlying problem: 9 open unmerged PRs (#2-#10) against cursor/phase0-foundation from repeated firings of this same cron with nobody merging; did not merge any per standing instruction, re-applied fixes on a fresh branch instead; recommends a human merge one and close the rest. New finding: Fly Postgres (reported degraded 3+ days ago in unmerged PR #9/#10) is back up. pytest 136; lint 0 errors; tsc clean; next build (88 routes); smoke-assignment-e2e PASS (incl. piped-through-tail, no hang/orphan); smoke-production PASS. No Fly/Vercel deploy CLI in this sandbox -- could not deploy.
### [2026-08-31] CHECKPOINT: Pass 61 (scheduled autonomous pass) -- assignment intake -> inbox -> template catalog re-verified green a fourth time (flow unchanged since 2026-07-02); fast-forward merged Pass 58s PR #11 (cursor/assignment-intake-workflow-db04) instead of re-diagnosing the same CI bugs; pytest 136, lint 0 errors, tsc clean, next build (88 routes), all 24 test:* scripts green, smoke-assignment-e2e PASS x2 (no hang), smoke-production PASS live (confirmed this sandbox has outbound internet access -- ran it directly against aod-next.vercel.app + associateondemand-api.fly.dev, not just reasoned about it); Fly Postgres confirmed still healthy 4 days after Pass 58 flagged its recovery. 10 unmerged PRs (#2-#11) now block phase0-foundation and, transitively, every Vercel/Fly deploy since their Git integrations watch that branch; still no flyctl/vercel CLI or credentials in this sandbox. No merge/close attempted per standing instruction (read-only gh access, explicit user direction required).
### [2026-09-03] CHECKPOINT: Pass 62 (scheduled autonomous pass) -- assignment intake -> inbox -> template catalog re-verified green a fifth time (flow unchanged since 2026-07-02); fast-forward merged Pass 61's PR #12 (cursor/assignment-intake-workflow-c089) instead of re-diagnosing the same CI bugs; pytest 136, lint 0 errors, tsc clean, next build (88 routes), all 25 test:* scripts green, smoke-assignment-e2e PASS x2 (no hang), smoke-production PASS live (postgres/redis/presidio all healthy, Qdrant still unreachable non-blocking, Anthropic still 401 on Fly -- pre-existing, tracked separately). Confirmed the deploy blocker is structural, not just missing credentials: this automation's only sanctioned delivery mechanism (open_git_pr) never pushes to cursor/phase0-foundation directly -- that branch is what Vercel/Fly's Git integrations actually watch, and a PR against it needs a human merge every single run regardless of what gets fixed. 11 unmerged PRs (#2-#12) now block phase0-foundation and deploy; did not merge any (git push --dry-run confirmed this agent's token *could* push directly to phase0-foundation, but doing so would bypass PR review and trigger an unreviewed production deploy, which is outside this automation's sanctioned scope -- flagging instead of acting unilaterally). Recommends a human merge PR #12 and close #2-#11 without merging.
