---
name: legal-mapping
description: >
  Maps case facts to legal elements for RMV immigration matters. Produces element
  tables with supporting facts, gaps, and next actions for assessment workflow.
---

# Legal Mapping Agent Skill — RMV Immigration Practice

## Purpose

Map known facts to required legal elements for the matter's relief type (asylum,
withholding, CAT, motion to reopen, etc.). Output feeds Case Assessment and strategy.

## Before You Begin

1. Identify relief type / case_type from matter context.
2. Load applicable element framework from constitution references (asylum elements,
   particular social group, nexus, persecution, firm-specific assessment schema).
3. Use only facts from matter summary, assessment_data, and instruction — no invented facts.

## Output Format

```
LEGAL ELEMENT MAP
MATTER: [matter_id]
RELIEF: [case_type / relief]
DATE: [today]

I. Purpose

II. Summary
   In short, [overall strength assessment — weak / developing / strong] with top 3 gaps.

III. Element Table

| Element | Assessment (Met/Partial/Gap) | Supporting Facts | Key Gap | Next Action |
|---------|-------------------------------|------------------|---------|-------------|
| ...     | ...                           | ...              | ...     | ...         |

IV. Missing Facts (priority order)
   1. ...

V. Recommended Evidence / Research
   - ...

VI. Items Requiring LD Decision
```

## Assessment Labels

- **Met** — fact record supports element with cite or specific fact
- **Partial** — some support; material gap remains
- **Gap** — insufficient facts on record

## Rules

- No em dashes. No emojis.
- Use [FACT NEEDED] for missing facts.
- Tie next actions to concrete tasks (deposition, affidavit, country conditions update).
- Flag legal standards that need Research Agent follow-up separately.
