# AOS Brief Pipeline (live AOD)

**Status:** Shipped Pass 31 (2026-07-22)  
**Product:** `web/` + Fly `services/api` — not legal-os/

## Source of truth (read these — do not duplicate)

| Doc | Path |
|-----|------|
| Parser + Generator technical guide | [`brain/03_Firm_Knowledge/immigration/AOS_Brief_Parser_Pipeline.md`](../../brain/03_Firm_Knowledge/immigration/AOS_Brief_Parser_Pipeline.md) |
| Writing / legal system guide | [`brain/03_Firm_Knowledge/immigration/AOS_Brief_System_Guide.md`](../../brain/03_Firm_Knowledge/immigration/AOS_Brief_System_Guide.md) |

Strategic pointer: [`.aod-context/technical/aos-brief-pipeline.md`](../../.aod-context/technical/aos-brief-pipeline.md)

## Design (locked)

- **Parser** and **Generator** are separate.
- Deterministic rules carry legal logic (PRESERVE / FILL / CAPTION / BOILERPLATE).
- LLM only enhances FILL prose; without API the brief is structurally correct with placeholders.
- Extensible via `brief_type` registry (`AOS_DISCRETIONARY` registered; asylum / hearing packet TODO).

## What shipped

| Piece | Location |
|-------|----------|
| Parser package | `services/api/app/services/brief_parser/` |
| Generator + Part 9 validator | `services/api/app/services/aos_brief_generator.py` |
| DOCX upload → brief template JSON | OCR when category `deliverable_template:aos-discretionary-brief` |
| Meta storage | FIRM-TEMPLATES Notes → `briefTemplate` + `sections` (with `classification` / `slots`) |
| Drafting injection | `drafting_prompt.fetch_deliverable_template_*` + AOS System Guide rules in `drafting_agent` |
| Intake fields | `web/src/lib/practice-area-facts.ts` — identity → architecture → factors |
| Templates UI | `/templates` Open preview → Structure: PRESERVE/FILL badges |

## Attorney workflow

1. **Templates** → AOS Discretionary Brief → **Replace** with Sakkhi (or firm) `.docx`.
2. Open preview → **Structure mapping** shows PRESERVE vs FILL and slots.
3. Open/create matter with AOS SKU → fill **Facts for drafting** (identity first, then case architecture).
4. Dispatch draft / Associate “draft AOS discretionary brief” — firm template PRESERVE law injected; validator report in agent metadata / gaps.
5. Re-upload DOCX anytime to re-parse (new version on FIRM-TEMPLATES).

## Tests

```bash
cd services/api && .venv/bin/python -m pytest tests/test_aos_brief_pipeline.py -q
```
