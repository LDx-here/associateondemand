# AssociateOnDemand — Agent checkpoint

**Last updated:** 2026-07-06 (B2B Overflow Counsel pivot — context integration + intake v2 + Firm Memory v1)
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

### Autonomous pass log — pass 11 (2026-07-06, B2B Overflow Counsel pivot)

- **`.aod-context/`** — strategy docs integrated (B2B strategy, Firm Memory, Workflow Fluency, Practice Fact Mapping, Production Cost Pricing); agent rule `.cursor/rules/aod-context.mdc`; `STRATEGY.md` pointer updated.
- **Intelligent Intake v2** — deliverable-aware prompts for `aos-discretionary-brief`, `research-memo`, `hearing-packet`, PI `demand-letter`; `feedsSection` helper text on each field.
- **Firm Memory v1** — `POST /api/firm-memory`, Save to Firm Memory on editable output, Firm Memory badge on `/templates` and intake.
- **Sample discount** — `sampleDiscountEligible` + `discountApplied` on assignment options; intake checkbox + sample upload; catalog metadata (20%).

Verified: `pytest`, `npm run test:facts`, `next build`, `scripts/smoke-production.sh`.

**Deployed 2026-07-06:** pass 11 — Fly API + Vercel prod.

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
bash scripts/smoke-docker-e2e.sh
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

1. **Manual verify pass 11** — open `/assignments/new?deliverable=aos-discretionary-brief` → confirm deliverable-specific fact prompts with "Feeds: …" helper text; test sample discount checkbox + upload.
2. **Manual verify Firm Memory** — edit agent output on a matter → **Save to Firm Memory** → confirm Strategy Patterns row in Airtable (demo mode shows 503).
3. **Manual verify pass 10** — on `/matters/AOD-1001` fill Immigration fact checklist, save, submit assignment, confirm draft prompt includes structured facts.
4. **Phase 0 B2B overflow launch (ops)** — follow [`docs/runbooks/phase0-b2b-overflow-launch.md`](docs/runbooks/phase0-b2b-overflow-launch.md): first pilot attorney, off-platform quote + conflict check, intake at `/assignments/new?deliverable=aos-discretionary-brief`.

## Blockers

All remaining blockers are **attorney-side** (no code work required):

| Blocker | Owner | Notes |
|---------|-------|-------|
| Pilot attorney queue | La'Dajia | Which friendly external solos / RMV overflow matters first |
| Bar counsel for B2B overflow + $99 self-serve tier | La'Dajia | Required before self-serve AI tier ships (Phase 3+ gate) |
| Supabase custom SMTP (Resend) | La'Dajia | Magic link / password reset — **password sign-in works**; see `docs/runbooks/auth-email-setup.md` |
| Assignment notify email on Vercel | La'Dajia | `ASSIGNMENT_NOTIFY_EMAIL` + `RESEND_API_KEY` unset — **in-app inbox works** |
| Live Airtable assignment E2E | La'Dajia | Manual pilot verify — see Phase 0 runbook step 2–3 |

Pre-existing, non-blocking: eslint circular-config crash; template catalog is static config.

## Commands to resume

```bash
cd /Users/ladaj/Developer/AssociateOnDemand
git pull origin cursor/phase0-foundation
bash scripts/smoke-production.sh
cd services/api && .venv/bin/python -m pytest tests/ -q
cd web && npm run test:catalog && npm run test:facts && npm run build
docker compose up -d --build && bash scripts/smoke-docker-e2e.sh
cd web && npm run dev -- -p 3003
```

## Resume here (attorney return)

1. Open https://aod-next.vercel.app/templates — confirm four **Available now** SKUs with pricing.
2. Open https://aod-next.vercel.app/assignments/new — confirm disclaimer checkbox required before submit.
3. Run one live pilot: intake → inbox → export (requires Supabase login + Airtable PAT).
4. If selling motion/hearing work: use `?deliverable=custom-motion` or `?deliverable=hearing-packet`.

---

## Last completed (archive)

- **Closeout gates (2026-07-05):** smoke-production, pytest (22), next build, smoke-docker-e2e — all PASS (pre-pass-5).

## Quick links

- [README.md](README.md) · [skill → agent map](docs/runbooks/skill-agent-map.md)
- [BUILD_SPEC gap audit](docs/constitution/BUILD_SPEC-GAP-AUDIT.md)
