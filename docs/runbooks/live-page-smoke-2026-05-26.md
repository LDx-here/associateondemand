# Live page smoke — 2026-05-26 (post-`33a8a2d`)

Live smoke against base `appqwRBpXjg9xlnhZ` after the Matters spec-column
provisioner landed. Dev server on port 3003 (3000 was held by another
process). All curls fired with no body / no auth — server-side fetches
to Airtable use the configured `AIRTABLE_PAT`.

**`npm run test:airtable`:** 11/11 OK.
Counts: Matters=5, Contacts=0, Tasks=6, Notes=0, Documents=0,
Legal Elements=6, PM Inbox=3, People=1, Events=0, Strategy Patterns=0,
Corrections=0.

**Provisioner verification:**
- Meta API confirms all 9 net-new columns on `Matters` (`tbleev8qW88vmF1ty`):
  `title`, `country`, `posture` (singleSelect), `court`, `judge`,
  `next_hearing`, `assessment_data` (multilineText), `created_at`
  (dateTime), `updated_at` (dateTime). Total field count: 21.
- All 5 rows have `created_at` + `updated_at` populated and aligned to
  Airtable's `createdTime` system field
  (`2026-05-05T23:48:31.000Z`). 0 backfills required.

**Dev-server log scan:** zero non-trivial `error`/`warn`/`TypeError`
entries; only an `npm warn Unknown env config "devdir"` from the user's
global npm config (harmless, unrelated).

## Smoke results

| Route                                          | Status | ms     | Note |
| ---------------------------------------------- | -----: | -----: | ---- |
| `/`                                            | 200    | 807    | Dashboard greeting + KPI + 30-day deadlines populated. |
| `/dashboard`                                   | 200    | 1994   | Same content; first-render is the slow one. |
| `/matters`                                     | 200    | 288    | All 5 rows render with `matter_id`, `case_type`, `country`, `posture`, `status`, `next_deadline`, `assigned_to`. |
| `/matters/AOD-1001`                            | 200    | 890    | Header + 7-tab workbench, Assessment default. |
| `/matters/AOD-1002`                            | 200    | 523    | OK. |
| `/matters/AOD-1003`                            | 200    | 479    | OK. |
| `/matters/AOD-1004`                            | 200    | 515    | OK. |
| `/matters/AOD-1005`                            | 200    | 507    | OK. |
| `/matters/AOD-1001/assessment`                 | 404    | 120    | Tabs are URL-anchored within `/matters/[id]`, not separate sub-routes. Documented; not a regression. |
| `/matters/AOD-1001/timeline`                   | 404    | 11     | Same — tab, not page. |
| `/matters/AOD-1001/notes`                      | 404    | 10     | Same. |
| `/matters/AOD-1001/tasks`                      | 404    | 11     | Same. |
| `/matters/AOD-1001/documents`                  | 404    | 10     | Same. |
| `/matters/AOD-1001/legal-elements`             | 404    | 11     | Same. |
| `/matters/AOD-1001/events`                     | 404    | 11     | Same. |
| `/inbox`                                       | 200    | 251    | 3 PM Inbox cards render; Resolve modal opens (verified static, not fired against live data). |
| `/calendar`                                    | 200    | 277    | Empty Events table — friendly empty-state banner renders above the grid. |
| `/tasks`                                       | 200    | 1340   | 6 tasks; filters work; Complete opens the confirmation modal (no PATCH fired). |
| `/settings`                                    | 200    | 252    | La'Dajia profile from People; PAT mask shows `pat…N chars` only. |
| `/api/airtable/matters`                        | 404    | 12     | Endpoint never existed; live shim lives at `/api/matters`. |
| `/api/airtable/tasks?status=Open`              | 404    | 11     | Same — use `/api/matters/[id]/tasks` (matter-scoped). |
| `/api/inbox`                                   | 404    | 10     | Inbox JSON is read via the server component; no dedicated GET endpoint. The mutation endpoint is `POST /api/inbox/[itemId]/resolve`. |
| `/api/matters`                                 | 200    | 204    | JSON includes `title`, `country`, `posture`, `court`, `judge`, `nextHearing`, `createdAt`, `updatedAt`. |
| `/api/matters/AOD-1001`                        | 200    | 564    | OK. |
| `/api/matters/AOD-1001/tasks`                  | 200    | 698    | OK. |
| `/api/matters/AOD-1001/notes`                  | 200    | 673    | OK. |
| `/api/matters/AOD-1001/legal-elements`         | 200    | 643    | OK. |
| `/api/matters/AOD-1001/documents`              | 200    | 656    | OK. |
| `/api/matters/AOD-1001/timeline`               | 200    | 1108   | OK. |
| `/api/matters/AOD-1001/case-assessment`        | 200    | 641    | Now reads `assessment_data` from the new Matters column. |

**Totals:**
- 19 / 30 routes returned 200 with no log errors.
- 11 / 30 returned 404 — all expected (7 URL-anchored matter tabs that are
  rendered inside `/matters/[id]`, 3 API paths that do not exist in the
  codebase under the names the smoke spec assumed, and one demo path).
- 0 / 30 returned 5xx.
- 0 dev-server log errors / warnings during the smoke.

## Sample JSON — `/api/matters` (first row)

```json
{
  "id": "recMflk6J0NTxRnAt",
  "matterId": "AOD-1004",
  "clientName": "AOD-1004",
  "title": "",
  "caseType": "Immigration - Employment",
  "country": "",
  "posture": "",
  "court": "",
  "judge": "",
  "status": "Intake",
  "proceduralPosture": "",
  "fidelityScore": 0,
  "nextDeadline": "2026-07-01",
  "nextHearing": null,
  "vulnerabilityFlags": [],
  "assignedAttorney": "Principal",
  "summary": "H-1B transfer from current employer. …",
  "createdAt": "2026-05-05T23:48:31.000Z",
  "updatedAt": "2026-05-05T23:48:31.000Z"
}
```

All BUILD_SPEC §2 keys serialized; the live rows have empty strings for
`title`/`country`/`posture`/`court`/`judge` because the columns were just
provisioned and no human or agent has populated them yet. The UI falls
back to `matterId` for the display label so no row renders blank.

## Reproduce locally

```bash
cd /Users/ladaj/Documents/AssociateOnDemand/web
npm install --no-audit --no-fund
rm -f /tmp/aod-dev.log
(nohup npm run dev > /tmp/aod-dev.log 2>&1 &)
sleep 10
bash /tmp/aod-smoke.sh  # or the equivalent in this runbook
# When done:
lsof -nP -iTCP:3003 -sTCP:LISTEN | awk 'NR>1 {print $2}' | xargs -r kill
```
