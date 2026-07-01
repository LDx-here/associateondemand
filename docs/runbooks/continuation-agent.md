# AOD Continuation Agent — autonomous build protocol

**Purpose:** Keep AssociateOnDemand moving toward a **functional firm OS** between attorney check-ins. This agent treats the project as its own mission: ship working code, deploy when green, checkpoint always — and only stop for true external blockers (credentials, legal boundaries).

**Canonical workspace:** `/Users/ladaj/Developer/AssociateOnDemand`  
**Branch:** `cursor/phase0-foundation`  
**Production:** Web `https://aod-next.vercel.app` · API `https://associateondemand-api.fly.dev`

---

## Session start (every run)

1. Read [`CHECKPOINT.md`](../../CHECKPOINT.md) — **Next step** is your primary task.
2. Read this runbook and [`agent-checkpoint-protocol.md`](./agent-checkpoint-protocol.md).
3. `git pull origin cursor/phase0-foundation`
4. Skim latest lines in `activity_log.md` (append-only).
5. Run `bash scripts/smoke-production.sh` — note failures to fix first.

---

## Operating principles

1. **Functional over perfect.** Prefer a small working slice over a large design doc.
2. **Work around permissions.** If blocked on email/auth keys, build everything else: tests, UX, API stubs, docs, graceful fallbacks.
3. **Never fake success.** If smoke fails, fix or document the blocker in CHECKPOINT **Blockers**.
4. **BUILD_SPEC is the backlog.** Use [`BUILD_SPEC-GAP-AUDIT.md`](../constitution/BUILD_SPEC-GAP-AUDIT.md) for remaining partial items; close code-only gaps without asking.
5. **Checkpoint before stopping.** Update CHECKPOINT, commit, push, deploy when tests pass.

---

## Cadence vs attorney response

| Attorney activity | Agent focus |
|-------------------|-------------|
| **Silent 3+ days** | Full sweep: gap audit → implement highest-impact items → test → deploy → CHECKPOINT |
| **Responded within 48h** | Prioritize their last message; one focused slice; lighter deploy |
| **Blocked on credentials** | Document exact fix in CHECKPOINT; implement everything that does not need those keys |

---

## Pre-authorized (do without asking)

Per [`overnight-agent-permissions.md`](./overnight-agent-permissions.md), plus:

- Fix bugs, add tests, improve UX, wire Airtable reads/writes (no mass delete)
- `git commit`, `git push` on `cursor/phase0-foundation`
- `flyctl deploy -a associateondemand-api` and `vercel deploy --prod` **after** pytest + Next build pass
- `bash scripts/smoke-production.sh` and `bash scripts/checkpoint.sh "…" --push`

---

## Still requires the attorney

- Supabase/Resend SMTP setup, password resets, creating auth users
- New API keys (Midpage, Fastcase, AWS Textract, Qdrant cloud)
- Force-push, hard reset, deleting Airtable rows
- Committing `.env` / secrets
- Merging PR #1 to `main` (unless explicitly requested)
- `AOD_PII_TIER=1` or client PII uploads without review

---

## Standard work loop (repeat until timebox or done)

```
pull → smoke → pick 1–3 tasks from CHECKPOINT Next step / gap audit
     → implement → pytest + npm run build
     → smoke-production → deploy if green
     → checkpoint.sh --push → update CHECKPOINT Next step
```

**Priority order when Next step is empty:**

1. Production smoke failures  
2. BUILD_SPEC gap audit items marked partial (code-only)  
3. Associate panel / matter workbench UX polish  
4. Test coverage for agents and intake  
5. Stale docs (CHECKPOINT, gap audit, FILE-MAP)

---

## Deliverables each run

- At least one **merged-quality commit** (or explicit “nothing safe to ship” with reason)
- Updated **CHECKPOINT.md** (`Last completed`, `Next step`, `Blockers`)
- One **activity_log.md** append line
- If deployed: note URLs and commit hash in CHECKPOINT

---

## Invoke manually

In Cursor chat:

> Continue the AOD Continuation Agent protocol. Read CHECKPOINT and docs/runbooks/continuation-agent.md. Work until the next checkpoint is pushed and deployed.

Or schedule: **Cursor Automation** “AOD Firm OS — Continuation Agent” (Mon/Thu 9:00 local).

---

## Related

- [agent-checkpoint-protocol.md](./agent-checkpoint-protocol.md)  
- [overnight-agent-permissions.md](./overnight-agent-permissions.md)  
- [BUILD_SPEC gap audit](../constitution/BUILD_SPEC-GAP-AUDIT.md)
