# Autonomous agent pass — AssociateOnDemand

Run this on a **schedule** (Cursor Automation + Cloud Agent) or when the attorney has not checked in for a few days.

## Workspace

- Repo: `LDx-here/associateondemand`
- Branch: `cursor/phase0-foundation`
- Path: `/Users/ladaj/Developer/AssociateOnDemand`

## Read first

1. `CHECKPOINT.md` — status, vision, autonomous charter
2. `docs/constitution/BUILD_SPEC-GAP-AUDIT.md` — remaining gaps
3. `LEGAL_BOUNDARIES.md` — do not cross without attorney approval

## Product vision (one line)

Verified **associate marketplace**: client submits assignment + facts + attachments → agents produce deliverable → **attorney verifies** in PM Inbox → export. Template tier vs custom-template tier.

## Priority order (each pass)

1. **Assignment intake UX** — request form: deliverable type, tier, facts, file upload → matter + PM job + inbox
2. **Review workflow** — inbox statuses: Submitted → In progress → Ready for review → Returned / Approved
3. **Template catalog** — list template-ready vs custom-build deliverables
4. **Bug fixes** — anything broken in smoke tests
5. **Tests + docs** — lock in what shipped

## Do without asking the attorney

- Code, UI, API routes, Airtable writers (graceful when PAT missing)
- pytest + Next build + deploy Fly/Vercel when green
- Update `CHECKPOINT.md`

## Stop and document (do not guess)

- Resend / Supabase SMTP (login emails)
- New paid API keys (Midpage, Fastcase, Textract)
- Billing, contractor payouts, bar compliance
- Force-push, delete production data

## End-of-pass checklist

```bash
cd services/api && .venv/bin/python -m pytest tests/ -q
cd web && npm run build
bash scripts/smoke-production.sh
git push origin cursor/phase0-foundation
flyctl deploy -a associateondemand-api
cd web && vercel deploy --prod --yes
```

Record completed items in `CHECKPOINT.md` under **Autonomous pass log**.
