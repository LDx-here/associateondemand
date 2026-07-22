# Draft quality control (attorney guide)

How AssociateOnDemand sifts draft QC — and what still needs your judgment.

## What already runs automatically

| Check | When | What it catches |
|-------|------|-----------------|
| **Document linter** (§11) | After drafting + on memo export | Em/en dashes, emoji, endnote-style `[1]` refs, `ENDNOTES`, chatbot filler, many unresolved placeholders |
| **Citation package** | AOS briefs / cited drafts (≥2 cites) | Matches public DOJ/USCIS sources → REF PDFs; unmatched → VERIFICATION NEEDED cards |
| **Placeholders** | Prompt rules + QC checklist | `[FACT NEEDED]` / `[CITE NEEDED]` instead of inventing facts or cites |
| **Firm Memory injection** | Every drafting/research prompt | Tone, citation format, headers, short reference snippets from `/templates#firm-memory` |
| **Firm knowledge excerpts** | Agent prompts | Curated `.md` files under `brain/03_Firm_Knowledge/immigration/` (not whole PDFs) |
| **Attorney review gap** | Every agent result | Explicit “Attorney review required before filing…” |

## Human QC (Associate panel)

After a draft lands in the Associate / Command result:

1. Open **Draft QC** (Pass / Check / Fail / You).
2. Fix linter fails before **Download memo** (export re-runs the linter and returns 422 on fail).
3. Download **citation package** when shown; attach source PDFs for VERIFICATION NEEDED cards.
4. Fill or delete placeholders; edit the memo → **Save** (autosaves to matter notes).
5. If house style drifted → **Save to Firm Memory** so the next draft matches.

**Copy checklist** puts a plain-text QC list on the clipboard for your file or partner firm.

## What agents can sift

- Formatting / style hygiene (linter + Firm Memory)
- Missing facts/cites (placeholders + gaps list)
- Public-source citation packaging
- Structure from `05-Drafting-SKILL.md` (headers, AOS factor framework)

## What still requires attorney judgment

- Legal strategy, relief theory, and case theme strength
- Whether equities/adverse factors are complete and accurate for *this* client
- Shepardizing / Westlaw verification of non-public or novel cites
- Client-facing tone, privilege, and what to file vs. keep internal
- Final sign-off before USCIS/court/client delivery

## This week — operator checklist (La'Dajia)

1. **Upload:** 2–3 redacted sample briefs/motions + tone/citation prefs at `/templates#firm-memory`. Paste a short voice excerpt into style notes (PDF samples alone do not feed the draft prompt).
2. **Optional knowledge:** Drop 1–3 short `.md` element checklists into `brain/03_Firm_Knowledge/immigration/` (see that folder’s README). Do **not** upload the whole immigration book PDF.
3. **Verify:** Run a pilot draft; Draft QC should show Firm Memory applied; memo tone should echo your prefs.
4. **QC before client delivery:** Draft QC pass → fill placeholders → citation package → your strategy read → export only when linter is clean.

## Related

- Firm Memory + book excerpts: [`firm-memory-legal-elements.md`](./firm-memory-legal-elements.md)
- Drafting skill: [`../constitution/05-Drafting-SKILL.md`](../constitution/05-Drafting-SKILL.md)
- Citation skill: [`../constitution/08-Citation-Verification-SKILL.md`](../constitution/08-Citation-Verification-SKILL.md)
