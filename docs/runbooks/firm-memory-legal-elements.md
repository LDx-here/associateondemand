# Firm Memory + immigration reference book → legal elements

Short runbook for wiring practice reference material into AssociateOnDemand legal-element workflows.

## Where to put the immigration book

| Location | Best for | How AOD uses it |
|----------|----------|-----------------|
| **`brain/03_Firm_Knowledge/immigration/*.md`** | Curated chapter summaries & element checklists | **Wired now** — loaded into agent prompts (char-capped). Skips `README.md`. Not for whole PDFs. |
| **`/templates#firm-memory`** (Firm Memory upload) | Style exemplars + short reference snippets for **drafts** | **Wired** — `POST /api/firm-memory` → Strategy Patterns → drafting system prompt + matter context |
| **`.aod-context/features/` or `.aod-context/technical/`** | Structured agent reference (element checklists, INA cites) | Read by Cursor agents + `legal-element-templates.ts` seed lists |

### Upload recommendation (clear YES / NO)

| Material | Upload? | Where | Format |
|----------|---------|-------|--------|
| Firm brief/motion **style samples** (redacted) | **YES — priority 1** | `/templates#firm-memory` | PDF/DOCX samples + tone/citation/header prefs |
| Element checklists / 2–5 page chapter summaries | **YES — priority 2** | Firm Memory *and/or* `brain/.../immigration/*.md` | Markdown or short pasted text |
| Full immigration treatise / book PDF | **NO (as a single upload)** | Keep master offline or in vault for humans | Extract excerpts to `.md` instead |
| Client files, sealed/confidential books | **NO** | Matter Documents only when case-specific | Never Firm Memory |
| Machine-readable element lists | **YES — priority 3** | `.aod-context/technical/` | TypeScript / markdown lists for Legal Elements seed |

**Recommendation:** Do **not** dump the whole book into Firm Memory (it will be truncated and dilute style). Extract the chapters you actually cite → `.md` excerpts + Firm Memory snippets.

**Honest wiring (2026-07-21):** Drafting agents **do** inject (1) Firm Memory **style preferences** / Strategy Pattern text, and (2) short `.md` excerpts from `brain/03_Firm_Knowledge/immigration/`. Uploaded PDF “firm samples” are stored for completeness / discount tracking but are **not** auto-read into prompts — paste short redacted voice excerpts into style notes, or Save to Firm Memory after editing a draft. Whole-book PDFs are not ingested. See [draft-quality-control.md](./draft-quality-control.md).

## How legal elements consume reference material

1. **Templates** — `web/src/lib/legal-element-templates.ts` defines standard elements per practice area (Immigration, PI, deliverable-aware fields from `practice-area-facts.ts`).
2. **Matter workbench → Legal elements tab** — attorney clicks **Load practice-area elements** to create Airtable Legal Elements rows; maps extracted assessment facts; strategy status Met / Partial / Gap / Needs evidence.
3. **Extracted facts** — case assessment OCR + attorney verify (`ExtractedFactsReview`) link to elements via `fieldId`.
4. **Firm Memory** — element cards link to `/templates#firm-memory` for immigration reference snippets saved as Strategy Patterns.

## Attorney workflow

1. Put the master book PDF in `brain/03_Firm_Knowledge/immigration/_source/` (local; gitignored — do not commit copyrighted books).
2. Ask Cursor to convert by element into short `.md` files under `brain/03_Firm_Knowledge/immigration/` (see that folder’s README + `00-index.md`). Do **not** dump the whole PDF into Firm Memory.
3. Optional: upload short style snippets / redacted samples → Firm Memory (`/templates#firm-memory`) for drafting voice.
4. Redeploy the API after adding brain `.md` files (Fly image copies `brain/03_Firm_Knowledge`).
5. On matter → **Legal elements** → Load practice-area elements → review extracted facts → set strategy status per element.
6. **Procedural timeline** tab tracks filings/posture; **Case activity** tab holds notes and agent chronology.

## Related code

- `web/src/lib/legal-element-templates.ts`
- `web/src/components/LegalElementsPanel.tsx`
- `docs/constitution/07-Legal-Mapping-SKILL.md`

## Smart templates + Firm Memory (2026-07-21)

Smart templates separate **editable fields** from **locked boilerplate** so overflow deliverables keep firm format.

| Surface | Purpose |
|---------|---------|
| **`/templates#smart-templates`** | Catalog of field maps (e.g. telephonic records request) |
| **Matter → Overview → Smart templates** | Apply template on a matter; autofill from matter profile + saved template profiles |
| **`/templates#firm-memory`** | Firm-wide style samples + Strategy Patterns (drafting voice) |
| **`POST /api/templates/detect-fields`** | Optional LLM/heuristic field detection from uploaded sample OCR |

### Telephonic records request — setup steps

1. Open **`/templates`** → confirm **Smart templates** lists *Telephonic records request*.
2. **`/templates#firm-memory`** → upload a redacted firm sample (optional) → saves style to Strategy Patterns.
3. On a matter → **Overview** tab → **Smart templates** → select *Telephonic records request*.
4. Fill editable fields (client name, A-number, records list) — violet-highlighted regions are customizable; locked sections stay boilerplate.
5. **Save profile** (e.g. "Telephonic requests — RMV defaults") for reuse on future matters.
6. **Generate filled preview** → copy structured output or start a hearing-packet assignment.

### Document isolation (matter-scoped uploads)

Documents must only appear on the matter they were uploaded to. Code guards:

- `web/src/lib/airtable/matter-link-filter.ts` — Airtable formula + post-filter on linked record ids
- Firm-wide rows (`assessment_template:*`, `firm_sample:*`) excluded from matter document lists
- Upload path always patches `matter_id` when registering an existing Airtable document row

