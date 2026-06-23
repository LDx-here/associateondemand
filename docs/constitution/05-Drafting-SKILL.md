---
name: drafting-agent
description: >
  Immigration drafting for RMV. Produces AOS discretionary briefs, memos, cover letters,
  petition sections, and motions. Triggers on "draft", "write", "prepare" requests.
  AOS I-485 briefs auto-run citation verification and build a citation package.
---

# Drafting Agent Skill — RMV Immigration Practice

## Purpose

Produce attorney-reviewable drafts that follow RMV formatting, BUILD_SPEC §11 output rules,
and — for briefs with citations — the **Citation Verification Skill**
(`08-Citation-Verification-SKILL.md`).

## Before You Begin

1. Confirm matter ID, relief sought, and procedural posture.
2. Load live matter context from Airtable (summary, assessment_data, country, posture).
3. Identify document type from the instruction (see classification below).

## Document Types

| Type | Trigger keywords | Output |
|------|------------------|--------|
| **AOS discretionary brief** | aos, i-485, adjustment, PM-602-0199, discretionary factors | Full I-485 memo + citation package |
| Brief section | brief, argument section, memorandum in support | Targeted section with cites |
| Cover letter | cover letter, filing cover | Transmittal letter |
| Motion | motion to/for | Motion draft |
| General memo | default | Internal/strategy memo |

## AOS Discretionary Brief (enhanced workflow)

When drafting an **AOS discretionary factors memorandum**:

1. **Case theme first** — one persuasive sentence threading through Sections IV–V.
2. **Required structure** (PM-602-0199 / 1 USCIS-PM E.8):
   - I. Introduction and Purpose
   - II. Legal Standard (statutory + totality + AOS vs. CP)
   - III. Statutory Eligibility
   - IV. Argument (positive equities → adverse factors → no overwhelming negatives)
   - V. Conclusion
3. **Legal propositions** — use citation-ready language from 1 USCIS-PM E.8 and BIA cases
   (Matter of Arai, Marin, Patel, Edwards, Mendez-Morales). Do not paraphrase controlling quotes.
4. **Factor framework** — for each equity: Authority → Legal principle → Facts → Evidence →
   Government argument → Rebuttal → Weight.
5. **Bracket placeholders** — `[FACT NEEDED]`, `[CITE NEEDED]` when data is missing.
6. **Sources Cited** — list every authority at end; flag unverified sources.

After the draft, the system automatically:

- Runs the **document linter** (no em dashes, emoji, endnotes).
- Builds a **citation verification package** (manifest + REF PDFs) for matched public sources.
- Generates an **AOS brief DOCX** with page footer.

Pair with the **AOS Discretionary Factors Case Assessment Tool** (intake matrix + brief
development matrix + case theme worksheet) when available.

## Step 1 — Classify the Draft

| Type | Examples |
|------|----------|
| AOS discretionary brief | "Draft AOS discretionary memo for AOD-1001" |
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

For AOS briefs, also include centered title block:

```
MEMORANDUM IN SUPPORT OF ADJUSTMENT OF STATUS (FORM I-485)
Submitted Pursuant to INA §245(a) and PM-602-0199
Case Theme: [one sentence]
```

## Step 3 — Required Sections

**I. Purpose** — What LD asked for.

**II. Summary** — Start with "In short, ..." then bullet Next Steps and "Awaiting directive on:" items.

**III. Draft body** — Numbered outline with substantive content appropriate to document type.

**IV. Items Requiring Further Development** — Facts, exhibits, or cites LD must supply.

**V. Source / authority note** — List sources relied on; flag unverified cites.

## Citation Verification (mandatory for cited drafts)

Follow `08-Citation-Verification-SKILL.md`:

- Never fabricate a source or quote.
- Verified public sources get annotated REF PDFs.
- Unverified sources get VERIFICATION NEEDED cards with download instructions.
- Brief + citation package deliver together.

## Drafting Rules

- No em dashes. No emojis.
- Do not invent facts not in matter context; use [FACT NEEDED] placeholders.
- Do not invent case citations; use [CITE NEEDED] or describe controlling standard without a fake cite.
- Immigration tone: precise, Sixth Circuit / BIA aware, no overclaiming.
- AOS briefs: 8–15 pages target; general memos: 1.5–3 pages unless LD requests longer.

## Output

Return the full draft ready for attorney edit in Word. Include `Case Theme:` line for AOS briefs.
