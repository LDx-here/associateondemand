# Day one — confirm the system is alive

1. Run `docker compose up -d` from the repo root; open http://localhost:8000/health (JSON with `"status": "ok"`).
2. Run `cd web && npm install && npm run dev`; open http://localhost:3000.
3. Open **Dashboard** — you should see matters (demo data until Airtable is configured).
4. Without `AIRTABLE_PAT` in `web/.env.local`, a yellow banner reads: **Demo data — add AIRTABLE_PAT to web/.env.local**.
5. Click a matter — tabs Overview, Timeline, Case Assessment, etc.
6. Park narrative notes in `brain/01_Cases/<your-matter>/` until batch ingest (Phase 3).

---

## Airtable base setup (live data)

Create one base (e.g. **AssociateOnDemand Master**) with the tables and **exact field names** below. The web app reads these labels via `web/src/lib/airtable-fields.ts` — typos or renames will break queries until you update that file.

Reference: [`docs/pivot/AssociateOnDemand: Airtable-as-Backend Schema Design.md`](../pivot/AssociateOnDemand:%20Airtable-as-Backend%20Schema%20Design.md).

### Checklist — Matters table

Table name: **Matters**

| Field name | Type | Notes |
| --- | --- | --- |
| Matter ID | Auto number | Primary display; app shows as case ID |
| Client Name | Single line text | Plain text client name (demo seed uses text, not linked Contacts) |
| Case Type | Single select | e.g. Personal Injury, General Asylum, Family-Based |
| Status | Single select | e.g. Intake, In Progress, Pending Filing, Closed |
| Procedural Posture | Single line text | Current procedural stage |
| Fidelity Score | Number | 0–100 case strength score |
| Next Deadline | Date | Next critical date |
| Vulnerability Flags | Multiple select | e.g. Approaching SOL, Missing Evidence |
| Assigned Attorney | Collaborator | Responsible attorney |
| Summary | Long text | Short matter summary (workbench Overview) |
| Case Assessment | Long text | AI / attorney assessment narrative |

### Checklist — Tasks table

Table name: **Tasks**

| Field name | Type | Notes |
| --- | --- | --- |
| Matter Link | Link to **Matters** | Required — links task to a matter |
| Task Name | Single line text | Short action description |
| Status | Single select | e.g. To Do, In Progress, Blocked, Done |
| Due Date | Date | Task deadline |
| Priority | Single select | e.g. Low, Medium, High (optional values OK) |
| Assigned To | Collaborator | Owner |
| AI Trigger | Checkbox | Marks automation-eligible tasks |

### Checklist — Notes table

Table name: **Notes**

| Field name | Type | Notes |
| --- | --- | --- |
| Matter Link | Link to **Matters** | Required |
| Content | Long text | Note body / timeline entry |
| Author | Single line text | Who wrote the note |
| Date | Date (include time) | When the note was created |
| Type | Single select | e.g. Client Call, Court Update, AI Assessment |
| Requires Action | Checkbox | Prompts follow-up task suggestions |

### Checklist — Legal Elements table

Table name: **Legal Elements**

| Field name | Type | Notes |
| --- | --- | --- |
| Matter Link | Link to **Matters** | Required |
| Legal Element | Single select | e.g. One-Year Filing Deadline, Persecution, Damages |
| Extracted Fact | Long text | Fact supporting the element |
| Status | Single select | e.g. Proven, Disputed, Missing |

### Checklist — Documents table

Table name: **Documents**

| Field name | Type | Notes |
| --- | --- | --- |
| Matter Link | Link to **Matters** | Required |
| Title | Single line text | Document title |
| Category | Single select | e.g. Pleadings, Evidence, Correspondence |
| Uploaded At | Date (include time) | Upload timestamp |

### Wire credentials

1. Copy `web/.env.local.example` → `web/.env.local`.
2. Create an Airtable [personal access token](https://airtable.com/create/tokens) with `data.records:read` (and `write` if you will create records from the app).
3. Set in `web/.env.local`:
   - `AIRTABLE_PAT=pat…`
   - `AIRTABLE_BASE_ID=app…` (from the base URL)
4. Restart `npm run dev`. The demo banner should disappear; sidebar shows **Airtable live**.
5. Smoke test: `cd web && npm run test:airtable` — expect `Airtable reachable. Sample record count: N`.

If `web/.env.local` is missing or PAT/base ID are unset, `npm run test:airtable` exits with: `Missing AIRTABLE_PAT or AIRTABLE_BASE_ID in web/.env.local`.
