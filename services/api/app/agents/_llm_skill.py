"""Shared SKILL loading and Anthropic runner for specialist agents."""

from __future__ import annotations

import os
from pathlib import Path

from app.agents._context import load_constitution
from app.agents.firm_context import load_firm_rules
from app.models.agent_result import AgentResult, GapQuestion, Uncertainty
from app.services.llm import generate_text, is_configured as llm_configured
from app.services.matter_context import fetch_matter_context, format_matter_context

OUTPUT_RULES = (
    "Rules:\n"
    "- MEMORANDUM header with TO/FROM/DATE/RE when producing a memo.\n"
    "- Section I: Purpose. Section II: Summary (In short, ...) + Next Steps.\n"
    "- Numbered outline I. II. III. with 1. 2. 3. and a. b. c.\n"
    "- No em dashes. No emojis.\n"
    "- Target 1.5–3 pages. Flag items requiring attorney verification.\n"
    "- Do not invent case citations; mark unverified cites for Shepardizing.\n"
)


def resolve_skill_path(filename: str, env_var: str) -> Path:
    if env := os.getenv(env_var):
        return Path(env)
    docker = Path(f"/app/docs/constitution/{filename}")
    if docker.is_file():
        return docker
    return Path(__file__).resolve().parents[4] / "docs" / "constitution" / filename


def load_skill_text(path: Path) -> str:
    if not path.exists():
        return ""
    return path.read_text(encoding="utf-8", errors="replace")


def skill_missing_result(agent: str, matter_id: str, path: Path) -> AgentResult:
    return AgentResult(
        agent=agent,
        matter_id=matter_id,
        anchor_facts=[f"{agent} agent invoked for {matter_id}"],
        anchor_law=[],
        anchor_strategy=[],
        anchor_risk=[f"SKILL file missing: {path.name}"],
        anchor_next=[f"Restore docs/constitution/{path.name}"],
        gaps=[f"BLOCKER: {path.name} is missing."],
        summary=f"{agent} blocked: SKILL file missing.",
        confidence=0.0,
        metadata={"skill_status": "missing", "skill_path": str(path)},
        complete=False,
    )


def build_system_prompt(*, role: str, skill: str, extra_rules: str = "") -> str:
    rules = OUTPUT_RULES + (f"\n{extra_rules}" if extra_rules else "")
    return (
        f"You are {role} for Recover My Value immigration practice. "
        "Follow the SKILL below exactly.\n\n"
        f"{rules}\n\n"
        f"--- SKILL ---\n{skill[:28000]}"
    )


def build_user_prompt(
    *,
    matter_id: str,
    instruction: str,
    matter_ctx: dict | None,
    extra_context: str = "",
) -> str:
    parts = [
        f"Matter ID: {matter_id}",
        f"Instruction: {instruction}",
        "## Live matter context (Airtable)",
        format_matter_context(matter_ctx, matter_code=matter_id),
    ]
    if extra_context.strip():
        parts.extend(["## Additional context", extra_context.strip()])
    parts.append("\nProduce the complete work product now.")
    return "\n\n".join(parts)


def run_skill_llm(
    *,
    agent: str,
    matter_id: str,
    instruction: str,
    skill_path: Path,
    role: str,
    extra_rules: str = "",
    extra_context: str = "",
    summary_prefix: str = "",
    max_tokens: int = 8192,
    confidence: float = 0.78,
) -> AgentResult:
    skill = load_skill_text(skill_path)
    if not skill:
        return skill_missing_result(agent, matter_id, skill_path)

    if not llm_configured():
        return AgentResult(
            agent=agent,
            matter_id=matter_id,
            anchor_facts=[instruction[:200] or "(empty instruction)"],
            anchor_law=["Firm rules apply."],
            anchor_strategy=["Set ANTHROPIC_API_KEY for SKILL-quality output."],
            anchor_risk=[f"{agent} template-only without Anthropic."],
            anchor_next=["Configure ANTHROPIC_API_KEY", "Retry dispatch"],
            gaps=[f"ANTHROPIC_API_KEY not configured — {agent} cannot run LLM path."],
            summary=f"{agent}: LLM unavailable (configure ANTHROPIC_API_KEY).",
            confidence=0.35,
            metadata={"skill_status": "loaded", "llm": "unavailable"},
            complete=False,
        )

    matter_ctx = fetch_matter_context(matter_id)
    firm_rules = load_firm_rules(max_chars=1500)
    constitution = load_constitution(max_chars_per_file=2500)
    system = build_system_prompt(role=role, skill=skill, extra_rules=extra_rules)
    user = build_user_prompt(
        matter_id=matter_id,
        instruction=instruction,
        matter_ctx=matter_ctx,
        extra_context="\n\n".join(
            filter(
                None,
                [
                    extra_context,
                    f"## Firm rules\n{firm_rules[:1500]}" if firm_rules else "",
                    f"## Constitution excerpt\n{constitution[:5000]}" if constitution else "",
                ],
            )
        ),
    )
    raw = generate_text(system=system, user=user, max_tokens=max_tokens, temperature=0.2)
    if not raw:
        return AgentResult(
            agent=agent,
            matter_id=matter_id,
            anchor_facts=[instruction[:200]],
            anchor_law=[],
            anchor_strategy=[],
            anchor_risk=["LLM call failed."],
            anchor_next=["Retry dispatch", "Check Fly logs for Anthropic errors"],
            gaps=[f"{agent} LLM call failed."],
            summary=f"{agent}: LLM call failed.",
            confidence=0.4,
            metadata={"skill_status": "loaded", "llm": "failed"},
            complete=False,
        )

    doc = raw.strip()
    gaps = ["Attorney review required before filing or client communication."]
    return AgentResult(
        agent=agent,
        matter_id=matter_id,
        anchor_facts=[f"{agent} completed for {matter_id}", instruction[:200]],
        anchor_law=["Output follows firm SKILL and constitution pack."],
        anchor_strategy=["Verify citations and facts before use."],
        anchor_risk=["Verify every citation in Westlaw/Lexis before filing."],
        anchor_next=["Attorney review", "Accept or edit via Correction Pipeline"],
        gaps=gaps,
        gap_questions=[
            GapQuestion(
                question=gaps[0],
                priority=1,
                why_it_matters="Required before work product can be relied upon.",
            )
        ],
        uncertain=[
            Uncertainty(
                item=f"{agent} draft",
                confidence=confidence,
                reason="LLM draft from SKILL + live matter context.",
            )
        ],
        summary=(summary_prefix + doc[:500]) if summary_prefix else doc[:600],
        citations=["Anthropic", skill_path.name],
        confidence=confidence,
        metadata={
            "full_memo": doc,
            "skill_status": "loaded",
            "llm": "anthropic",
            "matter_context": matter_ctx,
        },
        complete=True,
    )
