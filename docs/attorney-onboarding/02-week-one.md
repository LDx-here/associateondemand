# Week one — tasks, notes, and case assessment

After completing [day one](./01-day-one.md), use the app for daily matter work:

## CRUD workflow

1. Open a matter → **Next Steps** tab.
2. **Add a task** with due date and priority; mark filing-deadline tasks when applicable.
3. **Complete a task** — the system writes a timeline note automatically.
4. **Compose a note** — blur the textarea to see regex-based task suggestions (`follow up`, `deadline`, `schedule`, etc.).
5. Accept a suggested task or save the note alone.

## Deadlines & assessment

1. **Overview** tab → update **Next filing deadline** via the date picker.
2. **Case Assessment** tab → fill sections A–C per `docs/Case_Assessment_Template.md`.
3. Click **Send to Command Panel** on an immediate action or legal-element next step — the right dock pre-fills for Airtable search.

## Command Panel (search only)

- Try matter IDs: `AOD-1001`
- Try natural queries: `due this week`
- AI agent routing is Phase 4; this panel does not call Harvey or external LLMs.

## Live Airtable

When `AIRTABLE_PAT` and `AIRTABLE_BASE_ID` are set, writes persist to your base. Required tables: Matters, Tasks, Notes, Legal Elements (Documents optional). Add a **Case Assessment** long-text field on Matters for JSON storage.

See `docs/pivot/AssociateOnDemand: Airtable-as-Backend Schema Design.md` for field names (must match `web/src/lib/airtable-fields.ts` or update that file).
