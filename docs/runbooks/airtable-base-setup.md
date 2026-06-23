# Airtable Base Setup — AssociateOnDemand

This runbook bootstraps the AssociateOnDemand Airtable base to match
[`BUILD_SPEC.md`](../constitution/BUILD_SPEC.md) Section 2 exactly. Run this
once per base. Field names and select options must match character-for-character.

> **Why this matters.** `web/src/lib/airtable-fields.ts` reads against
> these labels. If the base diverges from this list, `npm run test:airtable`
> fails and the live dashboard falls back to demo data.

## Prerequisites

1. Sign into the Airtable account that owns base `AIRTABLE_BASE_ID` (set in `web/.env.local`).
2. Open the base named **AssociateOnDemand**. If absent, create a new base.
3. Generate a Personal Access Token with scopes `data.records:read`, `data.records:write`, `schema.bases:read`, **and `schema.bases:write`** (the last one is needed to run `scripts/airtable-bootstrap.mjs` programmatically). Add to `web/.env.local` as `AIRTABLE_PAT`. **Never** commit that file.

> **Token format reminder.** A complete Airtable PAT looks like
> `patAbCdEfGh1234567.Ij1234567abcdef0987654321...` — roughly 50+ characters
> with a `.` separator. If the token in `web/.env.local` is only ~17
> characters, it is the *token ID* (the half Airtable shows in the dashboard),
> not the full secret. Re-generate the token at
> <https://airtable.com/create/tokens> and paste the full string.

## Bootstrap

After the PAT is in place, the four BUILD_SPEC tables that the live base is
missing (People, Events, Strategy Patterns, Corrections) can be created
programmatically:

```bash
cd /Users/ladaj/Documents/AssociateOnDemand
node scripts/airtable-bootstrap.mjs
```

The script is idempotent — it lists existing tables first and skips any that
already exist. If the PAT lacks `schema.bases:write` it captures the 403
and prints a fallback message. Use the hand-checklist below in that case.

## Tables to create

For every table below: create the table with the listed primary field first,
then add each remaining column. Field types must match the BUILD_SPEC
notation. Linked Record fields **must** point to the named target table —
create the target table first if you hit a missing-link error.

> **Tier-0 PII rule.** None of these tables store client legal names while
> `AOD_PII_TIER=0`. Use anonymized labels in `Matters.title` and
> `Contacts.display_name` until the Presidio gate is flipped on.

### 1. Matters

Primary: `matter_id` (Single line text) — format `IMM-YYYY-NNN` or `AOD-YYYY-NNN`.

| Field | Type | Notes |
|------|------|------|
| matter_id | Single line text | Primary |
| title | Single line text | No client PII at Tier 0 |
| case_type | Single select | Asylum/Withholding/CAT, Cancellation, Adjustment/Waiver, Employment-Based, Other |
| country | Single line text |  |
| posture | Single select | Removal Defense, Affirmative, BIA Appeal, Petition for Review, USCIS Application, Pre-Litigation, Closed |
| status | Single select | Active, Pending, On Hold, Closed |
| assigned_to | Linked Record → People |  |
| court | Single line text |  |
| judge | Single line text |  |
| opened_date | Date |  |
| next_hearing | Date | Nullable |
| next_deadline | Date | Nullable; auto-derived from Tasks via formula or rollup |
| summary | Long text |  |
| assessment_data | Long text | JSON blob for case-assessment table |
| created_at | Created time |  |
| updated_at | Last modified time |  |

### 2. Contacts

Primary: `contact_id` (Autonumber).

| Field | Type | Notes |
|------|------|------|
| contact_id | Autonumber | Primary |
| display_name | Single line text | Anonymized at Tier 0 |
| role | Single select | Client, Derivative, Witness, Expert, Opposing Counsel, Co-Counsel, Judge, USCIS Officer, Other |
| email | Email |  |
| phone | Phone |  |
| address | Long text |  |
| linked_matters | Linked Record → Matters |  |
| notes | Long text |  |
| created_at | Created time |  |

### 3. Tasks

Primary: `task_id` (Autonumber).

| Field | Type | Notes |
|------|------|------|
| task_id | Autonumber | Primary |
| matter_id | Linked Record → Matters |  |
| description | Long text |  |
| due_date | Date | Nullable |
| assigned_to | Linked Record → People |  |
| status | Single select | Open, In Progress, Complete |
| priority | Single select | High, Medium, Low |
| is_filing_deadline | Checkbox |  |
| created_from_note | Linked Record → Notes | Nullable |
| created_from_agent | Single line text |  |
| completed_at | Date | Nullable |
| completed_by | Linked Record → People | Nullable |
| completion_docs | Long text |  |
| completion_note | Long text |  |
| created_at | Created time |  |

### 4. Notes

Primary: `note_id` (Autonumber).

| Field | Type | Notes |
|------|------|------|
| note_id | Autonumber | Primary |
| matter_id | Linked Record → Matters |  |
| author | Linked Record → People |  |
| content | Long text | Rich text |
| type | Single select | Manual, System, Agent, Correction |
| is_correction | Checkbox |  |
| created_at | Created time |  |

### 5. Legal Elements

Primary: `element_id` (Autonumber).

| Field | Type | Notes |
|------|------|------|
| element_id | Autonumber | Primary |
| matter_id | Linked Record → Matters |  |
| element_name | Single line text | e.g., Past Persecution, Well-Founded Fear |
| assessment | Single select | Strong, Moderate, Weak, At Risk, Unknown, Not Applicable |
| key_gap | Long text |  |
| next_action | Long text | Promptable action surfaced in Assessment tab |
| supporting_facts | Long text |  |
| supporting_cases | Long text |  |
| notes | Long text |  |
| last_updated_by | Single line text |  |
| updated_at | Last modified time |  |

### 6. Documents

Primary: `doc_id` (Autonumber).

| Field | Type | Notes |
|------|------|------|
| doc_id | Autonumber | Primary |
| matter_id | Linked Record → Matters | Nullable for firm-wide docs |
| title | Single line text |  |
| category | Single select | Intake, Evidence, Court Filing, Medical Record, Correspondence, Legal Research, Firm Knowledge, Template, Other |
| practice_area | Single select | Asylum/Withholding/CAT, Cancellation, Adjustment/Waivers, Employment-Based, General, Firm Operations |
| file_path | URL | Google Drive or local |
| file_type | Single line text | pdf, docx, jpg, ... |
| tags | Multiple select |  |
| uploaded_by | Linked Record → People |  |
| ocr_status | Single select | Pending, Complete, Failed, Not Applicable |
| pii_tier | Single select | Tier 0 (no PII processed), Tier 1 (anonymized), Tier 2 (controlled) |
| created_at | Created time |  |

### 7. Events

Primary: `event_id` (Autonumber).

| Field | Type | Notes |
|------|------|------|
| event_id | Autonumber | Primary |
| matter_id | Linked Record → Matters |  |
| type | Single select | Hearing, Filing Deadline, Internal Deadline, Reminder, Court Date |
| date | Date |  |
| time | Single line text |  |
| description | Long text |  |
| location | Single line text |  |
| calendar_synced | Checkbox |  |
| google_calendar_id | Single line text |  |
| created_at | Created time |  |

### 8. People

Primary: `person_id` (Autonumber).

| Field | Type | Notes |
|------|------|------|
| person_id | Autonumber | Primary |
| name | Single line text |  |
| role | Single select | Attorney, Caseworker, Paralegal, AI Associate, Admin |
| email | Email |  |
| is_active | Checkbox |  |

Seed at least one People record for `La'Dajia Ferguson` (Attorney, `is_active = true`).

### 9. PM Inbox

Primary: `inbox_id` (Autonumber).

| Field | Type | Notes |
|------|------|------|
| inbox_id | Autonumber | Primary |
| matter_id | Linked Record → Matters |  |
| agent | Single line text |  |
| what_tried | Long text |  |
| what_needed | Long text |  |
| options | Long text |  |
| status | Single select | Unread, Read, Resolved, Dismissed |
| resolution | Long text |  |
| created_at | Created time |  |
| resolved_at | Date |  |

### 10. Strategy Patterns

Primary: `pattern_id` (Autonumber).

| Field | Type | Notes |
|------|------|------|
| pattern_id | Autonumber | Primary |
| fact_pattern | Long text |  |
| matching_matters | Linked Record → Matters |  |
| strategy_used | Long text |  |
| outcome | Single select | Granted, Denied, Pending, Withdrawn, Settled, Unknown |
| confidence | Number (integer 1–10) |  |
| correction_note | Long text |  |
| created_by | Linked Record → People |  |
| created_at | Created time |  |

### 11. Corrections

Primary: `correction_id` (Autonumber).

| Field | Type | Notes |
|------|------|------|
| correction_id | Autonumber | Primary |
| matter_id | Linked Record → Matters |  |
| agent | Single line text |  |
| original_output | Long text |  |
| attorney_edit | Long text |  |
| correction_type | Single select | Factual, Classification, Convention, Analytical, False Positive, False Negative |
| reason | Long text |  |
| applied_to | Single select | firm-rules.md, Strategy Patterns, categorizer-examples.jsonl, Notes only |
| created_at | Created time |  |

## Seed data

After tables exist, create three demo matters that mirror `data/dev-seed.json`:

| matter_id | title | case_type | country | posture | status | assigned_to |
|-----------|-------|-----------|---------|---------|--------|-------------|
| AOD-1001 | Country conditions intake | Asylum/Withholding/CAT | Guatemala | Affirmative | Active | La'Dajia Ferguson |
| AOD-1002 | EOIR continue motion | Cancellation | Mexico | Removal Defense | Pending | La'Dajia Ferguson |
| AOD-1003 | I-485 medical exam | Adjustment/Waiver | Philippines | USCIS Application | Active | La'Dajia Ferguson |

## Verify

```bash
cd web
npm run test:airtable
```

Expected output: `Airtable reachable. Sample record count: 3` (or however many you seeded).

If the smoke test fails with `INVALID_PERMISSIONS_OR_MODEL_NOT_FOUND`, the table name or PAT scope is wrong — re-check the table is **Matters** (case-sensitive) and the PAT has `data.records:read` for this base.

If you have not yet built the schema, run `npm run dev` and the dashboard will continue serving from `data/dev-seed.json` (banner: "Demo data — add AIRTABLE_PAT to web/.env.local").

## After setup

1. Set `AIRTABLE_PAT` and `AIRTABLE_BASE_ID` in `web/.env.local` (already present this session).
2. `npm run test:airtable` should return a non-zero sample record count.
3. The dashboard will switch off demo mode automatically the next time it renders.
4. Once `airtable-fields.ts` migrates to BUILD_SPEC field names (planned follow-up), the wider 11-table schema will become readable from the UI.
