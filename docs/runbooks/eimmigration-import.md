# eImmigration import runbook (Tier A)

Tier A is **CSV/JSON file upload** — no browser automation, no eImmigration API credentials required.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/eimmigration/status` | Active tier and supported formats |
| POST | `/eimmigration/import` | Upload CSV or JSON |
| POST | `/api/import/eimmigration` | Alias (same handler) |

Web UI: http://localhost:3000/import/eimmigration

## Supported formats

### CSV

Required columns (aliases accepted):

- `matter_id` / `Matter ID` / `matterId`
- `client_name` / `Client Name`
- `case_type` / `Case Type`
- Optional: `status`, `proceduralPosture`, `nextDeadline`

Example:

```csv
Matter ID,Client Name,Case Type,Status,Next Deadline
AOD-2001,J. Doe,General Asylum,Intake,2026-08-01
```

### JSON

Array of objects, or `{ "records": [ ... ] }`.

```json
[
  {
    "matter_id": "AOD-2002",
    "client_name": "A. Smith",
    "case_type": "Cancellation of Removal",
    "status": "Active"
  }
]
```

## Local test

```bash
curl -F "file=@export.csv" http://localhost:8000/api/import/eimmigration
```

## After import

1. Review `preview` rows in the API response.
2. Map fields to Airtable Matters table (production).
3. Re-seed Pattern Agent: `POST /agents/pattern/seed`
4. Refresh Knowledge Map: `/knowledge-map` or `/api/knowledge-graph`

## Tier B / C (not active)

- **Tier B:** Playwright observe/learn — requires `LEGAL_BOUNDARIES.md` review.
- **Tier C:** Gated browser automation — attorney approval + audit logging.

See `LEGAL_BOUNDARIES.md` before enabling Tier B/C.
