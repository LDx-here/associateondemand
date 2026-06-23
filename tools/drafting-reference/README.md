# Drafting reference scripts (source material)

These files were the original Kingdom Counsel / AOS discretionary brief tooling.
Logic is now integrated into the API:

| Original file | Integrated location |
|---------------|---------------------|
| `Citation_Verification_SKILL.md` | `docs/constitution/08-Citation-Verification-SKILL.md` |
| `build_citation_package.py` | `services/api/app/drafting/citation_package.py` |
| `build_aos_chart.py` | Factor questions embedded in `aos_framework.py` + assessment tool pattern |
| `build_brief_matrix.py` | Legal propositions in `aos_framework.py` / `aos_verified_sources.py` |
| `build_brief.js` | Section structure in `aos_framework.py` |
| `build_framework_prototype.js` | Element framework in `aos_framework.py` |
| `generate_aos_brief.py` | `services/api/app/drafting/aos_brief_docx.py` |

## API endpoints

- `POST /agents/drafting/run?matter_id=&instruction=` — full drafting agent
- `POST /agents/drafting/citation-package` — `{ matter_id, memo_text }`
- `POST /agents/drafting/aos-brief-export` — `{ matter_id, memo_text, client_name, a_number, case_theme }`

## Command panel examples

```
draft aos discretionary brief for AOD-1001
draft i-485 discretionary factors memo PM-602-0199
```
