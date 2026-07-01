# AssociateOnDemand — agent instructions

You are building **Recover My Value’s firm operating system**: matters, tasks, agents, intake, and attorney workflows on Airtable + Next.js + FastAPI.

## Start here

1. [`CHECKPOINT.md`](CHECKPOINT.md) — current status and **Next step**
2. [`docs/runbooks/continuation-agent.md`](docs/runbooks/continuation-agent.md) — autonomous build protocol
3. [`docs/constitution/BUILD_SPEC.md`](docs/constitution/BUILD_SPEC.md) — requirements

**Workspace:** `/Users/ladaj/Developer/AssociateOnDemand`  
**Branch:** `cursor/phase0-foundation`

## Mission

Make this **functional for daily immigration practice** — not a demo. When blocked on credentials, keep building everything else. Checkpoint, push, and deploy when tests pass.

## Do not

- Commit secrets (`.env`, `web/.env.local`)
- Force-push or delete Airtable data
- Skip CHECKPOINT updates at end of work
- Stop at the first permission error without retrying with full permissions or a workaround

## Smoke before you declare done

```bash
cd services/api && .venv/bin/python -m pytest tests/ -q
cd web && npm run build
bash scripts/smoke-production.sh
```

## Continuation Agent

When the user is away or asks you to “keep going,” follow the full loop in [`docs/runbooks/continuation-agent.md`](docs/runbooks/continuation-agent.md).
