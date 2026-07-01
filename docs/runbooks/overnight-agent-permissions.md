# Overnight agent permissions (pre-authorized)

Attorney pre-authorized **2026-05-26** for background agents on AssociateOnDemand.

## When Cursor shows a permission dialog — choose:

| Prompt type | Action |
|-------------|--------|
| **Network / full_network** | **Allow** (or "Always allow" for this workspace) |
| **Git write** | **Allow** |
| **Run outside sandbox / all** | **Allow** — needed for `npm`, `git push`, Airtable API, Docker |

Agents are instructed to retry with full permissions rather than stopping.

## Pre-authorized operations

- `npm install`, `npm run build`, `npm run dev` (background)
- `node scripts/airtable-*.mjs`, `node scripts/smoke-*.mjs`
- `git add`, `git commit`, `git push` on `cursor/phase0-foundation`
- `./scripts/checkpoint.sh "..." --push`
- `docker compose up -d --build`, `curl localhost:8000/health`
- Edit any file under the repo except secrets
- Call `api.airtable.com`, Anthropic API (keys already in gitignored `.env` files)
- **`flyctl deploy -a associateondemand-api`** and **`vercel deploy --prod`** when pytest + Next build + smoke-production pass (Continuation Agent)

## Continuation Agent

Follow [continuation-agent.md](./continuation-agent.md). Runs manually (“keep going”) or on schedule. Goal: functional firm OS — implement, test, deploy, checkpoint.

## Still requires the attorney (not auto)

- Force-push, hard reset, delete Airtable data
- Commit `.env` or `web/.env.local`
- Flip `AOD_PII_TIER=1` or upload client PII without review
- Production deploy (Vercel/Fly) when tests + smoke pass — **pre-authorized for Continuation Agent**
- Clerk/Supabase **account/SMTP setup** (not deploy)
- Revoke or rotate API keys in chat

## Keep agents running overnight

- Leave **Cursor open**; disable Mac sleep on power adapter if possible.
- Do not revoke the Airtable PAT until morning.
