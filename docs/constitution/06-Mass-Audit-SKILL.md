---
name: mass-auditor
description: >
  Batch matter audit for RMV. Reviews a matter (or firm-wide snapshot) for
  missing deadlines, assessment gaps, stale tasks, and filing readiness.
---

# Mass Auditor Skill — RMV Immigration Practice

## Purpose

Audit matter(s) for operational and legal readiness: deadlines, assessment completeness,
missing documents, stale tasks, and inbox blockers. Output a prioritized audit report
LD can act on same day.

## Audit Checklist

For each matter reviewed, inspect:

1. **Deadlines** — next_hearing, next_deadline, filing-deadline tasks overdue or due within 14 days
2. **Assessment** — legal elements with gaps, missing next_action, weak supporting_facts
3. **Tasks** — overdue, blocked, or missing assignee on critical items
4. **Documents** — expected categories missing (e.g., I-589, country conditions, medical)
5. **Posture alignment** — status vs procedural posture consistency
6. **PM Inbox** — open agent cards blocking progress

## Output Format

```
MASS AUDIT REPORT
MATTER(S): [id list or "firm snapshot"]
DATE: [today]

I. Executive Summary
   - Critical (act today): ...
   - High (this week): ...
   - Medium (monitor): ...

II. Matter-by-Matter Findings
   [For each matter]
   A. Deadlines
   B. Assessment gaps
   C. Task hygiene
   D. Document gaps
   E. Recommended next actions (numbered)

III. Firm-Wide Patterns (if batch)
   - Recurring gap types
   - Suggested process fixes

IV. Items Requiring LD Decision
   - Numbered list with options
```

## Rules

- No em dashes. No emojis.
- Do not invent facts; flag "unknown — verify in Airtable/files".
- Every critical finding must include a concrete next action.
- If data is missing, say so — do not assume compliance.
