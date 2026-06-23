# Known page errors — live data smoke

Captured every time we run a page-by-page smoke against the live Airtable
base. Each entry pairs the dev-server log excerpt with the fix landed in
the same checkpoint.

## 2026-05-26 — checkpoint 68d0344 follow-up (Matters spec columns)

### Environment notes
Live page smoke was attempted from this agent on 2026-05-26 against the
live Airtable base `appqwRBpXjg9xlnhZ`. The sandbox's outbound HTTPS proxy
denied CONNECT to `api.airtable.com` for the entire session (this is the
default proxy posture once the workspace is moved away from the project
root; the parent agent moved it earlier in this turn). Symptom from any
Node-launched request:

```
matters-columns crashed: Error: GET https://api.airtable.com/v0/meta/...
  curl exit=56: curl: (56) CONNECT tunnel failed, response 403
```

The same `npm run dev` command failed to bind a network socket inside the
sandbox: `NodeError [SystemError]: uv_interface_addresses returned Unknown
system error 1`. Both blockers are sandbox-only and not reproducible from
a normal developer machine.

Mitigation for this checkpoint:
- `scripts/airtable-matters-columns.mjs` runs **outside** the sandbox on
  the dev machine and is idempotent — re-running it later applies the
  schema delta without duplicating columns.
- Static page review was used in place of a live curl smoke; every fix
  below is paired with the build that exercises the changed component
  (`npm run build` passed).
- The next agent that picks this up should re-run the seven curls listed
  below as the first action.

### Pages reviewed statically and changes landed

| Page          | Static check                                                              | Fix landed in this checkpoint                                                                                                                                                  |
| ------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/`           | Dashboard reads `listMatters` + `listAllTasks`, guarded `countUnreadInboxFromAirtable`. | None — already gracefully degrades when Airtable is unreachable.                                                                                                               |
| `/matters`    | Table columns mis-matched BUILD_SPEC §2 — no `title`/`country`/`posture`. | Added BUILD_SPEC columns + posture filter + `aria-label` on filter selects in `web/src/components/MattersTable.tsx`.                                                            |
| `/matters/[id]` | Tabs unchanged from prior checkpoint; `proceduralPosture` now mirrored from `posture`. | `web/src/lib/airtable/queries.ts#mapMatter` now copies `posture` into both `posture` and the legacy `proceduralPosture` field so the workbench header keeps showing it.        |
| `/inbox`      | Resolve modal opens on action-button click; Cancel closes without PATCH.   | None — modal already meets BUILD_SPEC §7.5.                                                                                                                                    |
| `/calendar`   | Empty Events table left the grid rendering with no visual cue.            | Friendly empty-state banner added above the grid in `web/src/components/CalendarBoard.tsx` (both "no events at all" and "no events match filter" cases).                       |
| `/tasks`      | "Complete" button fired a PATCH instantly — no confirmation modal.        | Confirmation modal added in `web/src/components/GlobalTaskList.tsx`; the smoke can open the modal, verify the copy, and click Cancel without writing to Airtable.              |
| `/settings`   | `maskPat` leaked 6 chars of the PAT.                                      | Tightened mask to `pat…N chars` in `web/src/app/(app)/settings/page.tsx` so the only character shown is the constant `pat` prefix.                                              |

### Curls to run from a normal machine after pulling this commit

```bash
cd web && npm run dev > /tmp/aod-dev.log 2>&1 &
sleep 8
for path in / /matters /inbox /calendar /tasks /settings; do
  printf '%-12s ' "$path"
  curl -sS -o /dev/null -w '%{http_code}\n' "http://localhost:3000$path"
done
for matter in $(node -e '
const r = await fetch("http://localhost:3000/api/matters").then(r=>r.json());
console.log(r.matters.map(m=>m.matterId).join("\n"));
' 2>/dev/null); do
  printf '/matters/%s ' "$matter"
  curl -sS -o /dev/null -w '%{http_code}\n' "http://localhost:3000/matters/$matter"
done
```

Expected: all routes return 200 with no `TypeError` / `ReferenceError`
entries in `/tmp/aod-dev.log`. File any new errors as a new section above
this one.
