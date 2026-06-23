# Skill → Agent map (Custom GPT ↔ AssociateOnDemand)

| AOD feature | Agent module | SKILL | LLM |
|-------------|--------------|-------|-----|
| `pm:research` | `research_agent.py` | `04-Research-Memo-SKILL.md` | Anthropic |
| `draft …` | `drafting_agent.py` | `05-Drafting-SKILL.md` | Anthropic |
| `mass audit …` | `mass_auditor_agent.py` | `06-Mass-Audit-SKILL.md` | Anthropic |
| `legal mapping …` | `legal_mapping_agent.py` | `07-Legal-Mapping-SKILL.md` | Anthropic |
| Intake OCR | `strong_reader_agent.py` | BUILD_SPEC §7.8 | Heuristic + Obsidian |
| Pattern | `pattern_agent.py` | strategy-patterns + Qdrant | Embeddings |
| Strategy | `strategy_agent.py` | blueprint sections | Heuristic |
| Corrections | `correction_router.py` | firm-rules §10 | Append-only |

Workflow: prototype in Custom GPT (redacted) → export to `docs/constitution/*-SKILL.md` → wire agent → smoke on Fly.

Environment: `ANTHROPIC_API_KEY`, `LLM_DEFAULT_MODEL=claude-sonnet-4-6`, `AIRTABLE_PAT`, `AOD_AUTH_ENABLED` on Vercel.
