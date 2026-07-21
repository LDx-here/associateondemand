# Firm Memory + immigration reference book → legal elements

Short runbook for wiring practice reference material into AssociateOnDemand legal-element workflows.

## Where to put the immigration book

| Location | Best for | How AOD uses it |
|----------|----------|-----------------|
| **`brain/03_Firm_Knowledge/`** (Obsidian vault) | Long-form prose, playbooks, RMV internal notes | Agent context via future ingestion; good canonical home for the full book |
| **`/templates#firm-memory`** (Firm Memory upload) | Style exemplars + short reference snippets attorneys want in **drafts** | Already wired — `POST /api/firm-memory` → Strategy Patterns; Legal Elements tab links here |
| **`.aod-context/features/` or `.aod-context/technical/`** | Structured agent reference (element checklists, INA cites) | Read by Cursor agents + `legal-element-templates.ts` seed lists |

**Recommendation:** Keep the master immigration book in `brain/03_Firm_Knowledge/immigration/` (or similar). Upload **chapter summaries or element checklists** (2–5 page excerpts) to Firm Memory at `/templates#firm-memory` so drafting and the Legal Elements tab can cite them. Add machine-readable element lists under `.aod-context/technical/` when you want agents to auto-seed elements without manual upload.

## How legal elements consume reference material

1. **Templates** — `web/src/lib/legal-element-templates.ts` defines standard elements per practice area (Immigration, PI, deliverable-aware fields from `practice-area-facts.ts`).
2. **Matter workbench → Legal elements tab** — attorney clicks **Load practice-area elements** to create Airtable Legal Elements rows; maps extracted assessment facts; strategy status Met / Partial / Gap / Needs evidence.
3. **Extracted facts** — case assessment OCR + attorney verify (`ExtractedFactsReview`) link to elements via `fieldId`.
4. **Firm Memory** — element cards link to `/templates#firm-memory` for immigration reference snippets saved as Strategy Patterns.

## Attorney workflow

1. Drop or sync immigration book → `brain/03_Firm_Knowledge/`.
2. Upload element-focused excerpts → Firm Memory (Templates page).
3. On matter → **Legal elements** → Load practice-area elements → review extracted facts → set strategy status per element.
4. **Procedural timeline** tab tracks filings/posture; **Case activity** tab holds notes and agent chronology.

## Related code

- `web/src/lib/legal-element-templates.ts`
- `web/src/components/LegalElementsPanel.tsx`
- `docs/constitution/07-Legal-Mapping-SKILL.md`
