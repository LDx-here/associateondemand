# Agent checkpoint & resume protocol

Use this runbook on **every** agent session for AssociateOnDemand. Goal: work survives laptop close, offline gaps, and handoffs between agents or humans.

## Session start (mandatory)

1. Read [`CHECKPOINT.md`](../../CHECKPOINT.md) at repo root **first**.
2. Read this runbook.
3. `git status` — confirm branch matches checkpoint; pull if remote exists and you are online.
4. Continue from **Next step** in `CHECKPOINT.md` unless the user gave a conflicting instruction (user wins).

## When to checkpoint

Create a checkpoint after **each**:

- Logical milestone (phase sub-step, feature slice, bugfix batch), **or**
- ~30 minutes of active work, **or**
- Before the user goes offline / closes the laptop / ends the session

Do **not** checkpoint unrelated drive-by edits; keep commits scoped to the current milestone.

## Checkpoint steps (in order)

1. **Stage safe files only**
   - `git add` paths for this milestone.
   - **Never** stage or commit: `.env`, `web/.env.local`, `services/api/.env`, any `*.pem`, credentials JSON, or files matching secrets in `.gitignore`.
   - Prefer `./scripts/checkpoint.sh "what you finished"` — it enforces the denylist.

2. **Commit**
   ```bash
   git commit -m "checkpoint: <short description of milestone>"
   ```

3. **Push** (if `origin` exists and network is available)
   ```bash
   git push
   ```
   Or use `./scripts/checkpoint.sh "..." --push`.

4. **Activity log** (append only — ROE)
   - Add **one line** at the top of `activity_log.md` (below any header if present), newest first:
   ```markdown
   ### [YYYY-MM-DD] CHECKPOINT: <same short description>
   ```
   - Do not edit or delete prior entries.

5. **Update `CHECKPOINT.md`**
   - Refresh **Last updated** (date/time).
   - Set **Last completed** to what just finished.
   - Set **Next step** to the very next action.
   - Update **Blockers** if anything changed.
   - Keep **Commands to resume** accurate.

6. **Commit checkpoint metadata** (if not already included)
   - If `CHECKPOINT.md` / `activity_log.md` changed after the checkpoint commit, either amend only when ROE allows, or make a follow-up commit: `checkpoint: update CHECKPOINT.md`.

## Secrets policy

| Never commit | OK to commit |
|--------------|--------------|
| `.env` | `.env.example` |
| `web/.env.local` | `web/.env.local.example` |
| `services/api/.env` | — |
| API keys, PATs, passwords in any file | Public docs, seeds without secrets |

If a secret was staged by mistake: `git reset HEAD <file>`, rotate the credential, add to `.gitignore` if missing.

## Resume after offline

1. Clone or open repo; `git checkout <branch from CHECKPOINT.md>`.
2. `git pull` when online.
3. Read `CHECKPOINT.md` → execute **Commands to resume**.
4. Skim latest `activity_log.md` checkpoint lines for context.

## Helper script

```bash
./scripts/checkpoint.sh "Phase 3: intake batch UI wired"
./scripts/checkpoint.sh "fix airtable timeout" --push
```

The script stages tracked changes (respecting `.gitignore`), refuses forbidden paths, commits with the `checkpoint:` prefix, bumps `CHECKPOINT.md` timestamp, appends one activity-log line, and optionally pushes.

## Cursor rule

`.cursor/rules/project.mdc` requires this protocol on milestone completion. Agents must not skip `CHECKPOINT.md` updates.

## Related

- [Agent ROE](../../Agent%20Rules%20of%20Engagement%20(ROE)%20for%20AssociateOnDemand%20Project.md) — `activity_log.md` append-only
- [local-dev.md](./local-dev.md) — stack bring-up
- [README.md](../../README.md) — phase status table
