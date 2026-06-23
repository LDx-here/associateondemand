# AssociateOnDemand Constitution Folder

Agents and humans treat this directory as **binding context** when designing features or prompts.

## Files

| File | Purpose |
|------|---------|
| `00-Master-Blueprint.md` | Product vision, layers, roadmap |
| `01-Backend-Architecture.md` | MVP backend memo (matters / notes / tasks schema) |
| `02-Amended-Build-Plan.md` | Pointer to the phased build plan (canonical copy lives in Cursor) |
| `03-CLAUDE-Firm-Constitution.md` | Interim firm rules for the AI associate (`RMV_Prototype/CLAUDE.md` copy until you replace with your litigation memo) |
| `04-Research-Memo-SKILL.md` | **Required for Phase 4** — multi-source legal research protocol (replace PENDING stub) |
| `05-AOD-Plan-Evaluation.md` | Extract from `AOD-Plan-Evaluation.docx` (evaluation of the plan amendments) |
| `AOD-Plan-Evaluation.docx` | Original Word memo (kept beside the Markdown extract) |
| `references/*.md` | Practice-area notebooks (asylum/waivers/sixth circuit / country sources) — fill from `.incoming/` |

## Loading expectation (later phases)

- **Phase 3+ FastAPI helpers** (`load_constitution()`): load Markdown here into agent system prompts — do not scrape the web when this folder answers the question.
- **`04-Research-Memo-SKILL.md` missing** → Research Agent emits a blocker (per plan).
