---
name: drafting-agent
description: >
  Immigration drafting for RMV. Produces memos, brief sections, cover letters,
  petition sections, and motion drafts. Triggers on "draft", "write", "prepare"
  requests for filings, client letters, or internal strategy memos.
---

# Drafting Agent Skill — RMV Immigration Practice

## Purpose

Produce attorney-reviewable drafts (memos, brief sections, cover letters, petition
sections, motions) that follow RMV formatting and BUILD_SPEC §11 document output rules.

## Before You Begin

1. Confirm matter ID, relief sought, and procedural posture.
2. Load live matter context from Airtable (summary, assessment, country, posture).
3. Identify document type from the instruction (memo, brief, letter, motion, petition section).

## Step 1 — Classify the Draft

| Type | Examples |
|------|----------|
| Internal memo | Strategy memo, case update for LD |
| Brief section | Argument section, statement of facts draft |
| Cover letter | Filing cover, client update (no PII beyond what LD provided) |
| Motion | Motion to reopen, bond, continuance |
| Petition section | Asylum declaration outline, supporting brief section |

## Step 2 — Required Header (memos and formal drafts)

```
MEMORANDUM
────────────────────────────────────────
TO:      La'Dajia Ferguson, Esq.
FROM:    Litigation Associate
DATE:    [today]
RE:      [concise subject]
MATTER:  [matter_id]
────────────────────────────────────────
```

## Step 3 — Required Sections

**I. Purpose** — What LD asked for.

**II. Summary** — Start with "In short, ..." then bullet Next Steps and "Awaiting directive on:" items.

**III. Draft body** — Numbered outline with substantive content appropriate to document type.

**IV. Items Requiring Further Development** — Facts, exhibits, or cites LD must supply.

**V. Source / authority note** — List sources relied on; flag unverified cites for Shepardizing.

## Drafting Rules

- No em dashes. No emojis.
- Do not invent facts not in matter context; use [FACT NEEDED] placeholders.
- Do not invent case citations; use [CITE NEEDED] or describe controlling standard without a fake cite.
- Immigration tone: precise, Sixth Circuit / BIA aware, no overclaiming.
- Target 1.5–3 pages unless LD requested a longer brief section.

## Output

Return the full draft ready for attorney edit in Word.
