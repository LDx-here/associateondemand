# Matters metadata backfill

Idempotent script: [`scripts/airtable-matters-metadata-backfill.mjs`](../../scripts/airtable-matters-metadata-backfill.mjs)

## Run

```bash
cd /Users/ladaj/Documents/AssociateOnDemand
node scripts/airtable-matters-metadata-backfill.mjs          # apply
node scripts/airtable-matters-metadata-backfill.mjs --dry-run  # preview only
cd web && npm run test:airtable   # expect 11/11
```

Verify titles in API:

```bash
curl -s http://localhost:3000/api/matters | jq '.matters[] | {matterId, title, country, posture}'
```

## Rules

- Never writes client names (BUILD_SPEC §13.4).
- Skips fields already populated.
- `title`: anonymized from `case_type` + `matter_id` (e.g. `Asylum defense — AOD-1001`).
- `country`: from backup JSONL context map only when the live `country` field is empty.
- `posture`: inferred from `case_type`, `status`, and `summary` (immigration practice defaults).
- `court`: only when `summary`/`case_type` mentions EOIR, USCIS, BIA, etc.
- `judge` / `next_hearing`: never invented.
- `updated_at`: bumped on any row that receives at least one new field.
