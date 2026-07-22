# AOS brief pipeline (technical pointer)

Live implementation lives in production AOD (`web/` + Fly API), not Legal OS.

**Canonical guides (brain — read fully before changing rules):**

- `brain/03_Firm_Knowledge/immigration/AOS_Brief_Parser_Pipeline.md`
- `brain/03_Firm_Knowledge/immigration/AOS_Brief_System_Guide.md`

**Runbook (what shipped + attorney steps):** [`docs/runbooks/aos-brief-pipeline.md`](../../docs/runbooks/aos-brief-pipeline.md)

**Code entry points:**

- Parser: `services/api/app/services/brief_parser/`
- Generator: `services/api/app/services/aos_brief_generator.py`
- Registry stub: `brief_parser/registry.py` (`AOS_DISCRETIONARY`; TODO asylum / hearing packet)
