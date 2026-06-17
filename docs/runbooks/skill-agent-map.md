# Skill → Agent map (Custom GPT ↔ AssociateOnDemand)

Use this when you develop behaviors in **ChatGPT Custom GPTs** and want the same logic in **production AOD agents**.

## Mental model

| Layer | Where it lives | Role |
|-------|----------------|------|
| **Skill** | `docs/constitution/*-SKILL.md` (git) | Protocol: steps, tone, citation rules, output format |
| **Custom GPT** | ChatGPT (OpenAI) | Sandbox to draft/test skills with you in the loop — **no live matter access** |
| **AOD agent** | `services/api/app/agents/*.py` | Runs the skill + live Airtable context + Anthropic API on Fly |
| **Constitution pack** | `docs/constitution/` | BUILD_SPEC, references, firm rules — shared context for all agents |

**Privacy:** Do not paste client PII or full case files into Custom GPTs. Develop skills on **synthetic or redacted** prompts; run real matters only inside AOD (tier 0, Airtable, Supabase, Fly).

## Feature map

| AOD feature | Agent module | Skill / protocol source | LLM today | Custom GPT use |
|-------------|--------------|-------------------------|-----------|----------------|
| Command Panel `pm:research` | `research_agent.py` | `04-Research-Memo-SKILL.md` | **Anthropic** (when `ANTHROPIC_API_KEY` set) | Prototype memo structure & citation tone here; export text into SKILL md |
| Assessment **Dispatch** | PM → research / stubs | Same research SKILL for `pm:research` | Anthropic for research routes | Same as research |
| PM Inbox routing | `pm_orchestrator.py` | BUILD_SPEC §7.5 | Stubs for drafting / mass_audit / legal_mapping | Draft inbox card wording only |
| Drafting agent | stub in PM | Future SKILL (not in repo yet) | Stub | **Primary Custom GPT dev target** — then add `05-Drafting-SKILL.md` |
| Mass audit | stub in PM | Future SKILL | Stub | Dev in GPT → add SKILL → wire agent |
| Legal mapping | stub in PM | Future SKILL | Stub | Same pattern |
| Intake OCR + categorize | `intake_processor.py`, `categorizer_agent.py` | BUILD_SPEC §7.8, firm-rules | Rules + stubs | Test category labels in GPT; implement in `categorizer_agent.py` |
| Fact extraction | `fact_extraction_agent.py` | Constitution references | Heuristic/stub | GPT helps define fact types → code |
| Pattern / knowledge | `pattern_agent.py` | `strategy-patterns.md`, Qdrant | Embeddings (no LLM) | GPT for pattern descriptions; index in Qdrant later |
| Strategy memo | `strategy_agent.py` | Master blueprint sections | Partial | GPT for section templates |
| Corrections learning | `correction_router` + web | `firm-rules.md`, BUILD_SPEC §10 | Append-only rules | GPT to refine **formatting conventions** → YAML in firm-rules |

## Workflow: Custom GPT → production

1. **Draft** behavior in Custom GPT (redacted facts only).
2. **Export** the instructions into a new or updated `docs/constitution/NN-Feature-SKILL.md` (commit to git).
3. **Wire** the FastAPI agent to load that SKILL + call Anthropic (`app/services/llm.py`).
4. **Test** via Command Panel or runbook smoke on Fly.
5. **Never** rely on ChatGPT acting “on behalf” in production — AOD agents act with audit trail, matter IDs, and tier gates.

## Environment

| Variable | Host | Purpose |
|----------|------|---------|
| `ANTHROPIC_API_KEY` | Fly API | Production LLM for research (and future agents) |
| `LLM_DEFAULT_MODEL` | Fly API | Default `claude-sonnet-4-20250514` |
| `AOD_AUTH_ENABLED` | Vercel | Firm login gate |
| `AIRTABLE_PAT` | Vercel + Fly | Live matters |

## Related

- [Research Memo SKILL](../constitution/04-Research-Memo-SKILL.md)
- [BUILD_SPEC](../constitution/BUILD_SPEC.md) §9
- [LEGAL_BOUNDARIES.md](../../LEGAL_BOUNDARIES.md)
