# Fact extraction and OCR confidence — attorney guide

**Audience:** RMV attorneys using AssociateOnDemand matter workbench and intake uploads.

## What happens when you upload a document

1. **Upload** — PDF or image goes to the Fly API Strong Reader pipeline (`POST /intake/upload`).
2. **OCR** — Text is extracted via PDF text layer, Tesseract, or plain-text read (`services/api/app/pipelines/ocr_pipeline.py`).
3. **PII gate** — Presidio tier may anonymize text before storage.
4. **Categorize** — Heuristic document category (court filing, case assessment, etc.).
5. **Extract facts** — Regex/heuristic agent finds dates, A-numbers, names, events, and (for case assessments) practice-area field hints (`fact_extraction_agent.py`).
6. **Enrich facts (case assessment)** — When heuristic output is low-diversity (e.g. repeated generic `name` labels), Claude maps facts to legal elements (`fact_enrichment.py`). Skipped gracefully if `ANTHROPIC_API_KEY` is unset.
7. **Persist**
   - **Postgres** — `Document` + `ExtractedFact` rows (processing audit).
   - **Airtable Documents** — row on the matter Documents tab.
   - **Airtable Notes** — for case assessment uploads, JSON note type **Assessment Document** with OCR text + facts.
   - **Obsidian sync** — optional firm-memory markdown mirror.

Verified attorney edits are saved back to the **Assessment Document** note. Agents read verified values first via `format_assessment_document()` in `matter_context.py`.

## What the “OCR confidence %” means

The percentage shown after upload is **not legal fact accuracy**.

**Formula:**

```
combined_confidence = (ocr_engine_confidence + text_quality_score) / 2
```

| Component | Source |
|-----------|--------|
| `ocr_engine_confidence` | Tesseract word confidence average, or fixed scores for PDF text layer (0.92) / plain text (0.99) |
| `text_quality_score` | Heuristic 0–1 score from character ratio, word count, and length (`ocr_pipeline.text_quality_score`) |

Per-fact confidence values (e.g. 0.78 for dates, 0.55 for names) are **fixed heuristics** in the fact extractor — not LLM self-scores.

**UI label:** “OCR confidence: N%” with tooltip explaining the above.

**Attorney verification rate** (X/Y verified on extracted facts) is separate and shown on the **Extracted facts — attorney review** panel.

## Case assessment workflow

1. Upload completed assessment on **Matter → Documents → Case assessment**.
2. Review extracted facts — edit values, toggle **Verified / Needs review**, save.
3. **Case assessment summary** on the matter header maps elements to AOS discretionary brief sections (or other deliverable checklists).
4. Optional: fill **Quick facts** checklist — saved as Notes type **Facts** for drafting completeness.

## What agents receive

PM dispatch and SKILL agents merge, in order:

- Matter row (case type, posture, court)
- Structured **Facts** note (`format_drafting_facts`)
- Uploaded assessment OCR + verified extracted fields (`format_assessment_document`)
- Legacy structured assessment JSON on matter row if present (`format_assessment_data`)
- Attorney instructions and research notes

Case assessment uploads pass **extraction context** (practice area, deliverable SKU, legal element hints) so the reader targets waiver/equities fields for immigration AOS work.

## Agent enrichment pass

After heuristic OCR extraction, case assessment uploads may trigger an **LLM enrichment pass** (Claude via `ANTHROPIC_API_KEY` on Fly API):

1. **Heuristic pre-extract** — regex finds dates, A-numbers, names, events (`fact_extraction_agent.py`).
2. **Auto-trigger** — when heuristic facts are low-diversity (e.g. repeated generic `name` labels without `fieldId`), `enrich_document_facts()` calls Claude.
3. **Enrichment output** — human-readable labels, legal element mapping, deduplicated facts, one-line **element fit** explanations.
4. **Persist** — enriched JSON saved to the **Assessment Document** note; UI shows grouped facts under element headings.
5. **Re-analyze** — attorney clicks **Re-analyze with AI** on Extracted facts review to re-run on saved OCR text.

**API:** `POST /intake/enrich-facts` (Fly) · proxied by `POST /api/matters/{matterId}/enrich-facts` (Next.js).

**Graceful fallback:** If `ANTHROPIC_API_KEY` is missing, UI shows heuristic facts with warning: *Enable ANTHROPIC_API_KEY for element mapping*.

### How fact-to-element mapping works

| Step | Component | Output |
|------|-----------|--------|
| OCR | `ocr_pipeline.py` | Raw text |
| Heuristic | `fact_extraction_agent.py` | `{ fact_type, value, context }` |
| Enrichment | `fact_enrichment.py` + Claude | `{ label, legalElement, elementFit, fieldId }` |
| Review | `ExtractedFactsReview.tsx` | Attorney verify/edit |
| Elements tab | `LegalElementsPanel.tsx` | Element strategy + linked facts |
| Agents | `format_assessment_document()` | Verified enriched facts in prompts |

**Low-diversity detection:** `heuristic_facts_need_enrichment()` returns true when ≥2 facts lack `fieldId` and use generic types (`name`, `date`, `event`, etc.) or when all facts share one generic type.

## What still needs attorney input

- Sample of your **main case assessment form** if it differs from the default AOS Discretionary Factors template — upload once under `/templates#firm-assessment-templates`.
- Legal elements list on the matter **Legal Elements** tab — improves mapping for complex cases.
- Verify every extracted name/date before export — OCR can misread scans.
