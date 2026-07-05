# AssociateOnDemand — Agent checkpoint

**Last updated:** 2026-07-05 (pass 3: draft quality + Ready for review gate)
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

## Next step

**Phase 0 B2B overflow launch** — sell first 1–3 paid matters using the existing intake → inbox → export flow with manual off-platform invoicing. Follow [`docs/runbooks/phase0-b2b-overflow-launch.md`](docs/runbooks/phase0-b2b-overflow-launch.md). Launch SKUs: `aos-discretionary-brief` (+ optional `research-memo`). Provisional decisions locked in [`AssociateOnDemand_Implementation_Phasing.md`](AssociateOnDemand_Implementation_Phasing.md) (July 5, 2026 section).

Immediate ops: deploy pass 3 code (Fly + Vercel) if not already live; resolve any **Blocked — needs user** items in phasing doc (pilot attorney queue, bar counsel, multi-state marketing) before scaling beyond pilot clients.

## Blockers

| Blocker | Owner | Notes |
|---------|-------|-------|
| Pilot attorney queue | La'Dajia | Which friendly external solos / RMV overflow matters first |
| Bar counsel for B2B overflow model | La'Dajia | Required before self-serve AI tier; recommended before multi-state scale |
| Primary bar / multi-state disclaimer set | La'Dajia | Provisional default MN; confirm target client states |
| Pass 3 deploy | Agent/dev | Local tests green; production may still be on pass 2 deploy |
| Supabase custom SMTP (Resend) | La'Dajia | Magic link / password reset — see `docs/runbooks/auth-email-setup.md` |

## Quick links

- [README.md](README.md) · [skill → agent map](docs/runbooks/skill-agent-map.md)
- [BUILD_SPEC gap audit](docs/constitution/BUILD_SPEC-GAP-AUDIT.md)
