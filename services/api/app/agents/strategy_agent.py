"""Strategy Agent — develops structured strategy memo after pattern review."""

from __future__ import annotations

from app.agents.firm_context import load_firm_rules, load_strategy_patterns
from app.agents.pattern_agent import query_similar
from app.models.agent_result import AgentResult, Uncertainty
from app.services.docs_formatter import format_strategy_memo


def run_strategy(
    matter_id: str,
    posture: str = "",
    selected_strategy: str | None = None,
) -> AgentResult:
    patterns = query_similar(matter_id, limit=3)
    firm_rules = load_firm_rules(max_chars=1000)
    prior = load_strategy_patterns(max_chars=1500)

    strategy_name = selected_strategy or "Primary relief pathway (attorney to confirm)"
    posture_line = posture or "Confirm procedural posture before filing."

    sections = {
        "II. Strengths": "\n".join(
            [
                f"- Pattern matches: {', '.join(p['matter_id'] for p in patterns) or 'none yet'}",
                "- Constitution + firm-rules loaded for standards context.",
            ]
        ),
        "III. Weaknesses / Vulnerabilities": "\n".join(
            [
                "- Opposing counsel may challenge credibility gaps.",
                "- Deadlines and SOL require calendar verification.",
            ]
        ),
        "IV. Attack Plan": "\n".join(
            [
                f"- Pursue {strategy_name}.",
                "- Gather corroborating evidence per element checklist.",
                "- Prepare country conditions / hardship evidence as applicable.",
            ]
        ),
        "V. Response Plan": "\n".join(
            [
                "- Anticipate DHS arguments on timeliness and corroboration.",
                "- Preserve continuance option if evidence collection needed.",
            ]
        ),
    }
    if prior:
        sections["VI. Prior Strategy Patterns (excerpt)"] = prior[:600]

    memo = format_strategy_memo(matter_id, posture_line, sections)

    return AgentResult(
        agent="strategy",
        matter_id=matter_id,
        anchor_facts=[f"Posture: {posture_line}", f"Selected strategy: {strategy_name}"],
        anchor_law=["Match relief to procedural posture and statutory elements."],
        anchor_strategy=[f"Develop {strategy_name}", "Cross-check prior pattern outcomes before filing."],
        anchor_risk=["Missed filing deadline if tasks not completed.", "Strategy unvalidated until attorney sign-off."],
        anchor_next=["Confirm calendar entries", "Update Case Assessment tab", "Accept or correct via pipeline"],
        uncertain=[
            Uncertainty(
                item=f"Selected strategy: {strategy_name}",
                confidence=0.6,
                reason="Strategy is draft until attorney confirms posture and accepts via Correction Pipeline.",
            )
        ],
        summary=memo[:600],
        citations=[p["matter_id"] for p in patterns if p.get("matter_id")],
        confidence=0.6,
        metadata={"full_memo": memo, "firm_rules_chars": len(firm_rules)},
        complete=True,
    )
