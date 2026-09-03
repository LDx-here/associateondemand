# AssociateOnDemand — Agent checkpoint

**Last updated:** 2026-09-03 (UTC) — Pass 62: assignment intake → inbox → catalog re-verified green a fifth time; 11 unmerged PRs now blocking (#2–#12); deploy confirmed blocked structurally, not by missing credentials

**Pass 62 (2026-09-03, scheduled autonomous pass, cloud sandbox — branch `cursor/agent-assignment-intake-6c7b`):** Same cron task as Pass 58/59/60/61 (`ship assignment intake → inbox workflow → template catalog; pytest + build + smoke; commit/push/deploy when green`), fired against the exact same stale `cursor/phase0-foundation` tip (`ad73f78`) because Pass 61's own PR ([#12](https://github.com/LDx-here/associateondemand/pull/12)) — itself a superset of #11, #10, #9, … — is still open, unmerged, three days later. Fast-forward merged PR #12's branch (`cursor/assignment-intake-workflow-c089`) directly into this one — clean, no conflicts, 6 commits — to inherit every prior pass's verified fixes, then re-ran every gate from a genuinely clean install (fresh `pip install --break-system-packages`, `python3.12-venv` unavailable in this sandbox too, so no venv; fresh `npm install`):

- `pytest services/api/tests -q` → **136 passed**, identical to Pass 61.
- `npm run lint` → **0 errors** (same 20 pre-existing warnings) → `npx tsc --noEmit` **clean** → `npm run build` **clean**, all 88 routes.
- All 25 `npm run test:*` verify scripts (catalog, facts, assessment-docs, document-create, matter-link-filter, template-field-maps, onboarding, matter-stage, assignment-transitions, intake-prefill, stripe-pricing, stripe-webhook, firm-knowledge, contacts, google-sheets, aos-intelligence, matter-lifecycle-stage, work-entry, pm-inbox-options, note-fact-extraction, practice-import, practice-pulse, case-state, case-story, work-detection; `test:airtable` skipped — no `AIRTABLE_PAT` in this sandbox, expected) — **all green**.
- `bash scripts/smoke-assignment-e2e.sh` — **PASS** end to end in demo mode, run twice (once piped through `tail`) in ~15s each, no hang, no orphaned `next-server`, port free after — Pass 58's process-group fix still holds.
- `bash scripts/smoke-production.sh` — **PASS live** (this sandbox has outbound internet, same as Pass 61): web auth gate `307` → `/login`, API liveness ok, `/health/deps` reports `{"postgres":true,"redis":true,"presidio":true}` (Qdrant still unreachable, non-blocking), PM research dispatch responds (`llm: template` — the pre-existing, separately-tracked Anthropic 401 on Fly from Pass 57's checkpoint, unchanged, not new).

**Confirmed structurally, not just repeated: this cron cannot reach production from inside its own sandbox, independent of deploy credentials.** No `flyctl`/`vercel` CLI, no `FLY_API_TOKEN`/`VERCEL_TOKEN` (checked explicitly again). No GitHub Actions deploy-on-push workflow exists (`ci.yml` = pytest/lint/build only; `scheduled-health.yml` = read-only prod curl). Vercel/Fly's own Git integrations are the only deploy path, and they watch `cursor/phase0-foundation` — a branch this automation's sanctioned delivery mechanism (`open_git_pr`) never pushes to directly (by design — PRs against it need human review/merge). **This means "commit/push/deploy when green" cannot fully complete from this automation without one extra human action, every single time, regardless of what any individual pass fixes.** That action — merge one PR into `phase0-foundation` — is also the one thing this agent is explicitly instructed not to do on the attorney's behalf.

**The backlog is now 11 open, unmerged draft PRs** (`#2`–`#12`, all from this same Mon/Thu cron since 2026-07-02). This pass did not open a 12th rediscovery — it re-verified #12's exact fix set holds and is adding only this checkpoint/log update on top, so the next scheduled run (or a human) can fast-forward from here with zero new diagnosis needed. **Recommendation, unchanged for a fifth consecutive run and now more urgent: someone with GitHub write access should merge PR #12 (https://github.com/LDx-here/associateondemand/pull/12) — or this pass's PR, whichever is newer — into `cursor/phase0-foundation`, close #2–#11 without merging, and then run `flyctl deploy -a associateondemand-api` + `vercel deploy --prod` (or just let the Git integrations pick it up).** Until that happens, every future scheduled run will keep reporting the identical green state without it ever reaching `aod-next.vercel.app`.

**No new application behavior shipped this pass** — same conclusion as Pass 58–61: assignment intake, the inbox review workflow, and the template catalog have been complete and verified since 2026-07-02. This pass is pure CI/regression re-verification plus this checkpoint entry.

pytest 136; lint 0 errors; tsc clean; next build (88 routes); all 25 test:* scripts green; smoke-assignment-e2e PASS x2 (no hang); smoke-production PASS (live). No deploy from this sandbox — needs merge + Fly/Vercel access.

**Pass 61 (2026-08-31, scheduled autonomous pass, cloud sandbox — branch `cursor/assignment-intake-workflow-c089`):** Same cron task as Pass 58/59/60 (`ship assignment intake → inbox workflow → template catalog; pytest + build + smoke; commit/push/deploy when green`), fired against the exact same stale `cursor/phase0-foundation` tip (`ad73f78`) because Pass 58's own PR ([#11](https://github.com/LDx-here/associateondemand/pull/11)) is still open, unmerged, four days later. Rather than re-diagnose the same three CI bugs an eleventh time, fast-forward merged PR #11's branch (`cursor/assignment-intake-workflow-db04`) directly into this one — clean, no conflicts — to inherit the verified fixes, then re-ran every gate from a clean install to confirm they still hold:

- `pip3 install --break-system-packages -r requirements.txt -r requirements-dev.txt` (no `venv` module in this sandbox, same as every prior cloud-sandbox run) → **136 pytest passed**.
- `npm ci` → `npm run lint` **0 errors** (20 pre-existing warnings, unchanged) → `npx tsc --noEmit` **clean** → `npm run build` **clean**, all 88 routes.
- All 24 `npm run test:*` verify scripts (catalog, facts, assessment-docs, document-create, matter-link-filter, template-field-maps, onboarding, matter-stage, assignment-transitions, intake-prefill, stripe-pricing, stripe-webhook, firm-knowledge, contacts, aos-intelligence, matter-lifecycle-stage, work-entry, pm-inbox-options, note-fact-extraction, practice-import, practice-pulse, case-state, case-story, work-detection; `google-sheets`/`airtable` skipped — need live creds) — **all green**.
- `bash scripts/smoke-assignment-e2e.sh` — **PASS** end to end in demo mode: intake session autosave → `POST /api/assignments` creates matter/task/note/inbox row → In progress → Ready for review → Approved → Delivered → export fallback. Ran twice, once piped through `tail`, in ~19s each with no hang and no orphaned `next-server` — Pass 58's process-group fix still holds.
- `bash scripts/smoke-production.sh` — **this sandbox has outbound internet access** (unlike prior passes' assumption) — ran it directly against the live URLs, not just reasoned about it: web auth gate PASS (`307` → `/login`), API liveness PASS, `https://associateondemand-api.fly.dev/health/deps` reports `{"postgres":true,"redis":true,"presidio":true}` (Qdrant still unreachable, non-blocking) confirming Pass 58's "Postgres is back up" finding still holds four days later, PM research dispatch responds (`llm: template`, 2099-char memo — Anthropic key issue is the pre-existing, separately-tracked 401 from Pass 57's checkpoint, not new).

**Still could not deploy** — no `flyctl`/`vercel` CLI and no `FLY_API_TOKEN`/`VERCEL_TOKEN` in this sandbox's environment (checked explicitly this pass, not just assumed). No GitHub Actions deploy-on-push workflow exists either (`ci.yml` only runs pytest/lint/build; `scheduled-health.yml` only curls prod) — Vercel/Fly deploys happen via their own Git integration watching a connected branch, which a PR branch that never merges will never trigger. **This is now structurally the same blocker as the merge backlog below** — until someone merges into `phase0-foundation` (the branch the deploy integrations actually watch), nothing this automation ships reaches production, deploy credentials or not.

**The branch-backlog problem is one PR worse: `cursor/phase0-foundation` now has 10 open, unmerged draft PRs** (`#2`–`#11`, all from this same Mon/Thu cron, all independently re-diagnosing or re-merging the identical pytest/lint/stale-test/smoke-hang fixes). This pass's branch is a strict superset of #11 (itself a superset of #9/#10, which superseded #4/#6/#7/#8) plus a second independent re-verification — so **merging this pass's PR and closing #2–#11 without merging** remains the single highest-leverage action available, now for the fourth consecutive scheduled run. Per the standing instruction not to merge PRs without explicit user direction, and with only read-only `gh` access, this agent cannot merge or close PRs itself — flagging again rather than guessing.

**No new application behavior shipped this pass** (same conclusion as Pass 58/59/60: the three flows in the task — assignment intake, inbox review workflow, template catalog — have been complete and verified since 2026-07-02; this pass is CI/regression verification only, zero runtime code changes beyond what Pass 58 already merged in).

pytest 136; lint 0 errors; tsc clean; next build (88 routes); smoke-assignment-e2e PASS (x2, no hang); smoke-production PASS (live, incl. `/health/deps`). No deploy from this sandbox — needs merge + Fly/Vercel access.

**Pass 58 (2026-08-27, scheduled autonomous pass):** Task: ship assignment intake → inbox workflow → template catalog, pytest + build + smoke green, deploy when green. Those three flows already exist (built across many earlier passes, since 2026-07-02) — this pass verified them end to end and fixed every regression found blocking a green build/CI, rather than adding new surface area.

**The real finding: 9 open, unmerged PRs (`#2`–`#10`) against `cursor/phase0-foundation`.** Every prior firing of this Mon/Thu cron opened a fresh PR from the same stale base and none were merged, so each run re-diagnosed the same handful of CI bugs from scratch. Read PR #9's and #10's descriptions (both unmerged, both claim to fix the same three bugs) before starting this pass specifically to avoid a ninth rediscovery. Per the standing instruction not to merge PRs on this attorney's behalf, did not merge any of them — re-applied the fixes directly on a fresh branch from `phase0-foundation` instead, so this pass's own PR is self-contained and mergeable independent of the backlog. **Recommend La'Dajia (or whoever has repo-write access) merge the most complete of the open PRs — currently #10 — and close #2–#9 without merging**, so the next scheduled run finally starts from a green base instead of a tenth rediscovery.

Confirmed and fixed, this session, from a clean install (fresh venv + `npm install`, no cached state from prior passes):
1. **CI's `pytest` job has been failing since before 2026-07-27** — `services/api/requirements.txt` never listed `pytest`, so a clean CI runner hits `No module named pytest` before any test runs (local runs looked fine because a dev machine's venv already had it installed). Added `services/api/requirements-dev.txt` (`-r requirements.txt` + `pytest==8.3.4`); CI's `api` job now installs that. Docker/production image untouched (still `requirements.txt` only).
2. **CI's `web` lint job has been failing since the Next 16 / React Compiler upgrade** — `eslint-config-next` promotes `react-hooks/set-state-in-effect` (+ one refs-during-render) to errors; 13 violations across 11 components. Fixed the 3 that were real antipatterns: `TemplateFieldForm`'s `sectionPreviews` was state mirrored from an effect for a value that's actually a pure function of `map`/`spec`/`values` — converted to `useMemo`. `TemplateApplyPanel`'s `values` mirrored `defaultValues` via effect on every template/profile change — converted to the React-docs "adjust state during render" pattern (compare `sourceKey` to a `prevSourceKey` state, reset synchronously in the render body instead of after commit). `LegalElementsPanel` mutated a ref during render (`elementsRef.current = elements`) so a later effect could read the latest `elements` without depending on it — moved the mutation into its own `useEffect`. The other 10 were legitimate synchronization-with-props/one-time-hydration patterns (fetch-on-mount, reset-on-prop-change, restore-from-URL/localStorage-on-mount) — gave each a scoped `eslint-disable-next-line react-hooks/set-state-in-effect` with a one-line rationale rather than forcing an unnatural refactor onto working code.
3. **A stale test assertion** in `verify-assessment-documents.mjs` expected the raw `entry_date` fact-type key in rendered agent-context text; the code has rendered the humanized label (`"entry date"`) since the LLM fact-enrichment pass — fixed the assertion to match the real (correct) output, with a `doesNotMatch` regression guard so it can't silently drift back.
4. **`scripts/smoke-assignment-e2e.sh` could hang** for any caller that pipes its output (e.g. `| tail`) — reproduced live: the backgrounded `next-server` can be reparented past the `trap cleanup EXIT` and keeps a caller's inherited stdout/stderr pipe open even after this script's own logic finished and exited 0. Fixed with `set -m` (background job gets its own process group) + `kill -- "-$SERVER_PID"` to kill the whole group on cleanup, a port-based `lsof` fallback for anything that still escaped, and the server's own output redirected to a temp file instead of staying attached to the script's stdout. Verified: ran the script twice, once piped through `tail`, both completed in ~15s with no orphaned `next-server` process and the port free afterward.

**New finding, not a regression from this pass:** the Fly API's Postgres dependency, reported `degraded`/`false` by the last two unmerged PRs (checked as recently as 4 days before this run), is back up — `curl https://associateondemand-api.fly.dev/health/deps` now reports `"postgres":true,"redis":true"` (Qdrant still unreachable, non-blocking — pattern search only). Recording this so nobody chases a stale alarm; if it recurs, Fly access is needed to diagnose (not available from this sandbox).

**Could not do from this sandbox:** no `flyctl`/`vercel` CLI or deploy credentials — could not run `flyctl deploy` or `vercel deploy --prod`. No application runtime behavior changed in this pass beyond the three real lint fixes above (verified functionally equivalent — build output and the full smoke lifecycle are unchanged), so production is not at risk from these commits sitting undeployed; a human with Fly/Vercel access should deploy once this PR is merged.

**Verification (clean install, this session):**
- `pytest services/api/tests -q` → **136 passed**
- `npm run lint` → **0 errors** (20 pre-existing warnings, unchanged)
- `npx tsc --noEmit` → clean
- `npm run build` → clean, all routes (88 routes)
- All 26 `npm run test:*` verify scripts → **green**, except `test:airtable` which fails on `Missing AIRTABLE_PAT` — expected in a sandbox with no Airtable credentials, not a regression (production is on Google Sheets as primary store; Airtable path is dormant per the standing do-not-delete direction)
- `bash scripts/smoke-assignment-e2e.sh` → **PASS**, twice (once piped through `tail` to confirm the hang fix), demo mode, full lifecycle: intake session autosave → assignment creates matter/task/note/inbox row → In progress → Ready for review → Approved → Delivered → memo export fallback; no orphaned process, port free after both runs
- `bash scripts/smoke-production.sh` → **PASS** — web auth gate redirects to login, API liveness + deps both `ok` (`postgres: true`, `redis: true`), PM research dispatch responds (`llm: template` — Anthropic key still 401 on Fly, a pre-existing blocker, not new)
- Manually curled `/templates`, `/assignments/new`, `/inbox`, `/matters`, `/dashboard` against a local demo server — all **200**

**Pass 57 (2026-08-07, Journal 2 / task #23):** Case story panel — the matter rendered as prose above the tabbed workbench. `lib/case-story.ts` composes sentences in the order the attorney actually asks when reopening a file: where it stands, when she last worked it, what is coming, what she has put in, who else is on it. Sentences are omitted when data is absent rather than printing "Next deadline: —", which is what made the old view unreadable. Carries the machine-note distinction through, so an imported-but-untouched matter reads "You have not logged any work on it yet."

**Bug caught while testing, worth remembering:** a date-only deadline ("2026-08-14") parses as UTC midnight and rendered as "August 13" in any timezone behind UTC — a filing deadline shown a day early. Date-only values are now constructed as local dates. Worth grepping for elsewhere; `formatDate` helpers in other files may have the same shape.

Verified on production against AOD-1008 (Viazovikova): reads "This matter is awaiting scheduling. You have not logged any work on it yet. Nothing is scheduled on it."

**Open discrepancy found on that page, not yet fixed:** the imported summary says "40 documents on file" while the Overview tab shows "Documents on file: 0". The importer counted files in the Drive folder but never created Document rows, so her documents are described but not actually in the system. Next pass should reconcile — either create Document records on import or stop claiming a count the app cannot show.

136 pytest; 7 web suites (case-story, practice-pulse, case-state, work-entry, practice-import, facts, catalog); next build; Vercel.

**Previously:** 2026-07-29 (CDT) — Anthropic key on Fly returns 401
**Workspace:** `/Users/ladaj/Developer/AssociateOnDemand`  
**Branch:** `cursor/phase0-foundation`  
**Remote:** `origin` → `git@github.com:LDx-here/associateondemand.git`

**Anthropic credits check (2026-07-29):** `ANTHROPIC_API_KEY` is present/Deployed on `associateondemand-api`, but live PM research smoke still returns `llm: template`. Fly logs: Anthropic **401 invalid x-api-key** (not a credit/billing error). Credits alone do not unblock — rotate/replace the Fly secret with a valid key (`fly secrets set ANTHROPIC_API_KEY=… -a associateondemand-api`). `AOD_AOS_USE_API` intentionally unset (library FILL default; smart paste extract needs only a valid Anthropic key).


**Pass 57 (2026-07-29, Drive scan verified end to end):** `03 Clients Active` (folder `1KWQBvPgup47BFhp4KRCdg30Vi9Gn3_FW`) shared with the service account, so the Drive scan returns **7 matters** — including `Immigration/IIA/` clients (Limbu 2026-004, Viazovikova 2026-001) the local filesystem walk missed. `AOD_PRACTICE_DRIVE_FOLDER_ID` set locally and on Vercel (Production/Development/Preview).

Runtime logs exposed a second, separate defect: **`data-store-config.ts` only recognized inline `GOOGLE_SERVICE_ACCOUNT_JSON`**, so a machine authenticating with `GOOGLE_APPLICATION_CREDENTIALS` (a file path — the local setup) reported `dataStore: "demo"` while Sheets calls actually worked. Imports would have silently gone nowhere. Store detection now reuses `google-auth.ts`'s loader, which accepts both forms. Verified: `demoMode: false`, and importing 2026-006 created `AOD-1003` in Sheets.

All 7 practice matters are now in Sheets: AOD-1003 Makhammad (Immigration), AOD-1004 Augustine (Other — folder is empty, so nothing to infer from), AOD-1005 Sarmila Limbu (Immigration), AOD-1006 Tina Akyaa (PI), AOD-1007 Jeremiah Hammond (PI), AOD-1008 Aigul Viazovikova (Immigration), AOD-1009 John Konst (Property Damage — Diminished Value).

**Local `next` install was partially truncated** — `@next/swc-darwin-arm64/next-swc.darwin-arm64.node` and `next/dist/compiled/next-server/app-page-turbo.runtime.dev.js` were missing while their sourcemaps remained, so Turbopack refused to start and API routes 500'd under it. Reinstalling both packages fixed it; `npm run dev` no longer needs `--webpack`. Watch for this recurring — it looks like an interrupted install.

**Next step:** confirm the imported matters read well on production `/matters` (case types, Import notes), and decide whether Augustine should stay as an empty matter.

**Pass 56 (2026-07-28, practice import → Drive API):** `/import/practice` on Vercel no longer depends on a Mac Google Drive sync path. Scan order: Drive API when `AOD_PRACTICE_DRIVE_FOLDER_ID` (or `GOOGLE_DRIVE_CLIENTS_FOLDER_ID`) + SA credentials are set; else local filesystem. Shared `google-auth.ts` JWT with Sheets + Drive readonly scopes (invalidates when scopes change). Folder walk deepened to 3 levels so `Immigration/IIA/client` is found; IIA maps to immigration. UI + `.env.local.example` document share-with-SA + Drive API enablement.

**Pass 55 (2026-07-28, Sheets — billable columns + Documents):** Did both items LD approved:

1. **Billable Notes columns on live spreadsheet** — wrote `activity` / `minutes` / `billable` headers to Notes G–I via service account (schema already matched). Live round-trip: note with Call/12/true persists and reads back.
2. **Documents → Google Sheets** — Next.js `documentsBackend()` with list/create/register; assessment templates, firm samples, and deliverable templates read/write Sheets; `POST /api/matters/[id]/documents` registers metadata after Fly OCR so the matter Documents tab populates without waiting for Fly dual-write; MatterDocumentUpload posts that register. Documents tab already had correct headers on the live sheet. Fly scaffold: `services/api/app/services/google_sheets.py` + `data_store.py`; OCR intake calls `data_store.create_document`; dual-write behind `AOD_DOCUMENTS_DUAL_WRITE=1` once Fly secrets are set.

pytest 124 (+6 dual-write tests); `test:google-sheets`, `test:work-entry`; next build `--webpack`; live Sheets doc+note smoke on AOD-1001.

**Fly Documents dual-write (2026-07-28, ops):** Set on `associateondemand-api`: `GOOGLE_SHEETS_SPREADSHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_JSON`, `AOD_DOCUMENTS_DUAL_WRITE=1` (Deployed). `ANTHROPIC_API_KEY` already on Fly. Health `/health` ok. `DATA_STORE=google_sheets` not set yet (Airtable Documents writes still primary; dual-write appends Sheets). Manual verify: upload PDF on matter Documents → row on Sheets Documents tab.

**Pilot click-through (2026-07-27, La'Dajia's request):** walked the real UI in local demo mode (Dashboard → Matters → matter workbench → Tasks → New Assignment intake → Templates) since no production login credentials are available. Found two distinct, separable problems behind "feels fragmented, not built": (1) every screen narrates the user as a *different* attorney submitting work *to* RMV ("RMV is drafting," the consent checkbox saying "you remain the attorney of record" as if RMV were someone else) — language, not architecture, and exactly the rename work deprioritized earlier tonight, now with concrete evidence it matters; (2) Immigration and PI don't feel like separate organized spaces because **PI was never actually built out** — Templates catalog had exactly one PI deliverable (Demand Letter, "Coming soon") against Immigration's four "Available now" entries plus a 17-variant paragraph library on AOS specifically; Matters list filters (Country/Posture/Court) are immigration-shaped; matter workbench tabs (Procedural timeline, Legal elements) don't have a natural PI home. Full findings + competitor sourcing (eImmigration's intake→workflow→e-filing journey, Clio's PI-specific damages/medical/HIPAA fields) given to La'Dajia; she chose PI depth first, then Immigration breadth (asylum + family-based, not cancellation/VAWA — confirmed with her directly).

**Pass 54 (2026-07-28, Journal arc — case story + note→facts):** Continuation from Pass 51's product vision ("one note = one work event = facts about the case"). Built two code-only slices that need no LLM or Sheets schema changes:

- **Case story view** — new `CaseNarrativePanel` on matter **Case activity** tab. Attorney work notes render as a chronological readable journal (filters out Agent/System/Facts JSON/Procedural payloads). Includes activity + billable time in the prose when logged.
- **Note → case facts extraction** — `lib/note-fact-extraction.ts` reuses Strong Reader heuristic prefill (`extractHeuristicFactsFromText` + `mergeOcrIntoDraftingFacts`). `NoteComposer` shows an "Add to checklist" banner when note text would fill empty drafting-facts fields; one click PUTs via existing `/api/matters/[id]/drafting-facts` without overwriting attorney edits.
- **Documents migration prep** — `docs/runbooks/documents-sheets-migration.md` documents the Python/Fly ↔ Next.js interface contract and safe rollout order (no OCR writes guessed this pass).

pytest 118; `test:note-fact-extraction`, `test:work-entry`, `test:facts`; next build `--webpack`; Vercel prod (web only — no Fly API changes).

**Pass 53 (2026-07-28, Phase 2 Sheets — PM Inbox):** Production `/inbox` and assignment intake were returning empty on Google Sheets mode because PM Inbox still read/wrote Airtable (quota exhausted). Migrated full PM Inbox CRUD to the `PM Inbox` tab: list, get-by-id, create assignment, status transitions, payment updates, mark delivered, and agent-flag resolve. Extracted shared `lib/pm-inbox-options.ts` (parse/serialize the `options` JSON column) used by both Airtable and Sheets backends. Wired `inboxBackend()` factory in `data-store.ts`; resolve API route now goes through data-store instead of calling Airtable directly. **User-visible:** new assignments from `/assignments/new` persist to Sheets and appear on the Inbox Kanban; approve/return/status actions round-trip; dashboard open-assignment KPIs populate again. Documents tab still Airtable-only (Python/Fly OCR — joint look still needed). pytest 118; `test:pm-inbox-options`, `test:google-sheets`, `test:assignment-transitions`; next build `--webpack`; Vercel prod (`d4e7faf`).

**Pass 51 (2026-07-28, Journal pass 1 — note = billable work entry):** La'Dajia articulated the actual product vision this session: **one note = one work event = facts about the case.** One frictionless input, three outputs — a billable work entry, structured case facts, and a line in the case's readable story. Her words: "I lose lots of time not billed bc i am doing things for the first time a lot of the time... release as much friction from reconstructing a case again. the workflow shall be blissful." Plus "secure and trustworthy."

**The finding that reordered priorities: this system had zero time or work capture.** No time entries, no billing capture, nothing — verified by grep, not assumed. Two nights of passes made drafting better while the thing that converts her work into money did not exist. That is the direct mechanical cause of the unbilled time she described.

Built the capture layer. New `lib/work-entry.ts` holds the domain logic: 8 activity types (Call/Email/Meeting/Research/Drafting/Review/Court/Filing), tenth-of-an-hour billing increments, roll-ups, and the unbilled-time detector. Notes gained optional `activity`/`minutes`/`billable`; Sheets `Notes` tab gained three columns; the write path runs end to end through API → data-store → Sheets/demo. **Friction was the design constraint, not an afterthought** — picking an activity auto-fills a typical duration (Call → 0.2, Drafting → 1.0), so one tap logs a complete entry and the attorney only intervenes when the default is wrong. Time under 6 minutes rounds *up* to 0.1 rather than down to zero, since rounding a short call to nothing is precisely the leak being closed. This **extends the existing `NoteComposer`** (which already did task detection via `detectTaskFromNote`) rather than adding a parallel system — per her "strengthen what we have before adding other aspects."

Surfaced in three places or the capture would be pointless: per-note activity badge on the matter's Case activity tab, a per-matter billable/no-charge roll-up, and a dashboard KPI. **Replaced the dashboard's "Hours saved this month"** — an estimate derived from completed deliverables, close to meaningless while drafting runs in template mode — with **"Billable hours logged," a real number**, whose hint doubles as the leak alarm: "N notes with no time logged." Reversible if she wants the old metric back.

**Caught a real bug in live demo verification** (not by a test — by reading the rendered number): the leak counter said "2 notes with no time" when only 1 was attorney work. The exclusion filter used exact matches on `type !== "System"`, and the demo seed's note is typed `"System Log"`, which slipped through and inflated a number she would act on. Note types are free text, so the filter is now a loose match across type *and* author covering system/agent/OCR/facts notes; regression test added with all four machine-note shapes plus a positive case proving a real attorney note with an unusual type (`"Client Call"`) still counts.

Airtable's `createNoteInAirtable` takes the work param and ignores it (no Airtable fields exist for it, and Airtable is retired operationally) — signature parity keeps the dormant path compiling and saving notes exactly as before, per the standing do-not-delete-Airtable direction.

**Needs La'Dajia:** three headers on the live Sheets `Notes` tab — `activity`, `minutes`, `billable` (columns G, H, I) — same one-time step the `lifecycle_stage` column needed. Until they exist, time logs fine in demo but has nowhere to land in production.

pytest 118; new `test:work-entry`; `test:facts`, `test:catalog`, `test:matter-lifecycle-stage`; tsc; next build. Verified live end-to-end in demo mode: POST with 7 minutes correctly stored as 12 (0.2), no-charge flag round-tripped, badges and roll-ups rendered, dashboard leak count corrected after the fix.

**Next in this arc (tasks #23–25):** narrative client view (reads like notes about a person, not six tabs); note → case facts extraction; handwritten note scanning. **Scanning decision made by La'Dajia:** anonymize-first, and the round-trip must be *invisible* — reversible pseudonymization with a server-side mapping, real names/A-numbers re-substituted on return. Her words: "user shouldnt have to decode it." That respects the `AOD_PII_TIER=0` default in LEGAL_BOUNDARIES.md rather than flipping it. `ANTHROPIC_API_KEY` is set on Fly — remaining work is the scanning architecture (reversible pseudonymization), not credentials.

**Pass 50 (2026-07-27, RMV rename pass 1):** The pilot click-through (see note above) found every screen narrates the attorney as a third party submitting work *to* RMV — a real, evidenced UX problem, not just cosmetic, since the whole point of this pass is making the product feel like the attorney's own integrated system rather than a vendor she sends work to. Scoped this first slice to the internal/operator flow only (`app/(app)/*`) — the genuinely-external partner funnel (`/partner/submit`, `PartnerSubmissionForm.tsx`) legitimately keeps third-party RMV framing, since other firms really are sending work to RMV as a real vendor there, so that flow was explicitly left untouched.

First had an agent map every "RMV" occurrence in `web/src` and classify each as internal-only, partner-only, or shared, since a blanket find/replace would have broken the partner flow's correct framing. Rewrote the internal-only ones: Dashboard quick-actions ("Submit overflow work to RMV" → "Start drafting on a new matter"; "Submitted or in progress with RMV" → "Submitted or in progress"), Inbox subtitle ("RMV verification" → "agent drafting"), the matter workbench's "what to do next" strip ("RMV is drafting" → "Agents are drafting" — kept the workflow-stage meaning, not collapsed to generic first person), the New Assignment conflict-check failure toast, the intake guidance assistant message, all three Getting-Started-wizard onboarding steps, and a template-profile-name placeholder.

The one genuinely shared file — `lib/intake-disclaimer.ts` (consent-checkbox text, used by both `AssignmentIntakeForm.tsx` and `PartnerSubmissionForm.tsx`) — is the exact language flagged during the pilot ("you remain the attorney of record... I understand RMV verifies the deliverable," read by the attorney about her own matter as if RMV were someone else). Rather than picking one wording and breaking the other flow, added an `isPartnerSubmission` flag to the disclaimer context: partner submissions keep "RMV verifies the deliverable" (accurate — a real third party is reviewing it there); internal submissions now read "Deliverables are verified against your firm's Attorney instructions and Firm Memory before you sign off" / "I understand deliverables are AI-assisted drafts for my review before use" (accurate — she's supervising her own AI agents, not handing off to a vendor). `SiteGuideContent.tsx`'s help-page copy got the same selective treatment — the "Partner funnel" and partner-billing bullets were left exactly as-is; the surrounding internal-usage bullets were reworded.

Verified live in demo mode: Dashboard quick-action now reads "Start drafting on a new matter"; matter workbench (AOD-1001) "What to do next" now reads "Agents are drafting — add attorney instructions..." — confirmed via `get_page_text`. Grep-confirmed zero remaining `RMV` occurrences in every internal file touched, and confirmed the partner-facing files (`PartnerSubmissionForm.tsx`, `app/partner/submit/page.tsx`) are byte-for-byte unchanged where they should be. `tsc --noEmit` clean; `next build --webpack` clean; `test:facts`/`test:catalog`/`test:contacts`/`test:matter-lifecycle-stage` all pass (none of them touch this copy, confirming no accidental logic change).

**Deliberately scoped out of this pass** (a genuinely large surface area, per the "well-defined slice, not the whole app at once" instruction): Settings page billing copy (correctly describes the partner billing model even though it lives on an internal-only page — left as-is, verified this is accurate not a bug); code comments referencing "RMV" that are never rendered to a user (`lib/dashboard-aggregates.ts`, `lib/types.ts`, `lib/firm-knowledge-for-matter.ts`, `lib/template-profiles.ts`, `lib/assignment-payment.ts`, various `app/api/*` route comments) — zero user-facing impact, not worth the risk of touching working code for no visible benefit. A second rename pass could sweep the Templates page, Firm Memory page, and Settings page copy for any remaining internal-third-party framing missed here.

pytest 118; tsc; `test:facts`, `test:catalog`, `test:contacts`, `test:matter-lifecycle-stage`; next build; Fly + Vercel.

**Pass 49 (2026-07-27, Immigration breadth 1 — "stronger then add," the "stronger" half):** The generic immigration intake was one flat 6-field checklist for every case type — asylum, family-based, cancellation, everything. Built two new staged, AOS-depth schemas in `practice-area-facts.ts`: `ASYLUM_WITHHOLDING_CAT_FIELDS` (21 fields — identity/A-number/one-year-deadline → attorney-authored case theme/nexus theory/PSG formulation → past-persecution narrative/country conditions/CAT torture factors/credibility strategy) and `FAMILY_BASED_FIELDS` (15 fields — petitioner/beneficiary/I-130 status → relationship theme/red flags → relationship evidence/prior denials/inadmissibility/public charge). `PracticeAreaId` extended with `immigration_asylum`/`immigration_family`; new `isImmigrationPracticeArea()` helper; `resolvePracticeArea()` now checks asylum/withholding/CAT and family/marriage/I-130 keywords before falling through to the coarse `immigration` bucket (cancellation and everything else unaffected, per LD's explicit scope: asylum + family-based only, not cancellation or VAWA/U/T).

Found and fixed five real regressions this change would have silently caused, all before shipping (grep sweep of every `area === "immigration"` strict-equality check in the codebase, since the new sub-areas would fail that check and silently fall through to generic/empty behavior):
1. **AOS Discretionary Brief itself** — `fieldsForDeliverable` only had a schema keyed under the coarse `"immigration"`; selecting AOS against an asylum-labeled matter (e.g. the demo seed's "General Asylum" matter) would have silently downgraded it to the new generic asylum checklist instead of the real AOS fields. Fixed with a fallback-through-coarse-key: `byDeliverable[area] ?? (isImmigrationPracticeArea(area) ? byDeliverable.immigration : undefined)`. This is the regression that mattered most — verified live (see below).
2. `matter-task-templates.ts` stage-triggered task automation (`stageTaskTemplates`) would have fallen through to near-empty `GENERIC_STAGE_TASKS` for asylum/family matters instead of the real `IMMIGRATION_STAGE_TASKS` checklist.
3. `legal-element-templates.ts` Legal Elements auto-seeding (including the existing `ASYLUM_ELEMENTS` addition) would have stopped firing for the new sub-areas.
4. `PracticeAreaFactGuide.tsx` would have mislabeled asylum/family matters as "Personal injury" in the UI header.
5. The staged Identity → Architecture → Factors progressive-disclosure UI itself was hardcoded to AOS only (`isAos` check) — generalized to `hasStagedFields` (true for any schema with staged fields), which also retroactively fixes a gap in Pass 48's PI Demand Letter work (it now gets the staged UI too, not just the flat one).

All five fixed with `isImmigrationPracticeArea()` gating instead of strict equality. `test:facts` caught one legitimate regression itself (a hardcoded `resolvePracticeArea("Immigration - Asylum") === "immigration"` assertion, now correctly `"immigration_asylum"`) — updated the test fixtures and added new assertions covering sub-area resolution and, critically, a permanent regression guard asserting `fieldsForDeliverable("aos-discretionary-brief", "immigration_asylum")` still returns AOS fields. Verified live in demo mode: opened AOD-1001 (General Asylum), expanded the Documents-tab fact guide, confirmed the full staged 3-section UI (Identity / Case architecture / Factors & supporting detail) renders all 21 new asylum fields correctly, 0/21 count matching. Did not get live browser confirmation on a family-based matter (none exists in the demo seed) or re-click the AOS-template-on-asylum-matter path live — leaning on the new automated regression guard (#1 above) for that, which is a direct, precise assertion of the exact bug this would have been.

**Deliberately not built this pass** (flagged for LD, per the "then add" half of "stronger then add," a pricing decision not mine to make): new dedicated priced deliverable SKUs — "Asylum/Withholding/CAT Brief" and "Family-Based Petition Brief" — as their own catalog entries distinct from the generic intake. The generic checklist built this pass is real and usable today (feeds the case assessment / attorney-instructions flow same as everything else), but a dedicated priced SKU is a product/pricing call, same as how Demand Letter's SKU status was handled in Pass 48.

pytest 118; `test:facts` (rewritten fixtures + new regression guard), `test:catalog`, `test:contacts`; `tsc --noEmit`; `next build --webpack`; Fly + Vercel.

**Pass 48 (2026-07-27, PI depth pass 1):** Personal Injury Demand Letter rebuilt from an 8-field flat schema to a 21-field staged intake (identity/incident → attorney-authored case architecture → damages/treatment/evidence detail), matching AOS Discretionary Brief's structure exactly — including a "case theme" field with the same attorney-guidance pattern, a comparative-fault-defense field (anticipating what the carrier will argue), lien tracking, and lost-wages detail. `PI_BASE` (generic fallback) also gained insurance carrier/claim number/lien fields for consistency. Demand Letter moved from "Coming soon" to "Available now" in the catalog (`PHASE0_LAUNCH_SKU_IDS`) — confirmed first that this flag is a pure UI grouping/badge, not a functional gate, so safe to flip once the underlying schema justified it. **Deliberately did not** invent a persuasive-argument paragraph library the way AOS has one — that content came from La'Dajia's real uploaded firm template, and inventing PI argument variants from scratch without her review would be the same mistake as guessing at legal content. Caught a real test failure before shipping: `test:catalog` correctly flagged the new launch SKU was missing its required billing note. Verified live: selecting Demand Letter against a Personal-Injury-typed matter renders the full 21-field checklist with correct feedsSection hints; against an Immigration-typed matter it correctly falls back to the generic immigration schema (no cross-contamination). pytest 118; `test:catalog`, `test:facts`; next build; Fly + Vercel.

**Next for Immigration breadth (confirmed scope, not yet started):** asylum/withholding/CAT and family-based petitions need the same AOS-level guided-intake treatment — currently only the generic 6-field immigration fallback. Content (persuasive arguments, paragraph variants) needs La'Dajia's real templates/input, same constraint as PI; the fact-schema *structure* can be built ahead of that.

**Overnight continuation agent active (2026-07-26/27 night):** running `docs/runbooks/continuation-agent.md` protocol via Claude Code `/loop`, self-paced, session-bound. **Direction from La'Dajia (2026-07-27):** full move to Google Sheets, Airtable retired as the operational backend — but its code stays in place, dormant (not deleted), specifically so we can compare in the morning and decide file-by-file whether to keep, roll back to, or actually remove it. Also: for major/permission-worthy calls, ask in the response text but don't block the loop on an answer — if no reply within a few minutes, proceed with the safer default and flag it in CHECKPOINT.

**Note — Cursor was also running its own agent on this repo simultaneously for part of the night** (commits `c304c7c` Google Sheets connected on Vercel, `209a0bd`/`89b64eb`/`ec9d708` SSR-crash fixes). One real collision: a `vercel deploy --prod` from this loop caught `data-store.ts` mid-edit by Cursor's agent and failed the build (safely — Vercel deploys are atomic, production was never affected). La'Dajia paused Cursor and told this loop to continue solo. If Cursor reappears mid-pass, this loop's protocol is to stand down again rather than fight over the same files.

**Pass 47 (2026-07-27, continuation agent pass 8):** `npm run test:matter-lifecycle-stage` — first automated coverage for the lifecycle-stage logic shipped across Pass 39-46 (was verified live each time but had zero regression protection). Covers `normalizeLifecycleStage`, `isValidLifecycleTransition` (forward progression, reopen-from-Closed, one-step-back all legal; skipping stages/self-transitions illegal), `stageTaskTemplates` (immigration/PI have real checklists, generic areas mostly empty, no duplicate template ids within a stage — a duplicate would silently collide with the `createdFrom` idempotency tag and only ever create one task), `matterLifecycleBreakdown`, and `filingDeadlinesMissingDate`. Pure test addition, zero behavior change — deployed the web app but the only thing that changed is a new script. pytest 118; next build.

**Pass 46 (2026-07-27, continuation agent pass 7):** The Calendar page's own subtitle promises "hearings, filing deadlines, and internal deadlines" but it only ever read the Events table — filing-deadline Tasks (even dated ones, after Pass 44's fix) never actually appeared there. `calendar/page.tsx` now also fetches `listAllTasks()`, filters to incomplete `isFilingDeadline` tasks with a due date, maps them into the same `CalendarEntry` shape (type "Filing Deadline", synthetic `task-<id>` ids to avoid collision with real Event ids), and merges both lists into `CalendarBoard`. Confirmed safe first — `CalendarBoard`'s entry-detail view is read-only (links to the matter, no edit/delete tied to `entry.id`), so the synthetic ids can't trigger a broken mutating action.

**Bug found + fixed while verifying:** `createTaskForMatter`'s demo-mode branch pushed to `seed.tasks` but never called `persistSeed()` — a pre-existing bug (not introduced this session), unrelated to the calendar work but discovered because it was making Calendar verification look broken. In demo/local mode, any task created this way was lost the moment the dev server's module cache reset (Fast Refresh), which likely explains some of the confusing test-data behavior noted in earlier passes tonight too. Production is unaffected — this only fires in demo mode (`isDemoMode()`), never against real Airtable/Sheets. Fixed with the same `persistSeed()` call already used everywhere else in this file.

pytest 118; next build; Fly + Vercel. Verified live: created a filing-deadline task, gave it a date, confirmed it renders on `/calendar`.

**Pass 45 (2026-07-27, continuation agent pass 6):** Direct follow-on to Pass 44 — `filingDeadlinesMissingDate()` counts incomplete filing-deadline tasks with no due date (invisible to Upcoming Deadlines/Calendar by construction); dashboard now shows a firm-wide rose-colored warning line next to the existing "N filing deadlines in the next 14 days" summary, so the attorney doesn't have to open every matter's Tasks tab to find the ones still missing a date. Small, additive, low-risk — code-reviewed + type-checked + built rather than a full live-browser round-trip, per the resource-conservation note below. pytest 118; next build; Fly + Vercel.

**Resource conservation (2026-07-27, ~00:44 CDT):** La'Dajia is watching usage-credit consumption. Cadence went 1-minute cron → dynamic self-paced (~30 min) → a full stop for ~2h at her request → resumed early on her go-ahead. Passes should stay tightly scoped and skip re-verifying things already confirmed working; not every small additive change needs a full live-browser test if the underlying data path was already verified in an earlier pass (see Pass 45).

**Pass 44 (2026-07-27, continuation agent pass 5):** Task editing — no endpoint existed to change an existing task (only create + complete). Real consequence: the stage-automation from Pass 39 creates filing-deadline tasks (`isFilingDeadline: true`) with `dueDate: null` by design (the automation has no way to know the real deadline date), but with no edit capability those tasks were **permanently invisible** to Upcoming Deadlines and the Calendar — the single most legally dangerous category the whole automation system produces. New `PATCH /api/tasks/[taskId]` (Airtable + Sheets + demo, all three backends); `TaskList.tsx` now shows a red "won't appear on deadlines/calendar until a date is added" warning on any incomplete filing-deadline task missing a date, with an inline "Add due date" editor. Verified live (isolated single-request test, not the noisy multi-step sequence that briefly looked broken from a demo-mode file-persistence race under rapid sequential curl calls — confirmed via `ps`/git log that it was a testing artifact, not a real bug or a second agent instance): create task → PATCH dueDate → GET confirms persisted. Also confirmed empty-description and not-found guards return 400/404 correctly. pytest 118; next build; Fly + Vercel.

**Loop cadence note:** switched from self-paced (~25 min) to CronCreate every 1 minute per La'Dajia's request. Each pass still takes several minutes regardless (build/test/deploy don't get faster), and a tight interval risks the loop re-firing while a pass is still mid-flight — worth revisiting if anything looks inconsistent in the morning.

**Pass 43 (2026-07-27, continuation agent pass 4):** Dashboard "Matters by lifecycle stage" widget — `matterLifecycleBreakdown()` in `dashboard-aggregates.ts` groups matters into the 5 canonical stages; renders as a compact count row on `/dashboard` (gated to Sheets/demo, same as the stage feature itself). The mechanical Sheets-migration backlog was done after Pass 42, so all four passes' worth of stage automation had zero visibility from the dashboard — this closes that gap: the attorney can now see the whole caseload's stage distribution at a glance instead of needing to open each matter's Tasks tab. Verified live: fresh demo seed correctly shows Intake 3 / Active 0 / Filed 0 / Resolution 0 / Closed 0. pytest 118; next build; Fly + Vercel.

**Pass 42 (2026-07-27, continuation agent pass 3):** Case Assessment migrated to Google Sheets — new `assessment_data` column (Q) on the Matters tab, same JSON shape as Airtable's field of the same name. Checked the remaining `readAirtableLegacy` list first: Assessment Templates / Firm Samples / Deliverable Template Documents all read the same Documents table the OCR pipeline writes to (filtered by category) — migrating just their reads would split-brain against Python/Fly's Airtable writes, so left those with Documents under the same flagged item. Verified live: GET on a fresh matter returns the empty-assessment shape; PATCH persists; GET-after-PATCH matches exactly; unrelated matter fields (title, caseType) untouched by the read-modify-write. pytest 118; next build; Fly + Vercel.

**Pass 41 (2026-07-27, continuation agent pass 2):** Contacts, Legal Elements, and Events were silently returning empty on Google Sheets — Cursor's SSR fix (`readAirtableLegacy`) made them degrade gracefully instead of crashing, but they were non-functional (conflict-check-relevant: Contacts is used for conflict checking, so this mattered). Migrated all three to Sheets following the exact pattern already established for Matters/Notes/Tasks: `google-sheets/queries.ts` gained `mapContactRow`/`mapLegalElementRow`/`mapEventRow` + full CRUD, `data-store.ts` gained `contactsBackend()`/`legalElementsBackend()`/`eventsBackend()` factories, and `/api/events` (which previously called Airtable directly, bypassing the abstraction, and 503'd in demo mode) now routes through a proper `createEvent()`. Verified live: contact create/link/unlink round-trips correctly against a real matter, legal element create+list works, event create returns correct shape. Caught one real bug before shipping: `createEventInAirtable` was referenced in the new `eventsBackend()` Airtable branch but never imported — `next build`'s WASM type-checker crashed with an opaque "invalid type: unit value, expected usize" instead of a normal type error (the local `node_modules/typescript` install was also broken — missing `_tsc.js` — reinstalled it to get a real error message and find the missing import). pytest 118; next build; Fly + Vercel.

**Documents (flagged, not attempted):** Document metadata + the OCR pipeline still write to Airtable only, via the separate Python/Fly API service (`services/api/`), not this Next.js data layer. Migrating that is real cross-service work (Sheets API auth in Python too), not a mechanical fix like the others — needs a look together rather than an overnight guess at the Python side.

**Pass 40 (2026-07-26, continuation agent pass 1):** Record-decision action — the one lifecycle transition with no automatic trigger (Filed/Awaiting Decision → Resolution; nothing observes "a decision came in"). `POST /api/matters/[matterId]/decision` (outcome + optional note) logs a Decision-type Note and advances the stage + auto-creates Resolution tasks in one action; UI replaces the bare "Move to: Resolution" button with a decision form when a matter is Filed/Awaiting Decision. Caught and fixed a real bug during live testing: the route originally raced note-creation against the stage-advance (`Promise.all`), so a *rejected* call (illegal transition) still left a stray "Decision recorded" note behind — fixed by sequencing (advance first, only log the note if it succeeds). pytest 118; next build; Fly + Vercel.

**Pass 39 (2026-07-26):** Matter lifecycle automation — Clio-Manage-style stages (Intake → Active → Filed/Awaiting Decision → Resolution → Closed) finished the Tasks-on-Google-Sheets migration slice and made stage moves auto-fire that stage's task checklist (idempotent via `createdFrom` tags). Real events now drive stage automatically: new matter seeds Intake tasks immediately; first assignment submitted nudges Intake→Active; exporting an approved deliverable nudges Active→Filed/Awaiting Decision; closing a matter forces Closed from any stage; reopening resumes Active. Commits `2a152e6`, `cb49671`. pytest 118; next build; Fly + Vercel.

**Next:** Document/OCR-pipeline Sheets migration needs a joint look (Python/Fly side) — see flagged item above. `ANTHROPIC_API_KEY` is on Fly; still open for pilot: New matter → paste facts → save → dispatch AOS brief.

**Discussed tonight, not built — real candidates for a future pass:** Google Calendar sync (Events schema already has unused `calendar_synced`/`google_calendar_id` columns anticipating this; needs La'Dajia to set up a Google Cloud OAuth app first — her personal calendar, not multi-user, matches the internal-first framing). General external-app integrations (e-signature, Slack, etc.) follow the same optional-API-key pattern already used for Anthropic/Midpage/Fastcase/Stripe/Resend — not phase-gated, just not built yet. Only Clio/Needles-style *competing platform* integrations are actually locked per `LEGAL_BOUNDARIES.md`.

## Awaiting approval (overnight side branches)

_None yet — everything built overnight has shipped straight to `cursor/phase0-foundation` after tests passed. The Documents/Fly-API question above is flagged for a joint look, not built to a side branch, since there's nothing safe to implement without a real architecture conversation first._

**Pass 37 (2026-07-23):** Inbox PM board — clickable assignment cards open a right-side detail drawer (`AssignmentDetailDrawer` + `GET /api/inbox/[itemId]/preview`). Shows deliverable/tier, matter + client links, facts, latest agent draft (or No draft yet → Open Associate), actionable “what’s missing” checklist, and approve/return/status actions. next build; Vercel prod. Commit `e27a4f0`.

**Pass 36 (2026-07-23):** AOS brief builder integrated (no standalone tool) — removed `/tools/aos-brief-builder` HTML page (now redirects to `/templates`) and `AOS_Selection_Menu.html`. New `GET /api/aos/library` + native `AosVariantSelector` (recommended badges, novel-combination alerts, live preview) as step 4 of the AOS fact guide; `/templates` AOS card/preview → "Draft with variants". Picks save to `fields.paragraphSelections` (section_a / section_d_adverse / section_e_balancing), consumed by the existing generator (no backend change; paragraph library kept). next build (staged) green. Runbook: `docs/runbooks/aos-output-library-fill.md`.

**Pass 35 (2026-07-23):** Contacts feature — Airtable `linked_matters` field; `/contacts` list + Add contact modal; contact detail with related matters; matter Overview Contacts panel (Add client contact / Link existing); demo seed contacts; APIs `POST/GET /api/contacts`, `PATCH /api/contacts/[id]` link/unlink. `npm run test:contacts`; next build; Vercel.

**Pass 34 (2026-07-23):** AOS Output Fix (five fixes) — canonical PRESERVE legal standard / AOS mechanism / conclusion (Patel + Arai verbatim); FILL via `aos_paragraph_library.json` builders (default, no API); certificate of service; attorney selection menu at `/tools/aos-brief-builder`; optional LLM via `AOD_AOS_USE_API=1`. pytest 115; next build; Fly + Vercel. Runbook: `docs/runbooks/aos-output-library-fill.md`.

**Pass 33 (2026-07-22):** AOS draft quality — store full Part 8.1 system prompt (`aos_system_prompt.py`); Part 8.2 `build_section_prompt` with all client facts; Anthropic extended thinking (`budget_tokens=8192`); drafting agent primary path = `aos_brief_generator` (`use_api=True`). Env: `AOD_AOS_MODEL`, `AOD_AOS_THINKING_BUDGET`, `AOD_AOS_MAX_TOKENS`. pytest 108. Fly API redeploy.

**Pass 32 (2026-07-22):** Templates preview fix — removed 12k/8k truncation (API text_preview 500k for deliverable templates; Airtable note update 100k; meta fits text with truncate flag); Extracted text tab = Full document + char count + scroll-all; Structure mapping redesigned as vertical brief map (Cover→I–IV→A–E, classification colors, feeds chips). pytest AOS 21; next build. Re-upload DOCX to refresh stored full text.

**Pass 31 (2026-07-22):** Kingdom Counsel AOS brief pipeline live — separate parser (`brief_parser/`) + generator (`aos_brief_generator.py`); PRESERVE/FILL/CAPTION/BOILERPLATE on firm DOCX upload → `briefTemplate` meta; AOS architecture intake (identity → theme/headings → factors); Templates Structure badges; drafting injects System Guide + validator report. pytest 102; next build; Fly + Vercel.

**Pass 30 (2026-07-22):** Legal Elements auto-seed core Firm Knowledge by matter type (no Load button / applied badge); optional elements via dropdown; case-type change merge prompt. Firm Memory moved to `/firm-memory` + Settings (out of Templates). USCIS form autofill noted as future. `test:firm-knowledge`; pytest 81; next build; Vercel prod (web only).

**Next:** Connect Google Workspace — create spreadsheet + service account per `docs/runbooks/google-sheets-setup.md`; set `GOOGLE_SHEETS_SPREADSHEET_ID` + `GOOGLE_SERVICE_ACCOUNT_JSON` on Vercel; unset or keep `AIRTABLE_PAT` only if rollback needed. Phase 2: migrate Tasks, PM Inbox, Documents, Fly API writes.

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

- **Pass 62 (2026-09-03):** Assignment intake → inbox → template catalog re-verified green a fifth consecutive scheduled run (flow unchanged since 2026-07-02); fast-forward merged Pass 61's PR #12 instead of re-diagnosing; pytest 136, lint 0 errors, tsc clean, next build (88 routes), all 25 test:* scripts green, smoke-assignment-e2e PASS x2 (no hang), smoke-production PASS live. Confirmed the deploy blocker is structural, not credential-related: this automation's only sanctioned delivery path (`open_git_pr`) never pushes to `cursor/phase0-foundation` directly, and that is the only branch Vercel/Fly's Git integrations watch — so a human merge is required every time regardless of what any pass fixes. 11 unmerged PRs (#2–#12) now block deploy; recommends merging #12 and closing the rest.
- **Pass 58 (2026-08-27):** Assignment intake → inbox → template catalog regression pass — verified the existing end-to-end flow (already built since 2026-07-02) and fixed every CI-blocking regression: `services/api/requirements-dev.txt` so CI's pytest job installs pytest, 3 real + 10 scoped-disable `react-hooks/set-state-in-effect` lint fixes across 11 components, a stale `verify-assessment-documents.mjs` assertion, and a `smoke-assignment-e2e.sh` hang fix (process-group kill). Flagged the 9-PR unmerged backlog (`#2`–`#10`) causing repeated rediscovery of the same bugs. pytest 136; lint 0 errors; tsc clean; next build (88 routes); smoke-assignment-e2e + smoke-production PASS; could not deploy (no Fly/Vercel CLI in this sandbox).
- **Pass 56 (2026-07-28):** Practice import via Google Drive API for Vercel — shared SA auth (Sheets + Drive readonly scopes), `google-drive/client.ts`, scan orchestrator prefers Drive folder ID then local sync, 3-level folder walk (Immigration/IIA/client), env + UI copy. Local Mac sync still works when Drive folder ID unset.
- **Pass 55 (2026-07-28):** Live Notes `activity`/`minutes`/`billable` headers G–I; Documents Sheets list/create/register + assessment/template paths; Fly dual-write scaffold (`AOD_DOCUMENTS_DUAL_WRITE`); pytest 124; next build; Vercel + Fly.
- **Prod SSR fix (2026-07-27):** Google Sheets primary mode no longer calls Airtable for unmigrated tables (Documents, Legal Elements, PM Inbox, Contacts, …) — empty degrade instead of 429 crash. Restored Airtable quota fallback regardless of `DATA_STORE`. Fixed digests 1798507080, 978696406, 693593980 on `/matters/[id]`, `/inbox`, `/dashboard`. next build; Vercel prod.
- **Google Sheets production (2026-07-27):** Firm spreadsheet + service account on Vercel (`DATA_STORE=google_sheets`); prod deploy https://aod-next.vercel.app; `/api/health` reports `demoMode: false`.
- **Pass 38 (2026-07-26):** Real client path + AOS intelligence — paste summary extract (LLM + heuristic), scorecard follow-ups, prior-matter fact templates, Google Sheets skills; pytest 118; test:aos-intelligence.
- **AOS prose polish (2026-07-24):** Filing-clean library FILL — sentence-start pronoun capitalization; Section A v3 care-slot dedupe (professional vs attachment); community-service list punctuation; Maria Elena sample 0 errors/0 warnings; pytest 115; Fly API.
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

1. **Merge the PR backlog** — `#2`–`#11` are all open against `cursor/phase0-foundation` (Pass 61 adds no new PR content beyond #11, just re-verification); the fastest way to stop the cron from re-diagnosing the same CI bugs a fifth time is for a human with repo-write access to merge one consolidated PR (#11, or this pass's) and close the rest without merging. This also unblocks deploy — Vercel/Fly's Git integrations watch `phase0-foundation`, so nothing merges to production until one of these PRs lands there; then `flyctl deploy -a associateondemand-api` / `vercel deploy --prod` (no deploy CLI/credentials in this sandbox).
2. **Practice import on Vercel** — set `AOD_PRACTICE_DRIVE_FOLDER_ID` (03 Clients Active folder ID), ensure `GOOGLE_SERVICE_ACCOUNT_JSON` is inline JSON, enable Drive API, share folder with SA as Viewer; verify `/import/practice` lists matters (watch demoMode).
3. **Verify Fly Documents dual-write** — upload a PDF on a matter Documents tab; confirm a new row on the Sheets Documents tab (secrets already Deployed; web register path also writes).
4. **Handwritten note scanning (Journal arc #25)** — anonymize-first OCR round-trip; reversible pseudonymization per La'Dajia's decision.
5. **Pilot real client AOS on prod** — New matter in Google Sheets → paste summary → Extract facts → Save → dispatch `aos-discretionary-brief`.
6. **Retest lifecycle on prod** — matter Tasks tab → stage PATCH → Record decision on Filed/Awaiting Decision matters.

## Blockers

All remaining blockers are **attorney-side** (no code work required):

| Blocker | Owner | Notes |
|---------|-------|-------|
| Practice Drive folder on Vercel | La'Dajia | `AOD_PRACTICE_DRIVE_FOLDER_ID` + share "03 Clients Active" with SA email as Viewer; enable Drive API on GCP |
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
