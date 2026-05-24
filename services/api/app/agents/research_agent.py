"""Research agent — loads Research Memo SKILL; refuses when stub is PENDING."""

from __future__ import annotations

import os
import re
from pathlib import Path
from typing import Any

from app.agents._context import load_constitution
from app.agents.firm_context import load_firm_rules
from app.models.agent_result import AgentResult
from app.services.docs_formatter import format_research_memo

_DEFAULT_SKILL = Path(__file__).resolve().parents[4] / "docs" / "constitution" / "04-Research-Memo-SKILL.md"
_SKILL_PATH = Path(os.getenv("AOD_RESEARCH_SKILL_PATH", str(_DEFAULT_SKILL)))

_PENDING_MARKERS = ("PENDING", "Placeholder", "will **refuse to run**")


def _load_skill_text() -> str:
    if not _SKILL_PATH.exists():
        return ""
    return _SKILL_PATH.read_text(encoding="utf-8", errors="replace")


def skill_is_pending(text: str) -> bool:
    head = text[:600]
    return any(marker in head for marker in _PENDING_MARKERS)


def _extract_country_from_query(query: str) -> str | None:
    match = re.search(r"country(?:\s+conditions)?(?:\s+for|\s+in)?\s+([A-Z][a-zA-Z\s]{2,30})", query, re.I)
    return match.group(1).strip() if match else None


def run_research(
    matter_id: str,
    query: str,
    sources: list[str] | None = None,
) -> AgentResult:
    """Execute research protocol or return blocker when SKILL is still a stub."""

    skill = _load_skill_text()
    source_list = sources or ["constitution", "obsidian", "airtable"]

    if not skill or skill_is_pending(skill):
        return AgentResult(
            agent="research",
            matter_id=matter_id,
            anchor_facts=[f"Research query received: {query[:200]}"],
            anchor_law=[],
            anchor_strategy=[],
            anchor_risk=["Research agent blocked — SKILL file is still PENDING."],
            anchor_next=[
                "Replace docs/constitution/04-Research-Memo-SKILL.md with full protocol",
                "Deposit SKILL in .incoming/ and copy per README instructions",
            ],
            gaps=[
                "BLOCKER: 04-Research-Memo-SKILL.md is a PENDING stub. "
                "Research agent will not run until the full multi-source protocol is installed."
            ],
            summary="Research blocked pending Research Memo SKILL.",
            citations=["docs/constitution/04-Research-Memo-SKILL.md"],
            confidence=0.0,
            metadata={"skill_status": "pending", "skill_path": str(_SKILL_PATH)},
            complete=False,
        )

    firm_rules = load_firm_rules(max_chars=2000)
    constitution = load_constitution(max_chars_per_file=3000)
    country = _extract_country_from_query(query)

    findings_lines = [
        f"Query: {query}",
        "",
        "Protocol loaded from Research Memo SKILL (local file).",
        "Live connectors (Midpage, Fastcase, DOS reports) require API keys in production.",
    ]
    if country:
        findings_lines.extend(
            [
                "",
                f"Country focus detected: {country}.",
                "SKILL hierarchy: DOS Human Rights Report → NGO corroboration → circuit precedent.",
            ]
        )

    sections: dict[str, str] = {
        "I. Question Presented": query,
        "II. Applicable Standards": "Apply controlling circuit standards and element tests from constitution pack.",
        "III. Findings (draft)": "\n".join(findings_lines),
        "IV. Source Documentation": "Pending live API wiring — constitution + firm-rules loaded for context.",
        "V. Gaps / Follow-up": "Attorney to confirm source hierarchy and approve memo before client use.",
    }
    if firm_rules:
        sections["Firm Rules (excerpt)"] = firm_rules[:800]

    memo = format_research_memo(
        title=f"Research — {query[:80]}",
        sections=sections,
        matter_id=matter_id,
    )

    return AgentResult(
        agent="research",
        matter_id=matter_id,
        anchor_facts=[f"Research query scoped for {matter_id}", f"Sources requested: {', '.join(source_list)}"],
        anchor_law=["Controlling standards loaded from constitution references."],
        anchor_strategy=["Validate country conditions against DOS + NGO hierarchy per SKILL."],
        anchor_risk=["Do not cite unverified web sources in filings.", "Live research APIs not yet connected."],
        anchor_next=["Attorney review memo", "Accept or edit via Correction Pipeline"],
        summary=memo[:600],
        citations=source_list + [str(_SKILL_PATH.name)],
        confidence=0.55,
        metadata={"full_memo": memo, "skill_status": "loaded", "constitution_chars": len(constitution)},
        complete=True,
    )


def research_from_payload(payload: dict[str, Any]) -> AgentResult:
    return run_research(
        matter_id=str(payload.get("matter_id") or ""),
        query=str(payload.get("query") or ""),
        sources=payload.get("sources"),
    )
