# Google Sheets setup — AssociateOnDemand data store

AssociateOnDemand can use a **Google Spreadsheet** (Google Workspace) instead of Airtable for firm data. Phase 1 migrates **Matters** and **Notes**; other tabs are scaffolded for Phase 2.

## Why Google Sheets

| | Airtable | Google Sheets |
|---|----------|---------------|
| Billing | Paid API tiers; low monthly call limits on free plans | Generous Sheets API quota (300 read/min/project) |
| Export | CSV via API | Native CSV/XLSX export, sort/filter in Sheets |
| Visibility | Separate base UI | Spreadsheet URL in Settings — attorneys see the source |
| Autonomous ops | SSR + agents burned quota while idle | Service account + shared sheet; no per-seat API billing |

## Prerequisites

- Google Cloud project with **Google Sheets API** enabled
- Service account JSON key
- A Google Spreadsheet shared with the service account email (`Editor`)

## Automated setup (recommended)

If you have the Google Cloud CLI on your Mac:

```bash
# One-time browser login (pick your Google Workspace account)
gcloud auth login

# Creates GCP project, service account, key, spreadsheet, and web/.env.local entries
bash scripts/setup-google-sheets.sh
```

Secrets stay on disk under `.secrets/` (gitignored) and in `web/.env.local` (gitignored). For **Vercel Production**, add `GOOGLE_SHEETS_SPREADSHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_JSON` (full JSON one line), and optional `DATA_STORE=google_sheets` in the dashboard — do not paste JSON in chat.

---

## Step 1 — Create the spreadsheet

1. In Google Drive, create a spreadsheet named **AssociateOnDemand — Firm Data**.
2. Add tabs (sheet names must match exactly):

| Tab name | Purpose (Phase) |
|----------|-----------------|
| `Matters` | **Phase 1** — matter list + detail |
| `Notes` | **Phase 1** — matter notes, facts, agent output |
| `Tasks` | Phase 2 |
| `Documents` | Phase 2 |
| `Legal Elements` | Phase 2 |
| `PM Inbox` | Phase 2 |
| `Contacts` | Phase 2 |
| `Events` | Phase 2 |
| `Strategy Patterns` | Phase 2 |
| `Corrections` | Phase 2 |
| `People` | Phase 2 |

3. **Row 1** on each tab must be the header row (copy from below).

### Matters — row 1 headers

```
row_id	matter_id	title	case_type	country	posture	court	judge	status	assigned_to	next_deadline	next_hearing	summary	created_at	updated_at	lifecycle_stage
```

`lifecycle_stage` (column P) drives the matter-lifecycle task automation (Intake → Active → Filed/Awaiting Decision → Resolution → Closed) — see [`lib/matter-lifecycle-stage.ts`](../../web/src/lib/matter-lifecycle-stage.ts). If this column is missing, new matters just default to Intake in the app; no error. **Google Sheets-only** — the stage control is disabled with an explanatory message when running on Airtable.

`assessment_data` (column Q) holds the structured Case Assessment form as serialized JSON — same shape as Airtable's `assessment_data` field. Missing column just means an empty assessment is returned; no error.

### Tasks — row 1 headers

```
row_id	matter_id	description	status	priority	due_date	assigned_to	is_filing_deadline	created_from_agent
```

`created_from_agent` holds a stable tag (e.g. `stage:Active:imm-medical`) for tasks auto-created by a lifecycle-stage transition, so re-entering a stage never creates duplicates. Manually-added tasks leave it blank.

### Notes — row 1 headers

```
row_id	matter_id	content	author	created_at	type
```

(`row_id` is a stable id like `gs-mat-abc123`; the app generates these on create.)

### Optional seed rows (Matters)

| row_id | matter_id | title | case_type | status |
|--------|-----------|-------|-----------|--------|
| gs-mat-seed1 | AOD-1001 | Sample overflow matter | General Asylum | Open |

## Step 2 — Google Cloud service account

1. [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → **Enable Google Sheets API**.
2. IAM → Service Accounts → **Create service account** (e.g. `aod-sheets@your-project.iam.gserviceaccount.com`).
3. Keys → **Add key** → JSON → download (keep private).
4. Copy the **`client_email`** from the JSON — you will share the spreadsheet with this address.

## Step 3 — Share the spreadsheet

1. Open the spreadsheet → **Share**.
2. Add the service account email → role **Editor**.
3. Copy the spreadsheet ID from the URL:  
   `https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit`

## Step 4 — Environment variables

### Vercel (web app)

| Variable | Value |
|----------|--------|
| `DATA_STORE` | `google_sheets` (optional; auto-detected when Sheets creds present) |
| `GOOGLE_SHEETS_SPREADSHEET_ID` | Spreadsheet ID from URL |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | **Entire** service account JSON as one line (Settings → Environment Variables) |

Do **not** commit the JSON file. For local dev you may use a file path instead:

| Variable | Value |
|----------|--------|
| `GOOGLE_APPLICATION_CREDENTIALS` | Absolute path to `service-account.json` |

### Rollback to Airtable

Set `DATA_STORE=airtable` and keep `AIRTABLE_PAT` + `AIRTABLE_BASE_ID`. Airtable code remains behind the feature flag.

### Fly.io API (Phase 2)

The FastAPI agent layer still writes to Airtable until Phase 2. Matters/Notes on the **web dashboard** work with Sheets only; PM Inbox / agent persistence still need Airtable or demo mode until migrated.

## Step 5 — Verify

```bash
cd web
npm run test:google-sheets   # unit checks (no live API unless creds set)
npm run build
```

1. Open **Settings → Data connection** — should show **Google Sheets** with an **Open spreadsheet** link.
2. Open **Dashboard** and **Matters** — live rows from the `Matters` tab.
3. Open a matter → **Notes** tab — reads/writes the `Notes` tab.

## Export paths

- **In Sheets:** File → Download → CSV / Excel
- **From app:** Settings shows spreadsheet URL; `GET /api/data-source` returns `exportCsvUrl` for automation
- **Per-tab CSV:** In Sheets, use tab menu → copy or download

## Quota notes

Google Sheets API (default): ~300 read requests/minute per project, 60 write/minute — sufficient for SSR + scheduled jobs if you use the built-in 30s read cache. No per-record billing like Airtable.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Demo / sample data | Check env vars on Vercel; redeploy after adding secrets |
| `403` from Google | Share spreadsheet with service account email as Editor |
| Empty Matters list | Confirm `Matters` tab name and header row match exactly |
| Notes not saving | `matter_id` column must match an existing `matter_id` on Matters tab |
| Still hitting Airtable limits | Set `DATA_STORE=google_sheets`; remove or unset `AIRTABLE_PAT` on Vercel to avoid accidental Airtable reads |

## Related

- [`docs/runbooks/airtable-base-setup.md`](./airtable-base-setup.md) — legacy Airtable setup
- [`web/src/lib/google-sheets/schema.ts`](../../web/src/lib/google-sheets/schema.ts) — canonical column headers
