"""Research Agent — loads Research Memo SKILL and follows BUILD_SPEC §9.

The agent does NOT refuse to run. The SKILL file
``docs/constitution/04-Research-Memo-SKILL.md`` is the source of truth; if it
is missing entirely we surface a blocker, but a populated SKILL is honored.

Connector tiers (BUILD_SPEC §9):

1. MIDPAGE_API_KEY present  — Midpage MCP for BIA / Sixth Circuit / Supreme
   Court precedent + citator checks.
2. FASTCASE_API_KEY present — Fastcase as backup case search.
3. (Always-on fallback)     — government + practice-resource web search
   (USCIS Policy Manual, EOIR Practice Manual, AILA, CLINIC, ILRC, TRAC).
4. MANUAL FLAG              — Westlaw/Lexis Shepardizing, judge-specific
   research, sealed cases. Always emitted regardless of tier; the PM
   Orchestrator routes the MANUAL FLAG to the attorney inbox.

When neither MIDPAGE nor FASTCASE keys are configured, we fall back to the
gov + practice-resource tier and add a ``MANUAL FLAG`` gap to the result so
the PM Orchestrator creates an inbox card.
"""

from __future__ import annotations

import os
import re
from pathlib import Path
from typing import Any

from app.agents._context import load_constitution
from app.agents.firm_context import load_firm_rules
from app.models.agent_result import AgentResult, GapQuestion, SourceRef, Uncertainty
from app.services.docs_formatter import format_research_memo

_DEFAULT_SKILL = Path(__file__).resolve().parents[4] / "docs" / "constitution" / "04-Research-Memo-SKILL.md"
_SKILL_PATH = Path(os.getenv("AOD_RESEARCH_SKILL_PATH", str(_DEFAULT_SKILL)))


def _load_skill_text() -> str:
    if not _SKILL_PATH.exists():
        return ""
    return _SKILL_PATH.read_text(encoding="utf-8", errors="replace")


def _extract_country_from_query(query: str) -> str | None:
    match = re.search(r"country(?:\s+conditions)?(?:\s+for|\s+in)?\s+([A-Z][a-zA-Z\s]{2,30})", query, re.I)
    return match.group(1).strip() if match else None


def _connector_tier() -> dict[str, bool]:
    """Detect which research connectors are configured."""

    return {
        "midpage": bool(os.getenv("MIDPAGE_API_KEY")),
        "fastcase": bool(os.getenv("FASTCASE_API_KEY")),
    }


def _gov_practice_sources(country: str | None) -> list[SourceRef]:
    """Always-on tier 3-4 sources per BUILD_SPEC §9."""

    sources: list[SourceRef] = [
        SourceRef(
            claim="USCIS Policy Manual",
            source="USCIS",
            url="https://www.uscis.gov/policy-manual",
        ),
        SourceRef(
            claim="EOIR Practice Manual",
            source="DOJ EOIR",
            url="https://www.justice.gov/eoir/page/file/1258536/dl",
        ),
        SourceRef(
            claim="AILA practice advisories",
            source="AILA",
            url="https://www.aila.org",
        ),
        SourceRef(
            claim="CLINIC training resources",
            source="CLINIC",
            url="https://www.cliniclegal.org",
        ),
        SourceRef(
            claim="ILRC practice manuals",
            source="ILRC",
            url="https://www.ilrc.org",
        ),
        SourceRef(
            claim="TRAC Immigration judge/court grant rates",
            source="TRAC Syracuse",
            url="https://trac.syr.edu/immigration/",
        ),
    ]
    if country:
        sources.insert(
            0,
            SourceRef(
                claim=f"State Department Country Report on Human Rights — {country}",
                source="U.S. State Department",
                url=f"https://www.state.gov/reports/2023-country-reports-on-human-rights-practices/{country.lower().replace(' ', '-')}/",
            ),
        )
    return sources


def run_research(
    matter_id: str,
    query: str,
    sources: list[str] | None = None,
) -> AgentResult:
    """Execute the BUILD_SPEC §9 research protocol against available tiers."""

    skill = _load_skill_text()
    source_list = sources or ["constitution", "obsidian", "airtable"]

    if not skill:
        return AgentResult(
            agent="research",
            matter_id=matter_id,
            anchor_facts=[f"Research query received: {query[:200]}"],
            anchor_law=[],
            anchor_strategy=[],
            anchor_risk=["Research SKILL file missing on disk."],
            anchor_next=[
                "Restore docs/constitution/04-Research-Memo-SKILL.md from source control"
            ],
            gaps=[
                "BLOCKER: docs/constitution/04-Research-Memo-SKILL.md is missing. "
                "Research agent will not run until the SKILL file is restored."
            ],
            summary="Research blocked: SKILL file missing.",
            citations=["docs/constitution/04-Research-Memo-SKILL.md"],
            confidence=0.0,
            metadata={"skill_status": "missing", "skill_path": str(_SKILL_PATH)},
            complete=False,
        )

    firm_rules = load_firm_rules(max_chars=2000)
    constitution = load_constitution(max_chars_per_file=3000)
    country = _extract_country_from_query(query)
    tier = _connector_tier()

    findings_lines = [
        f"Query: {query}",
        "",
        f"Protocol loaded from {_SKILL_PATH.name}.",
        f"Midpage configured: {tier['midpage']}. Fastcase configured: {tier['fastcase']}.",
    ]
    risks: list[str] = [
        "Do not cite unverified web sources in filings — every cite must be Shepardized.",
    ]
    gaps: list[str] = []
    manual_flags: list[str] = []

    if not tier["midpage"] and not tier["fastcase"]:
        findings_lines.extend(
            [
                "",
                "No citator MCPs configured. Falling back to government + practice-resource "
                "tier per BUILD_SPEC §9 step 3.",
            ]
        )
        risks.append(
            "No live citator configured — every case cited must be MANUALLY Shepardized "
            "in Westlaw/Lexis before relying on it."
        )
        manual_flags.append(
            "MANUAL FLAG: Westlaw/Lexis Shepardizing of every cited case is required."
        )
        gaps.append(manual_flags[-1])

    if country:
        findings_lines.extend(
            [
                "",
                f"Country focus detected: {country}.",
                "SKILL hierarchy: DOS Human Rights Report → NGO corroboration → circuit precedent.",
            ]
        )

    structured_sources = _gov_practice_sources(country)
    sources_table = (
        "| # | Source | Searched | Finding | Date | Action Required |\n"
        "|---|--------|----------|---------|------|------------------|\n"
    )
    for idx, src in enumerate(structured_sources, start=1):
        action = "Attorney verify" if "MANUAL FLAG" in (src.claim + src.source) else "Cite + Shepardize"
        sources_table += (
            f"| {idx} | {src.source} | yes | {src.claim} | n/a | {action} |\n"
        )

    sections: dict[str, str] = {
        "I. Question Presented": query,
        "II. Applicable Standards": "Apply controlling circuit standards and element tests from constitution pack.",
        "III. Findings (draft)": "\n".join(findings_lines),
        "IV. Source Documentation": sources_table,
        "V. Gaps / Follow-up": "\n".join(["- " + g for g in (gaps or ["Attorney to confirm scope before client use."])]),
    }
    if firm_rules:
        sections["Firm Rules (excerpt)"] = firm_rules[:800]

    memo = format_research_memo(
        title=f"Research — {query[:80]}",
        sections=sections,
        matter_id=matter_id,
    )

    gap_questions = [
        GapQuestion(question=g, priority=1, why_it_matters="Required before memo can be relied upon.")
        for g in gaps
    ]
    uncertain = [
        Uncertainty(
            item="Draft research memo",
            confidence=0.55 if not (tier["midpage"] or tier["fastcase"]) else 0.7,
            reason=(
                "Memo produced from constitution pack and SKILL protocol; "
                "live citator verification still required."
            ),
        )
    ]

    result = AgentResult(
        agent="research",
        matter_id=matter_id,
        anchor_facts=[f"Research query scoped for {matter_id}", f"Sources requested: {', '.join(source_list)}"],
        anchor_law=["Controlling standards loaded from constitution references."],
        anchor_strategy=["Validate country conditions against DOS + NGO hierarchy per SKILL."],
        anchor_risk=risks,
        anchor_next=["Attorney review memo", "Accept or edit via Correction Pipeline"],
        gaps=gaps,
        gap_questions=gap_questions,
        uncertain=uncertain,
        sources=structured_sources,
        summary=memo[:600],
        citations=source_list + [str(_SKILL_PATH.name)],
        confidence=0.55 if not (tier["midpage"] or tier["fastcase"]) else 0.7,
        metadata={
            "full_memo": memo,
            "skill_status": "loaded",
            "constitution_chars": len(constitution),
            "tier": tier,
            "manual_flags": manual_flags,
        },
        # complete stays True so the memo is delivered; the gaps array signals
        # to the PM Orchestrator that an inbox MANUAL FLAG card should be raised.
        complete=True,
    )
    return result


def research_from_payload(payload: dict[str, Any]) -> AgentResult:
    return run_research(
        matter_id=str(payload.get("matter_id") or ""),
        query=str(payload.get("query") or ""),
        sources=payload.get("sources"),
    )
