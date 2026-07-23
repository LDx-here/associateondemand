# AssociateOnDemand — Agent checkpoint

**Last updated:** 2026-07-23 (CDT) — Pass 37 Inbox assignment detail drawer  
**Workspace:** `/Users/ladaj/Developer/AssociateOnDemand`  
**Branch:** `cursor/phase0-foundation`  
**Remote:** `origin` → `git@github.com:LDx-here/associateondemand.git`

**Pass 37 (2026-07-23):** Inbox PM board — clickable assignment cards open a right-side detail drawer (`AssignmentDetailDrawer` + `GET /api/inbox/[itemId]/preview`). Shows deliverable/tier, matter + client links, facts, latest agent draft (or No draft yet → Open Associate), actionable “what’s missing” checklist, and approve/return/status actions. next build; Vercel prod. Commit `e27a4f0`.

**Pass 36 (2026-07-23):** AOS brief builder integrated (no standalone tool) — removed `/tools/aos-brief-builder` HTML page (now redirects to `/templates`) and `AOS_Selection_Menu.html`. New `GET /api/aos/library` + native `AosVariantSelector` (recommended badges, novel-combination alerts, live preview) as step 4 of the AOS fact guide; `/templates` AOS card/preview → "Draft with variants". Picks save to `fields.paragraphSelections` (section_a / section_d_adverse / section_e_balancing), consumed by the existing generator (no backend change; paragraph library kept). next build (staged) green. Runbook: `docs/runbooks/aos-output-library-fill.md`.

**Pass 35 (2026-07-23):** Contacts feature — Airtable `linked_matters` field; `/contacts` list + Add contact modal; contact detail with related matters; matter Overview Contacts panel (Add client contact / Link existing); demo seed contacts; APIs `POST/GET /api/contacts`, `PATCH /api/contacts/[id]` link/unlink. `npm run test:contacts`; next build; Vercel.

**Pass 34 (2026-07-23):** AOS Output Fix (five fixes) — canonical PRESERVE legal standard / AOS mechanism / conclusion (Patel + Arai verbatim); FILL via `aos_paragraph_library.json` builders (default, no API); certificate of service; attorney selection menu at `/tools/aos-brief-builder`; optional LLM via `AOD_AOS_USE_API=1`. pytest 115; next build; Fly + Vercel. Runbook: `docs/runbooks/aos-output-library-fill.md`.

**Pass 33 (2026-07-22):** AOS draft quality — store full Part 8.1 system prompt (`aos_system_prompt.py`); Part 8.2 `build_section_prompt` with all client facts; Anthropic extended thinking (`budget_tokens=8192`); drafting agent primary path = `aos_brief_generator` (`use_api=True`). Env: `AOD_AOS_MODEL`, `AOD_AOS_THINKING_BUDGET`, `AOD_AOS_MAX_TOKENS`. pytest 108. Fly API redeploy.

**Pass 32 (2026-07-22):** Templates preview fix — removed 12k/8k truncation (API text_preview 500k for deliverable templates; Airtable note update 100k; meta fits text with truncate flag); Extracted text tab = Full document + char count + scroll-all; Structure mapping redesigned as vertical brief map (Cover→I–IV→A–E, classification colors, feeds chips). pytest AOS 21; next build. Re-upload DOCX to refresh stored full text.

**Pass 31 (2026-07-22):** Kingdom Counsel AOS brief pipeline live — separate parser (`brief_parser/`) + generator (`aos_brief_generator.py`); PRESERVE/FILL/CAPTION/BOILERPLATE on firm DOCX upload → `briefTemplate` meta; AOS architecture intake (identity → theme/headings → factors); Templates Structure badges; drafting injects System Guide + validator report. pytest 102; next build; Fly + Vercel.

**Pass 30 (2026-07-22):** Legal Elements auto-seed core Firm Knowledge by matter type (no Load button / applied badge); optional elements via dropdown; case-type change merge prompt. Firm Memory moved to `/firm-memory` + Settings (out of Templates). USCIS form autofill noted as future. `test:firm-knowledge`; pytest 81; next build; Vercel prod (web only).

**Next:** Retest AOS variant flow on prod — `/templates` → AOS → "Draft with variants" → pick Section A/adverse/balancing variants on a matter, save facts, dispatch `aos-discretionary-brief`, confirm chosen library prose appears. Spot-check Inbox: click a card → detail drawer shows draft/missing checklist.

**Pass 29 (2026-07-22):** Templates UX journey — architecture explainer moved to `/help#templates`; `/templates` browse by practice area + Cards/List; Open preview lands on Structure mapping (CREAC + feeds-from); Firm Memory collapsed. next build; smoke PASS.

**Pass 28 (2026-07-22):** Template UX honesty — letterhead from Settings → Firm profile (no invented address); structure sections labeled built-in / firm-editable / preserve (not opaque “locked”); service footer → Certificate of service + merge fields; default HTML blank only when no firm DOCX; How templates work (TXDocs/eImmigration) on `/templates`. pytest 81; next build; smoke PASS.

**Pass 27 (2026-07-22):** Matter-type → Firm Knowledge on Legal Elements — load/merge from knowledge map, needed-facts checklist, filtered `/knowledge-map`, Memory vs Knowledge UX, matter badge. `npm run test:firm-knowledge`; pytest 77; next build; Vercel prod (web only).

**Pass 26 (2026-07-22):** DOCX/template Structure tab — CREAC section parser (headings + labels); store `sections` on deliverable template meta; DOCX heading-aware extract + HTML preview; drafting injects TEMPLATE STRUCTURE + preserve Rule + FACTS FOR ANALYSIS; CREAC map on `/templates` preview + AOS fact guide. pytest 77; next build green.

**Pass 25 (2026-07-21):** Topic-aware Firm Knowledge loader — `select_immigration_knowledge_files` scores by case type / deliverable SKU / facts keywords (core boosts for AOS, waiver, asylum, removal, criminal); skips meta files; ~4–6k / max 8. Wired via `format_matter_context` + drafting context. pytest 71; Fly API redeploy.

**Pass 24 (2026-07-21):** Extended existing `/knowledge-map` (Obsidian-style D3) with Firm knowledge tab — committed JSON outlines from `brain/03_Firm_Knowledge`; sync `npm run sync:knowledge-map`; Templates link `#firm-knowledge`. next build green.

**Pass 23b (2026-07-21):** Fix `/templates` replace — auto-create Closed Matter `FIRM-TEMPLATES` on first deliverable template upload (web + Fly API); clearer Airtable permission errors; demo mode provisions without PAT. pytest 66; next build green.

**Pass 23 (2026-07-21):** DOCX text extraction in OCR pipeline (clear errors); `/templates` cards show source, View preview, Replace template (PDF/DOCX), Edit notes; Airtable `deliverable_template:{sku}`; drafting injects firm template excerpt when present. pytest 65; next build green.

**Pass 22 (2026-07-21):** Draft QC checklist in Associate panel; drafting metadata (`firm_memory_applied`, `draft_qc`); linter catches chatbot filler + many placeholders; SKILL QC section; Firm Memory / `brain/.../immigration/*.md` excerpt injection documented + wired; runbooks `draft-quality-control.md` + firm-memory honesty. pytest green; next build green.

**Pass 21 (2026-07-21):** Top nav + site guide (`/help`); sidebar restored in later UX fix. Master Roadmap + Site Reviewer nav checklist updated.

**Pass 20 (2026-07-21):** External partner funnel `/partner/submit` + drafting prompt hardening.

## Dual track

| Track | Location | Stack | Status |
|-------|----------|-------|--------|
| **Production** | `web/` + `services/api/` | Next.js + FastAPI + Airtable + **Supabase Auth** | Live — https://aod-next.vercel.app |
| **Greenfield** | `legal-os/` | React 19 + Express + tRPC 11 + Drizzle + MySQL | Local/dev — Steps 1–18 done (`9e76e7f`); not deployed |

**Pass 18 (2026-07-21):** Closed BUILD_SPEC gap items without attorney action where possible — assignment E2E script (demo mode), full conflict check (Matters + Contacts), stage transitions + Delivered on export, abandoned intake cron + session API, Stripe checklist runbook. `pytest` 43 passed; `next build` green; `smoke-production` + `smoke-assignment-e2e` PASS.

| Gap | Status | Notes |
|-----|--------|-------|
| Live pilot E2E | **Shipped** | `bash scripts/smoke-assignment-e2e.sh` (demo, no login) |
| Stripe checkout live | **Phase 1 external funnel only** | Internal intake does not checkout; webhook routes kept — see [`overflow-counsel-billing-model.md`](docs/runbooks/overflow-counsel-billing-model.md) |
| Abandoned intake email | **Shipped** | `/api/intake/session` + `/api/cron/abandoned-intake`; needs `RESEND_API_KEY` to send |
| Conflict DB (no Clio) | **Shipped** | Matters + Contacts search; match list on intake |
| Stage transitions | **Shipped** | Payment→dispatch, dispatch→review, approve, export→Delivered |
| Delivered / export event | **Shipped** | Export routes + toast; matter stage chip |
| Marketplace / portal | **Deferred** | Phase 3+ lock in Settings + strategy docs |
| $99 self-serve tier | **Deferred** | Bar counsel gate in Settings; no UI promise |

**One-command pilot verify (no login):**
```bash
bash scripts/smoke-assignment-e2e.sh
```

**Pass 17 (2026-07-21):** Ported Legal OS functional wins to production AOD — Firm Memory in drafting prompts, matter stage chip, conflict check on intake, intake step progress + abandoned session recovery. `pytest` 43 passed; `next build` green; smoke pass.

**Stripe on prod:** Checkout code reserved for Phase 1 external partner funnel — internal intake invoices partner firms off-platform. See [`docs/runbooks/overflow-counsel-billing-model.md`](docs/runbooks/overflow-counsel-billing-model.md).

**Legal OS auth decision:** Supabase (not Manus OAuth) — converge with prod AOD; dev uses `ADMIN_API_KEY` until JWT middleware wired.

Legal OS blueprint: [`legal-os/docs/`](legal-os/docs/) · [`.aod-context/technical/legal-os/`](.aod-context/technical/legal-os/)

**Legal OS env requirements:** `DATABASE_URL` (MySQL via `legal-os/docker-compose.yml` port 3307), `ADMIN_API_KEY`, optional `ANTHROPIC_API_KEY`/`OPENAI_API_KEY`, `STRIPE_*`, `CLIO_*` (disabled until `CLIO_ENABLED=true` per LEGAL_BOUNDARIES).

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

### Autonomous pass log — 2026-07-02 (marketplace build pass: intake, review workflow, catalog)

Shipped the three priority surfaces from the autonomous agent runbook end to end
against live Airtable (no demo-mode fallback needed — matches Clio/eImmigration
polish bar):

- **Assignment intake (`/assignments/new`)** — form for deliverable type, tier
  (Template/Custom/Research), facts, optional file upload, priority, due date.
  New matter or link to an existing one. `POST /api/assignments` creates the
  Matter (if new), a Task, a facts Note, and a PM Inbox row in the Submitted
  lane — full validation, inline field errors, and toast on success/failure.
  Linked from the sidebar, the matter workbench header, and every template
  catalog card.
- **Inbox review workflow (`/inbox`)** — new `AssignmentBoard` Kanban with five
  lanes: **Submitted → In progress → Ready for review → Returned / Approved**.
  Actions: Start work, Send for review, Approve (optional sign-off note),
  Return (required revision note), Resume work. Legacy agent-flag escalations
  (Pending/Resolved/Dismissed) keep their existing approve/reject UI in a
  separate "Agent escalations" section below the board — no regression to the
  PM-orchestrator gap-flagging path. `PATCH /api/inbox/[itemId]/status`
  enforces the state machine server-side; illegal transitions are rejected
  with a 409. Assignment metadata (deliverableType/tier/facts/priority/
  dueDate/history) is encoded in the existing PM Inbox `options` JSON column
  — no live schema migration needed. `client.ts` now sends `typecast: true`
  so Airtable auto-adds the new lifecycle values to the `status` single-select
  instead of rejecting the write.
- **Template catalog (`/templates`)** — `lib/deliverable-catalog.ts` is the
  shared source of truth (Cover Letter, AOS Discretionary Brief, Citation
  Package, Research Memo, Mass Audit, Legal Mapping = Template/Research tier;
  Custom Motion/Other = Custom tier). Each card links straight into
  `/assignments/new?deliverable=<id>` with the deliverable + tier prefilled.
- **App-wide toast system** (`components/Toast.tsx`) — mounted once in
  `AppShell`; every new write path (assignment submit, status transitions)
  surfaces success/error instead of failing silently.
- **Demo-mode parity** — `data/dev-seed.json` gained an `inboxItems` array and
  `demo-store-mutable.ts` gained matching create/transition helpers so the
  Kanban board and intake flow are fully exercisable without `AIRTABLE_PAT`.

**Production bug found + fixed during this pass:** `Notes.matter_id` and
`Documents.matter_id` were `multipleRecordLinks` fields pointing at the
legacy `Cases` table instead of `Matters` (pre-existing schema drift, not
caused by this pass). Every note/document write had been failing with
`ROW_TABLE_DOES_NOT_MATCH_LINKED_TABLE` in production — both tables were
100% empty. Fixed live via `scripts/airtable-fix-matter-links.mjs`
(tombstones the broken field to `DEPRECATED_matter_id_wrong_link`, recreates
`matter_id` correctly linked to Matters — same pattern as the existing
`DEPRECATED_client_name` tombstone). Also fixed a second latent bug: the
`FIND(..., ARRAYJOIN({matter_id}))` filter formulas in
`listDocumentsFromAirtable` / `listNotesForMatterFromAirtable` /
`listEventsForMatterFromAirtable` were matching against the Matters record
id, but Airtable formulas render linked fields as the *linked row's primary
field* (the human-readable `matter_id` code) — now matches on `matterId`.
Verified end-to-end against live Airtable: assignment → matter/task/note
creation → Submitted → In progress → Ready for review → Approved, with the
Notes/Documents/Events tabs and Timeline all populating correctly; smoke-test
records deleted from the live base after verification.

Verified: `pytest` (18 passed), `next build` (all 37 routes, including the 3
new pages + 2 new API routes), `npm run test:airtable` (11/11 tables),
`scripts/smoke-production.sh` (baseline pass before deploy).

**Remaining gaps for the next pass:**
- Template catalog is a static config, not read from Airtable — fine for now
- `eslint` is broken repo-wide (`ESLint: 9.39.4` circular-config crash in
  `eslint-config-next` — pre-existing). `next build` TypeScript gate is green.
- Optional: set `ASSIGNMENT_NOTIFY_EMAIL` + `RESEND_API_KEY` on Vercel for email on new assignments

### Autonomous pass log — pass 2 (2026-07-03, coordinator recovery)

Background subagents timed out (PING); shipped in foreground:

- **`assignment-dispatch.ts`** — deliverable-type → PM instruction; sync dispatch to Fly API
- **`notify-assignment.ts`** — matter system note + optional Resend email
- **`POST /api/assignments`** — auto PM dispatch + In progress transition + notify
- **`InboxBadge`** — **N new** (Submitted) + open count badges
- **`AssignmentIntakeForm`** — dispatch-aware success toast

**Deployed 2026-07-03:** commit `503ea7e` pushed to `cursor/phase0-foundation`;
`pytest` (18 passed), `next build` (all routes green), pre- and post-deploy
`scripts/smoke-production.sh` both passed (web auth gate, API health, PM
research dispatch via Anthropic). Fly API redeployed
(`flyctl deploy -a associateondemand-api`, both machines healthy) and Vercel
web redeployed to production (`vercel deploy --prod`, aliased to
https://aod-next.vercel.app).

### Autonomous pass log — pass 3 (2026-07-05, draft quality + review gate)

- **Deliverable-ready detection** — PM orchestrator no longer treats disclosure
  gaps ("Attorney review required") as blocking incomplete work when
  `metadata.full_memo` exists. Drafts/research memos persist to matter Notes
  again instead of spurious agent-escalation inbox cards.
- **Structured case assessment in prompts** — `format_assessment_data()` parses
  the Case Assessment tab JSON into labeled fields (claim type, legal standard,
  overall assessment, immediate actions) for drafting + all SKILL agents.
- **Drafting voice rules** — anti-chatbot filler instructions in drafting
  agent extra_rules; assessment data woven into AOS/discretionary context.
- **Ready for review auto-gate** — assignment intake auto-advances to
  **Ready for review** when PM dispatch returns a reviewable work product;
  intake toast points attorney to the correct inbox lane. Linter failures still
  advance but note "fix before export."
- **Auth runbook** — Auth Logs decision tree committed in
  `docs/runbooks/auth-email-setup.md`.

Verified: `pytest` (22 passed), `next build` green, `scripts/smoke-production.sh` pass.

**Deployed 2026-07-05:** commit `ff25481`; Fly API + Vercel production redeployed;
post-deploy smoke pass.

**Remaining gaps for the next pass:**
- Supabase custom SMTP (Resend) — magic link still attorney-side config
- Optional: `ASSIGNMENT_NOTIFY_EMAIL` + `RESEND_API_KEY` on Vercel
- Template catalog static config; eslint circular-config crash (pre-existing)

### Autonomous pass log — pass 4 (2026-07-05, Phase 0 pricing surfaces)

- **`deliverable-catalog.ts`** — `PHASE0_LAUNCH_SKU_IDS`, `formatPricingRange()`,
  `formatCatalogQuote()`, `isPhase0LaunchSku()` helpers for client-facing quotes.
- **`/templates`** — catalog cards show flat-fee range + turnaround (e.g.
  `$750–$1,500 · 1–2 business days`); launch SKUs badge **Available now**; others
  **Coming soon** (still linkable for internal use).
- **`AssignmentIntakeForm`** — optgroups separate launch SKUs from coming-soon
  catalog entries; selected deliverable shows quote + pricing note; default SKU is
  `aos-discretionary-brief` when no query param.

Verified: `next build` green (all routes).

### Autonomous pass log — closeout (2026-07-05)

Final verification before handoff:

| Gate | Result |
|------|--------|
| `scripts/smoke-production.sh` | PASS (web auth gate, API health, PM research dispatch) |
| `pytest tests/ -q` | 22 passed |
| `npm run build` | PASS (37 routes) |
| `scripts/smoke-docker-e2e.sh` | PASS (compose health, PM dispatch, intake upload) |

**Assignment E2E:** No scripted web assignment→inbox lane test in repo. Unit coverage:
`test_agents.py` (`_agent_deliverable_ready` → Ready for review auto-gate). Full intake →
PM dispatch → Ready for review lane was verified manually against live Airtable in pass 1
(2026-07-02); re-run requires attorney Airtable PAT + Supabase login — **manual verify**
for next pilot, not a code failure.

**Deployed:** pass 3 (`ff25481`, `4b96f8a`), pass 5, **pass 6**, **pass 7**, **pass 8**, **pass 9**, and **pass 10** (2026-07-06) live on Fly + Vercel.

### Autonomous pass log — pass 16 (2026-07-06, Master Roadmap Phase 4 Stripe + payment flow)

- **Stripe SDK** — `stripe` on Next.js (Vercel); checkout + webhook route handlers (no Fly API changes).
- **Pay-before-dispatch** — when `STRIPE_SECRET_KEY` + `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` set on Vercel, intake saves assignment with `payment_status: pending`, redirects to Stripe Checkout; webhook marks paid → PM dispatch. Without keys: invoice-after-delivery fallback (unchanged dispatch).
- **Pricing** — catalog midpoint → cents; 20% sample discount when flagged (`stripe-pricing.ts`).
- **PM Inbox options JSON** — `payment_status`, `stripe_session_id`, `amount_cents`, `deliverableCatalogId` (no Airtable schema migration).
- **UX** — intake checkout total, inbox Pay now + payment badges, dashboard awaiting-payment banner, Settings Stripe status (test/live), Firm Memory saved count KPI + link.
- **Tests** — `npm run test:stripe-pricing`, `test:stripe-webhook`.

Verified: `pytest` (31 passed), `test:stripe-*`, `test:catalog`, `next build`, `scripts/smoke-production.sh` PASS.

**Stripe activation (attorney/IT — set on Vercel, not committed):**

| Variable | Where |
|----------|--------|
| `STRIPE_SECRET_KEY` | Vercel → aod-next → Environment Variables |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Vercel (same) |
| `STRIPE_WEBHOOK_SECRET` | Vercel (same) |

Webhook URL in Stripe Dashboard: `https://aod-next.vercel.app/api/stripe/webhook` — event: `checkout.session.completed`.

Test card: `4242 4242 4242 4242`, any future expiry, any CVC.

**Deployed 2026-07-06:** pass 16 — Vercel prod (web only).

**Deferred (roadmap):**
- Phase 4 client portal (attorney-facing matter status outside RMV inbox)
- Firm Memory depth / style QC (Phase 3)
- Live Stripe E2E on production (requires env vars above)

### Autonomous pass log — pass 15 (2026-07-06, Master Roadmap Phase 2 Intelligent Intake)

- **Interactive onboarding wizard** — multi-step modal on first dashboard visit (`OnboardingWizard`); localStorage state; dismissible/resumable; steps: Welcome → Firm Memory → Assignment → Assessment → Review.
- **Intelligent Intake Engine v3** — chat-style `IntakeGuidancePanel` on `/assignments/new`; deliverable-aware prompts; missing-fact alerts; form + disclaimer remain submit backbone.
- **Strong Reader prefill** — attachment OCR/heuristic extraction → `mergeOcrIntoDraftingFacts`; .txt client-side; PDF via Fly pipeline when existing matter linked + tier 0 approval.
- **Context-aware intake** — `IntakeContextSidebar` when matter linked: case type, saved drafting facts, assessment OCR, Firm Memory hints.
- **Helpers + tests** — `onboarding-state.ts`, `intake-prefill.ts`; `npm run test:onboarding`, `test:intake-prefill`; pytest `test_intake_prefill.py`.

Verified: `pytest` (31 passed), `test:onboarding`, `test:intake-prefill`, `test:facts`, `next build`, `scripts/smoke-production.sh` PASS.

**Deployed 2026-07-06:** pass 15 — Fly API + Vercel prod.

**Deferred (roadmap):**
- Phase 3 — Firm Memory depth / style QC
- Phase 4 — Stripe + client portal
- Full Harvey-style conversational intake (multi-turn LLM chat) — guidance layer shipped; LLM chat deferred
- OCR prefill on new-matter intake before matter exists (PDF) — requires matter link or post-submit upload

### Autonomous pass log — pass 14 (2026-07-06, Master Roadmap Phase 1 UX)

Strategy partner product-completion package integrated; Site Reviewer Agent established; Phase 1 roadmap executed.

- **`.aod-context/`** — Master Implementation Roadmap → `strategy/`; Site Reviewer Instructions → `agent/`; README updated (Deep UX Audit noted pending).
- **Site Reviewer Agent** — `docs/runbooks/site-reviewer-agent.md` + `.cursor/rules/site-reviewer.mdc` (checklist: relief messaging, nav, Firm Memory, no false Stripe, overflow journey).
- **Navigation** — primary: Dashboard, New assignment, Inbox, Matters, Templates; secondary collapsed under “More tools”; Inbox renamed from PM Inbox.
- **Dashboard relief reframe** — Hours saved, Deliverables in review, Open assignments, Firm Memory %; removed overdue KPI/table; calmer amber/green tones; session-aware welcome.
- **Getting Started** — single 4-step card (Firm Memory → Assignment → Assessment → Review).
- **Associate / Command panel** — matter title + deliverable status; case-type suggested prompts; “What would you like RMV to work on?”
- **Messaging** — AppShell tagline “Overflow counsel · capacity relief”; inbox copy overflow-focused.

Verified: `pytest` (30 passed), `next build`, `scripts/smoke-production.sh` PASS.

**Deployed 2026-07-06:** pass 14 — Fly API + Vercel prod.

**Deferred (roadmap):**
- Phase 2 — chat-centric Intelligent Intake + Strong Reader prefill
- Phase 3 — Firm Memory depth / style QC
- Phase 4 — Stripe + client portal
- Deep UX Audit standalone doc (now in `.aod-context/strategy/`)
- Full onboarding wizard (interactive multi-step vs 4-step card)

### Autonomous pass log — pass 11 (2026-07-06, B2B Overflow Counsel pivot)

- **`.aod-context/`** — strategy docs integrated (B2B strategy, Firm Memory, Workflow Fluency, Practice Fact Mapping, Production Cost Pricing); agent rule `.cursor/rules/aod-context.mdc`; `STRATEGY.md` pointer updated.
- **Intelligent Intake v2** — deliverable-aware prompts for `aos-discretionary-brief`, `research-memo`, `hearing-packet`, PI `demand-letter`; `feedsSection` helper text on each field.
- **Firm Memory v1** — `POST /api/firm-memory`, Save to Firm Memory on editable output, Firm Memory badge on `/templates` and intake.
- **Sample discount** — `sampleDiscountEligible` + `discountApplied` on assignment options; intake checkbox + sample upload; catalog metadata (20%).

Verified: `pytest`, `npm run test:facts`, `next build`, `scripts/smoke-production.sh`.

**Deployed 2026-07-06:** pass 11 — Fly API + Vercel prod.

### Autonomous pass log — pass 13 (2026-07-06, UX honesty + Firm Memory onboarding)

User feedback: Stripe promised but not built; Firm Memory badge with no setup path; AOS brief asked asylum facts; unclear overflow counsel journey.

- **AOS discretionary brief intake** — replaced asylum persecution fields with waiver/equities schema (qualifying relative, extreme hardship, INA §212(a) grounds, positive/negative discretionary factors, prior immigration history).
- **Firm Memory setup journey** — `/templates#firm-memory` three-step wizard; actionable CTA on intake when Firm Memory empty.
- **Billing honesty** — `PHASE0_BILLING_NOTE` on launch SKUs, catalog, intake, Settings; no Stripe/checkout in UI.
- **User journey** — `docs/runbooks/overflow-counsel-user-journey.md`; dismissible Getting started banner on dashboard.
- **API** — `GET/POST /api/firm-memory`, `GET/POST /api/firm-samples`.

Verified: `pytest` (30 passed), `test:catalog`, `test:facts`, `test:assessment-docs`, `next build`, `scripts/smoke-production.sh` PASS.

**Deployed 2026-07-06:** pass 13 — Fly API + Vercel prod.

### Autonomous pass log — pass 12 (2026-07-06, assessment-as-document UX)

User feedback: attorneys could not find the **Assessment** tab and expect assessment as a **scanned document**, not a web checklist.

- **Removed Assessment tab** — matter workbench defaults to **Documents**; case assessment is an uploaded scan.
- **Case assessment panel** — Documents tab: **Upload case assessment** (PDF/photo) → OCR → Assessment Document note → agent prompts; chip **Assessment on file — feeds drafts**.
- **Firm assessment templates** — `/templates#firm-assessment-templates`: upload blank form once per practice area (`assessment_template:*` in Documents.category).
- **Optional quick facts** — collapsed **Or fill quick facts below** on Documents tab; assignment intake checklist unchanged.
- **Agent wiring** — `format_assessment_document()` merges uploaded scan OCR + extracted fields into matter context.

Verified: `pytest` (30 passed), `npm run test:assessment-docs`, `next build` (44 routes), `scripts/smoke-production.sh` PASS.

**Pilot E2E (manual):**
1. `/matters/AOD-1001` → **Documents** tab → **Upload case assessment** (any PDF) → green chip.
2. **View extracted facts** → OCR text/fields visible.
3. `/templates` → **Firm assessment templates** → upload Immigration blank form.

**Deployed 2026-07-06:** pass 12 — Fly API + Vercel prod.

### Autonomous pass log — pass 10 (2026-07-06, practice-area workflow fluency)

- **Practice-area fact guides** — Immigration (priority) and Personal Injury checklists with progressive disclosure by case type; generic fallback stays freeform-only.
- **`PracticeAreaFactGuide`** on `/assignments/new` (intake) and matter workbench **Assessment** tab — structured JSON saved to Notes (`type: Facts`).
- **Completeness indicator** — `4/6 key facts captured` bar + amber **Complete facts before drafting →** chip on matter header, Deliverable review panel, and intake validation.
- **Agent wiring** — `format_drafting_facts()` in Fly API merges structured facts into all SKILL agent prompts (alongside Case Assessment); assignment intake merges structured + freeform for PM dispatch.
- **API** — `GET/PUT /api/matters/[matterId]/drafting-facts`.

Verified: `pytest` (28 passed), `npm run test:facts`, `next build` (42 routes incl. drafting-facts), `scripts/smoke-production.sh` PASS.

**Pilot E2E (manual, demo-mode exercisable):**
1. Open `/matters/AOD-1001` → **Assessment** tab → fill Immigration checklist → **Save facts for drafting** → completeness chip turns green.
2. Open `/assignments/new?matterId=AOD-1001&deliverable=aos-discretionary-brief` → guided fields prefilled from saved facts → submit → agent dispatch includes structured block.
3. On matter with incomplete facts, **Deliverable review** shows **Complete facts before drafting (2/5) →** — click jumps to Assessment tab.

**Deployed 2026-07-06:** pass 10 — Fly API + Vercel prod; post-deploy smoke pass.

### Autonomous pass log — pass 9 (2026-07-06, unified command + matter review)

- **Command panel on matter** — gap/escalation and deliverable-ready results show inline review (Resume agent, Provide guidance, Defer, Dismiss; Mark ready for review) instead of orphan "Open agent alert in inbox →" links.
- **Matter page** — new **Agent alerts** panel above Deliverable review; pending flags for the matter resolve inline with same workflow as `/inbox`.
- **Refresh linkage** — Command panel agent runs emit `aod:matter-review-refresh`; matter workbench reloads assignments + alerts without full page reload.
- **Editable output** — after save in Command panel, status-aware **Mark ready for review** when a linked In progress assignment exists.
- **API** — `GET /api/matters/[matterId]/agent-alerts`; PM dispatch returns `inbox_item_id` + `deliverable_ready` in metadata.

Verified: `pytest` (26 passed), `next build` green (41 routes incl. agent-alerts), `scripts/smoke-production.sh` PASS, `scripts/smoke-docker-e2e.sh` PASS.

**Pilot E2E (manual, demo-mode exercisable):**
1. Open `/matters/AOD-1001` in demo — **Agent alerts** shows pending Research alert; resolve inline.
2. Open `/matters/AOD-1003` — **Deliverable review** shows Ready-for-review AOS brief; approve inline.
3. On any matter, run `pm:research …` in Associate panel — inline alert or deliverable-ready banner appears; matter panels refresh.

**Deployed 2026-07-06:** pass 9 — Fly API + Vercel prod; post-deploy smoke pass.

### Autonomous pass log — pass 8 (2026-07-06, matter workbench review drawer)

- **Matter page** — `GET /api/matters/[id]/assignments` + inline **Deliverable review** panel below matter header. Attorney approves or requests revision without leaving the workbench.
- **Review UX** — shows deliverable name, tier, status chip, agent-output preview snippet, Approve deliverable / Request revision (same `/api/inbox/[itemId]/status` as inbox board), optimistic update + toast. Approved assignments show compact green state; **View in inbox →** is secondary only.

Verified: `pytest` (26 passed), `next build` green.

**Deployed 2026-07-06:** pass 8 — Fly API + Vercel prod; post-deploy smoke pass.

### Autonomous pass log — pass 7 (2026-07-06, inbox workflow UX)

- **Agent alerts** — replaced comment-style Approve/Reject/Modify/Defer with workflow actions (Resume agent, Provide guidance, Defer to later, Dismiss alert). Alert cards + collapsible history; success toasts on resolve.
- **Assignment board** — review actions relabeled Approve deliverable / Request revision.
- **Resolve API** — PM dispatch resume on Modify/guidance paths, not only Approve.

Verified: `pytest` (26 passed), `next build` green.

**Deployed 2026-07-06:** pass 7 — Fly API + Vercel prod; post-deploy smoke pass.

### Autonomous pass log — pass 6 (2026-07-05, editable output + skill creation)

- **Editable agent output** — `EditableOutputMemo` on Associate panel full memo + matter Notes tab (type Agent). Saves via `POST /api/matters/[id]/agent-output` or `PATCH /api/matters/[id]/notes/[noteId]` → Airtable Notes. Debounced autosave (2.5s) + toast feedback.
- **Save as skill** — modal after attorney edits; `POST /api/skills` writes Strategy Patterns + Corrections rows (Claude-Skills-style: name, when-to-use, exemplar body). Fly API mirrors: `PATCH /agents/notes/{id}`, `POST /agents/skills`.
- **Command panel** — forwards `metadata.airtable_note_id` as `noteId` so edits target the PM-persisted note.

Verified: `pytest` (26 passed), `next build` (40 routes incl. agent-output, notes PATCH, skills).

**Deployed 2026-07-06:** `flyctl deploy` (repo root) → https://associateondemand-api.fly.dev; `vercel deploy --prod` → https://aod-next.vercel.app; post-deploy `scripts/smoke-production.sh` PASS.

### Autonomous pass log — pass 5 (2026-07-05, strategic lock + day-one SKUs + disclaimer)

**Strategic lock (2026-07-05)** — recorded in [`docs/strategy/README.md`](docs/strategy/README.md):

1. External attorneys/firms may submit; **RMV only verifying attorney** (Phase 0–2).
2. **RMV-verified deliverables only** year one — associate marketplace **Phase 3+**.
3. **Jurisdiction-aware disclaimers** on intake; requesting attorney retains filing/client responsibility.
4. **$99/mo self-serve AI tier** on roadmap — **do not ship** without bar counsel.
5. **Day-one SKUs:** `aos-discretionary-brief`, `custom-motion`, `hearing-packet`, `research-memo` upsell.

**Shipped:** hearing-packet catalog + launch SKUs; intake disclaimer checkbox; strategy docs under `docs/strategy/`; `npm run test:catalog`.

**Verified & deployed:** pytest (22), test:catalog, next build, smoke-production, smoke-docker-e2e — PASS. Vercel prod → https://aod-next.vercel.app.

### Optional / external keys (not code blockers)

- **Midpage / Fastcase** citator APIs — env keys enable live calls
- **Google Drive** document storage — not integrated (BUILD_SPEC stretch)
- **LiteLLM** Presidio scrub proxy — compose uses Presidio sidecars directly
- **Qdrant on Fly** — pattern seed via `POST /agents/pattern/seed`; cloud Qdrant optional

## Product vision — B2B Overflow Counsel (2026 pivot)

**North star:** Verified overflow counsel for solo and small-firm attorneys — they submit assignments with facts and samples; AssociateOnDemand returns **associate-quality work in the firm's style**, not raw AI output. La'Dajia/RMV verifies year one; contract associates Phase 3+.

**Strategic context:** [`.aod-context/README.md`](.aod-context/README.md) · legacy index [`docs/strategy/README.md`](docs/strategy/README.md)

**Differentiators shipped in code:**
- **Intelligent Intake v2** — deliverable-aware fact prompts with section mapping (`practice-area-facts.ts`)
- **Firm Memory v1** — save style edits → Strategy Patterns (`POST /api/firm-memory`)
- **Sample discount** — 20% off when firm uploads prior work at intake (persisted in assignment `options` JSON)

## Product vision — verified associate marketplace (2026, archive)

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
bash scripts/smoke-assignment-e2e.sh
bash scripts/smoke-docker-e2e.sh
bash scripts/stripe-setup-checklist.sh
cd web && npm run test:airtable
cd services/api && python -m pytest tests/ -q
cd web && npm run build
```

## Strategic lock (2026-07-05)

| # | Decision |
|---|----------|
| 1 | Pilot clients: external attorneys/firms submit; **RMV only verifier** until scaled |
| 2 | Year-one: **RMV-verified deliverables** — marketplace **Phase 3+** |
| 3 | Disclaimers: **jurisdiction/practice-area dependent** on intake |
| 4 | $99/mo self-serve AI: roadmap only — **bar counsel gate** |
| 5 | Day-one SKUs: **`aos-discretionary-brief`**, **`custom-motion`**, **`hearing-packet`**, **`research-memo`** |

Full index: [`.aod-context/README.md`](.aod-context/README.md) · [`docs/strategy/README.md`](docs/strategy/README.md) · [`STRATEGY.md`](STRATEGY.md)

---

## Last completed

- **Pass 34 (2026-07-23):** AOS Output Fix — PRESERVE Patel/Arai verbatim; FILL via paragraph library (default no API); certificate of service; `/tools/aos-brief-builder` selection menu; pytest 115; next build; Fly + Vercel. Runbook: `docs/runbooks/aos-output-library-fill.md`.
- **Pass 27 (2026-07-22):** Firm Knowledge → matters intelligence — Legal Elements load/merge from knowledge map by case type; needed-facts Present/Needed; Memory vs Knowledge UX; filtered knowledge-map deep links; matter badge. Verified: `test:firm-knowledge`, pytest 77, next build.
- **Pass 21 (2026-07-21):** UX — removed left sidebar; top header nav + More dropdown; mobile hamburger; `/help` site guide (dashboard + Settings links); full-width main content; Associate panel unchanged. Verified: pytest (53), next build, smoke-production PASS.
- **Pass 20 (2026-07-21):** External partner funnel `/partner/submit`; Stripe checkout on partner path; inbox partner badge; partner link copy on dashboard/settings; drafting prompt hardening (53 pytest). Matter navigation fix + operator UX polish; smoke E2E matter detail 200.
- **Pass 19 (2026-07-21):** Partner-firm billing model — disabled operator-side Stripe Checkout on internal `/assignments/new`; restored submit → dispatch → inbox; partner invoicing copy site-wide; [`overflow-counsel-billing-model.md`](docs/runbooks/overflow-counsel-billing-model.md). Stripe routes kept for external funnel.
- **Document isolation + smart templates (2026-07-21):** Matter-scoped document list post-filter (`matter-link-filter.ts`); firm template/sample rows excluded from matter Documents; matter_id patched on document register; smart template field maps + telephonic request example; TemplateApplyPanel on matter Overview; Firm Memory badge shows configured status; `POST /api/templates/detect-fields`. pytest 51; next build green.
- **LLM fact enrichment (2026-07-21):** Claude enrichment pass maps heuristic OCR facts to legal elements with human labels, element-fit explanations, dedupe; auto-triggers on low-diversity heuristics; `POST /intake/enrich-facts` + Re-analyze with AI UI; grouped ExtractedFactsReview + element counts in CaseAssessmentSummary. Runbook updated. pytest 51; next build green.
- **Matter workbench reorg (2026-07-21):** Close/reopen matter (Airtable status Closed); matters list active-only default + Show closed. Tabs: Overview | Documents | Case activity | Procedural timeline | Legal elements | Tasks. Procedural milestones in Notes (type Procedural); legal elements with practice-area templates + extracted fact mapping; task templates from deliverable catalog. Workflow strip aligned. Runbook: `docs/runbooks/firm-memory-legal-elements.md`. Commit `9299349`; pytest 46; next build; Vercel prod.
- **Fact extraction QC (2026-07-21):** Attorney verify/edit panel for extracted facts on case assessment upload; honest OCR confidence labels; case assessment summary on matter header; case-type extraction hints wired to Strong Reader intake. Runbook: `docs/runbooks/fact-extraction-and-accuracy.md`. Verified: pytest (46), test:assessment-docs, next build, smoke-production PASS.
- **Document upload UX fix (2026-07-21):** Matter Documents tab is primary upload surface (list → upload → assessment). Airtable document query matches linked record id + matter code. View PDF + preview cache wired on intake, assignment attachments, and legacy `/intake/upload` paths; assignment with files redirects to matter Documents tab. PII tier 0 policy moved to Settings admin section. QA screenshots: `docs/qa/*.png`.
- **Pass 18 (2026-07-21):** Gap closure — `smoke-assignment-e2e.sh`, Matters+Contacts conflict check with UI matches, assignment transition helpers + Delivered on export, abandoned intake session API + Vercel cron, `stripe-setup-checklist.sh`, Settings Phase 3+ locks. Verified: pytest (43), test:matter-stage, test:assignment-transitions, next build, smoke-production, smoke-assignment-e2e PASS.
- **Pass 17 (2026-07-21):** Legal OS → production AOD port — drafting prompt assembly (Firm Memory + assessment + structured facts + anti-filler rules), per-deliverable model config, matter stage chip on workbench, lightweight conflict check on intake, intake step progress + localStorage resume banner on dashboard. Verified: pytest (43), test:matter-stage, next build, smoke-production PASS.
- **Legal OS greenfield (2026-07-21):** Full `legal-os/` app — Matter Engine state machine, 10 tRPC routers (matters/leads/conflicts/agents/firmMemory/services/drafting/clio/files/payments), Stripe webhook, abandoned-session cron, /associate landing + intake funnel + admin dashboard, Vitest (22 tests). Production AOD untouched.
- **Document upload UX (2026-07-21):** Documents list moved above upload controls with breadcrumb, status badges, expandable OCR preview, post-upload toast + row highlight; clarifies Airtable storage location (no file-system folder).
- **Upload blocker fix (2026-07-21):** Documents create no longer writes `ocr_status`/`pii_tier`/`file_path` to Airtable (live base lacks those columns — caused 422). Westlaw research paste panel, attorney instructions, workflow strip, and Associate panel "Show your work" shipped on matter workbench.
- **Status verify (2026-07-20):** prod smoke PASS; `pytest` 31 passed; `next build` green; `npm run lint` exit 0 (`718b486`, `ee792c6` fixed circular-config crash; 3 react-hooks diagnostics remain non-blocking).
- **Pass 16 (deployed 2026-07-06):** Master Roadmap Phase 4 — Stripe Checkout + webhook, pay-before-dispatch, billing honesty when configured, dashboard awaiting-payment + Firm Memory count KPI.
- **Pass 15 (deployed 2026-07-06):** Master Roadmap Phase 2 — onboarding wizard, intelligent intake guidance panel, Strong Reader OCR prefill, context-aware intake sidebar.
- **Pass 14 (deployed 2026-07-06):** Master Roadmap Phase 1 — nav streamlining, dashboard relief metrics, context-aware Associate panel, Site Reviewer Agent + strategy docs in `.aod-context/`.
- **Pass 13 (deployed 2026-07-06):** AOS intake schema fix, Firm Memory setup on `/templates#firm-memory`, Phase 0 billing honesty (no Stripe UI), overflow counsel user journey doc + dashboard banner.
- **Pass 12 (deployed 2026-07-06):** assessment-as-document UX — Documents tab upload path, firm templates on `/templates`, OCR feeds agent prompts; Assessment tab removed.
- **Pass 11 (deployed 2026-07-06):** B2B Overflow Counsel pivot — `.aod-context/` integration, intelligent intake v2 (deliverable-aware facts), Firm Memory v1, sample discount on intake.
- **Pass 10 (deployed 2026-07-06):** practice-area guided fact intake — Immigration/PI checklists, completeness indicator, Facts notes → agent prompts, matter workbench + assignment intake integration.
- **Pass 9 (deployed 2026-07-06):** unified Command panel + matter review — inline agent alert actions, deliverable-ready gate, cross-panel refresh without page reload.
- **Pass 8 (deployed 2026-07-06):** matter workbench inline deliverable review — approve/request revision on matter page without visiting `/inbox`.
- **Pass 7 (deployed 2026-07-06):** inbox agent alerts use workflow actions (not Accept/Reject comment UI); assignment board labels polished; resolve API resumes on guidance.
- **Pass 6 (deployed 2026-07-06):** bidirectional agent output editing (Notes tab + Command panel) + Save as skill → Strategy Patterns; Fly + Vercel prod + smoke pass.
- **Pass 5 (deployed):** strategic lock recorded; hearing-packet + motion launch SKUs; jurisdiction-aware intake disclaimer; strategy docs consolidated under `docs/strategy/`; production deploy + smoke pass.
- **Pass 4:** Phase 0 pricing on `/templates` and `/assignments/new`.
- **Pass 3 (deployed):** draft quality, Ready for review auto-gate (`ff25481`, `4b96f8a`).

## Next step

1. **Retest AOS draft (library path)** — fill architecture facts → dispatch `aos-discretionary-brief` → confirm Legal Standard has Matter of Patel + Matter of Arai; Section A is library prose (not `[FILL with matter facts]`); certificate of service present.
2. **Open selection menu** — https://aod-next.vercel.app/tools/aos-brief-builder (optional `?matterId=AOD-XXXX`).
3. **Share site guide with pilot firm** — https://aod-next.vercel.app/help.
4. **Optional LLM FILL** — only if desired: `fly secrets set AOD_AOS_USE_API=1 -a associateondemand-api`.
5. **Optional:** Stripe + Resend env vars — `bash scripts/stripe-setup-checklist.sh`.

## Blockers

All remaining blockers are **attorney-side** (no code work required):

| Blocker | Owner | Notes |
|---------|-------|-------|
| Pilot attorney queue | La'Dajia | Which friendly external solos / RMV overflow matters first |
| Bar counsel for B2B overflow + $99 self-serve tier | La'Dajia | Required before self-serve AI tier ships (Phase 3+ gate) |
| Supabase custom SMTP (Resend) | La'Dajia | Magic link / password reset — **password sign-in works**; see `docs/runbooks/auth-email-setup.md` |
| Assignment notify email on Vercel | La'Dajia | `ASSIGNMENT_NOTIFY_EMAIL` + `RESEND_API_KEY` unset — **in-app inbox works** |
| **Stripe env vars on Vercel** | La'Dajia | Optional for Phase 0 Payment Links; required for Phase 1 external checkout — see [`overflow-counsel-billing-model.md`](docs/runbooks/overflow-counsel-billing-model.md) |
| **Abandoned intake email** | La'Dajia | `RESEND_API_KEY` (+ optional `CRON_SECRET`, `INTAKE_FOLLOWUP_FROM`) — cron ships; emails skip gracefully without key |
| Live Airtable assignment E2E | La'Dajia | Automated demo E2E: `bash scripts/smoke-assignment-e2e.sh`; live pilot still manual with Supabase login |
| Consultation booking link | La'Dajia | `NEXT_PUBLIC_BOOKING_URL` unset — `/book` shows setup prompt |
| Off-platform invoicing | La'Dajia | Stripe Payment Links / LawPay manual — see invoicing runbook |

Non-blocking code debt: 3 `react-hooks/set-state-in-effect` lint diagnostics (OnboardingWizard, CommandPanel); template catalog is static config.

## Commands to resume

```bash
cd /Users/ladaj/Developer/AssociateOnDemand
git pull origin cursor/phase0-foundation
bash scripts/smoke-production.sh
cd services/api && .venv/bin/python -m pytest tests/ -q
cd web && npm run test:catalog && npm run test:facts && npm run test:assessment-docs && npm run test:stripe-pricing && npm run test:stripe-webhook && npm run build
docker compose up -d --build && bash scripts/smoke-docker-e2e.sh
cd web && npm run dev -- -p 3003
```

## Resume here (attorney return)

1. Open https://aod-next.vercel.app/dashboard — relief KPIs + onboarding wizard on first visit (no overdue KPI).
2. Open https://aod-next.vercel.app/templates#firm-memory — complete Firm Memory setup before first pilot assignment.
3. Run one live pilot: `/assignments/new` → `/inbox` → approve → export (Supabase login + Airtable PAT).
4. Optional: https://aod-next.vercel.app/book (after `NEXT_PUBLIC_BOOKING_URL` set); invoice pilot per invoicing runbook.
5. Motion/hearing SKUs: `?deliverable=custom-motion` or `?deliverable=hearing-packet`.

---

## Last completed (archive)

- **Closeout gates (2026-07-05):** smoke-production, pytest (22), next build, smoke-docker-e2e — all PASS (pre-pass-5).

## Quick links

- [README.md](README.md) · [skill → agent map](docs/runbooks/skill-agent-map.md)
- [BUILD_SPEC gap audit](docs/constitution/BUILD_SPEC-GAP-AUDIT.md)
