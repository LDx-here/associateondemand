# What is holding this project back — handoff brief

**Written:** 2026-08-03. **Audience:** any agent or engineer picking this up.
**Read this before your first commit.** It is not a task list; it is why the
task lists so far have not added up to a working product.

---

## The situation in one paragraph

This system has ~55 development passes behind it. Tests pass, builds are clean,
deploys succeed. Until 2026-08-03 the production instance contained two
placeholder matters — `"Sample overflow matter"` and `"nm"` — and the attorney
who owns it had never run a real case through it. Every AI feature had been
returning template output for weeks behind a logged-but-unnoticed HTTP 401. The
API cold-started on every request, answering its own health check in 19.9
seconds. None of this showed up in any test.

That gap — green pipeline, unusable product — is the thing to fix. Not by
adding features.

---

## Root causes (fix these, or the symptoms come back)

### 1. "Done" was defined as *shipped*, never as *used*

Every pass ended with `pytest N passed; next build; vercel deploy`. Not one of
those tells you whether the attorney can do her job. Features were verified in
**demo mode against seed data**, then deployed to a production instance holding
no real matters.

Concretely: lifecycle-stage automation, staged fact schemas, calendar merging,
and task editing were all built, tested, and shipped into a system with an
empty caseload. They may well be correct. Nobody knows, because nothing has
been exercised against a real case.

**Rule going forward:** a change is not done until it has been run against one
of her actual matters — Viazovikova, Hammond, Konst — not a demo seed. If you
cannot test it that way, say so explicitly in the checkpoint rather than
letting a green test suite imply coverage.

### 2. The product is architected as a different business than the one in use

`AssociateOnDemand Project DNA` describes a B2B **overflow-counsel
marketplace**: partner firms submit work to RMV, RMV verifies and returns
deliverables. That is the product the information architecture serves.

She uses it as **her own solo practice management system**. The mismatch is
everywhere and is the main reason she describes the UI as "fragmented":

- 7 of 9 dashboard KPIs measure the marketplace (partner submissions, overflow
  deliverables, assignment pipeline). On her real account they all read `0`.
- The dashboard subtitle still says *"Your overflow counsel queue — verified
  deliverables for partner firms."*
- The partner submission funnel is surfaced prominently in a single-user app.

**Before building any new surface, ask which product it serves.** Partner-funnel
code (`/partner/submit`, `PartnerSubmissionForm`) is legitimately third-party
and should keep that framing. Everything under `app/(app)/` is her own system
and must read as hers.

### 3. Failures are silent by construction

The pattern that did the most damage: `services/api/app/services/llm.py` caught
a 401, logged it at **warning** level, and returned `None`. Every agent treats
`None` as "LLM not configured" and answers with a template. So a hard
authentication failure was presented to the user as normal operation, for
weeks.

The same shape recurs elsewhere — `readAirtableLegacy` degrading to empty
arrays, demo-mode fallbacks that look like real data, `catch {}` blocks that
swallow and continue.

**Rule:** distinguish *not configured* (fine, degrade quietly) from *configured
and rejected* (loud). If output silently changes quality based on a config
failure, the user must be told in the UI, not just the logs.

### 4. Too many live data paths for a one-person firm

Every data function currently branches across: Google Sheets (primary),
Airtable (retired but intentionally kept dormant — **do not delete**), demo
mode, plus for the importer both local synced Drive and the Drive API. Documents
and the OCR pipeline still write to Airtable through the separate Python/Fly
service while everything else moved to Sheets.

That is five code paths per feature and a split-brain on Documents. It is the
main source of "it worked locally but not in production."

**Do not add a sixth path.** Consolidating Documents onto Sheets is real
cross-service work and needs a conversation with her first — it is flagged, not
forgotten.

### 5. Infrastructure was configured for a demo, not a product

`min_machines_running = 0` with auto-stop meant every request cold-started
(~20s). The Fly health check hit a `/health` endpoint that performed live
network I/O to Postgres, Redis, and Qdrant, on a 5-second timeout — which a
booting machine can never satisfy, so the app was permanently "unhealthy."

Fixed 2026-08-03 (0.39s warm, checks passing). Watch for the same class of
default elsewhere: defaults chosen for a prototype that silently degrade a
product.

### 6. Multiple agents, no shared definition of done

Cursor and Claude Code have both been committing to `cursor/phase0-foundation`,
sometimes hours apart, occasionally on the same files. The work is real and
mostly good. What is missing is a single owner of "can she use it," so both
agents optimized for shipping passes.

**Check `git log` and `git status` before starting.** If another agent's
uncommitted work is in the tree, stop rather than committing over it.

---

## Concrete debt inventory

Ordered by how much it blocks real use.

| # | Item | Where | Notes |
|---|------|-------|-------|
| 1 | `ANTHROPIC_API_KEY` on Fly returns 401 | Fly secret | **Blocks every AI feature.** Adding credits did not fix it, which rules out billing — the key itself is invalid. Likely a Claude.ai subscription key rather than a console.anthropic.com API key. Verify with `scripts/check-anthropic-key.sh` before setting. Owner: La'Dajia. |
| 2 | Imported matters have no case state | Sheets `Matters` | The importer brings client name + practice area. Country, posture, next deadline, assigned attorney are all empty. The data exists in the case folders (e.g. `470508-order setting hearing.pdf`) and is not being read. |
| 3 | Dashboard measures the marketplace | `app/(app)/dashboard/page.tsx` | Replace overflow KPIs with practice reality: whose case needs attention, what is due, what has gone quiet, time captured. `daysSinceActivity` in `lib/practice-import.ts` already computes quiet-case data. |
| 4 | Sample matters in production | Sheets `Matters` | `AOD-1001 "Sample overflow matter"` and `AOD-1002 "nm"` sit alongside seven real clients. Confirm with her before deleting rows — never delete Sheets rows unprompted. |
| 5 | Notes tab may lack work-capture columns | Live Sheets | Pass 51 added `activity` / `minutes` / `billable` to `TAB_HEADERS.notes`. Reads map by header name so nothing breaks, but time logging silently no-ops until those headers exist in the live sheet. Verify before building anything on top of it. |
| 6 | Documents split-brain | `services/api` | Document metadata + OCR write to Airtable via Python while everything else is Sheets. Flagged for a joint conversation — do not attempt solo. |
| 7 | Signed-out landing page | `app/page.tsx` | Fixed 2026-08-03, but it had told users to "connect Airtable" and pointed at a "local development runbook" for weeks. Worth re-reading any user-facing copy with fresh eyes. |

---

## Priorities

**Do not start new feature work until 1–3 are done.**

1. **Unblock the API key** (hers) — everything AI-shaped is dead until then.
2. **Give imported matters real case state** — deadlines and posture parsed from
   the case folders. A matter list with empty deadline columns is a worse
   spreadsheet.
3. **Reorient the dashboard to her practice** — the quiet-case data already
   exists; surface it.
4. Then: proactive suggestions on the Clio pattern (propose a time entry from
   note text, flag approaching deadlines) — see `CHECKPOINT.md` Pass 52 for the
   competitor research.

---

## Standing constraints (from her, repeatedly confirmed)

- **Google Sheets is the operational backend. Airtable code stays in place,
  dormant. Do not delete Airtable code paths.**
- **`AOD_PII_TIER=0` stays.** Client notes contain A-numbers, immigration
  status, and medical detail. Anything sent to a cloud model must go through
  reversible pseudonymization and come back with real values restored — she was
  explicit that she must never see a placeholder token.
- **No new practice areas.** Immigration and personal injury only.
- Never force-push, hard reset, delete Sheets/Airtable rows, or touch secrets.
- Cross-check `LEGAL_BOUNDARIES.md` before any third-party integration.

---

## How to actually verify your work

```bash
cd services/api && .venv/bin/python -m pytest tests/ -q
cd web && npx tsc --noEmit -p tsconfig.json && npx next build --webpack
bash scripts/smoke-production.sh
```

Those are necessary and **not sufficient** — they were all green throughout the
period this document describes. Add one more step every time:

> Open the change against a real matter on `aod-next.vercel.app` and confirm it
> does what she would expect. If you cannot, write down that you could not.

That last line is the whole point of this document.
