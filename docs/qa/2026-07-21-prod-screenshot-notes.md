# QA snapshot — 2026-07-21

Production (`https://aod-next.vercel.app`) requires Supabase sign-in. Unauthenticated requests redirect to `/login` (verified via Vercel-authenticated fetch).

## Observed (unauthenticated)

| Route | State |
|-------|--------|
| `/matters` | Redirect → `/login` — Sign in form |
| `/dashboard` | Redirect → `/login` |
| `/assignments/new` | Redirect → `/login` |

## Local demo screenshots

Run with demo mode for UI capture without Airtable:

```bash
cd web && AOD_FORCE_DEMO_MODE=true npm run dev -- -p 3003
```

Then open:

- http://localhost:3003/matters
- http://localhost:3003/matters/AOD-1001 (Documents tab)
- http://localhost:3003/assignments/new (attachments section — no Tier 0 banner after fix)
- http://localhost:3003/dashboard
- http://localhost:3003/settings (Technical / compliance accordion)

## Issues addressed this pass

1. **Documents missing** — Airtable filter now matches linked matter record id + exact matter code (avoids FIND substring false negatives).
2. **Matters not clickable** — entire table row + title column link to `/matters/[matterId]`.
3. **Tier 0 copy on intake** — moved to Settings; attorney uploads auto-approve tier-0 API headers.
4. **PDF preview** — file type inferred from title when Airtable `file_type` empty; blob preview on fresh upload unchanged.
