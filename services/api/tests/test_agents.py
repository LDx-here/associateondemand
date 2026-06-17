"""Agent routing and envelope tests."""

from __future__ import annotations

from app.agents.pm_orchestrator import classify_instruction
from app.models.agent_result import AgentResult


def test_classify_research_instruction() -> None:
    assert classify_instruction("pm:research country conditions Guatemala") == "research"


def test_classify_drafting_instruction() -> None:
    assert classify_instruction("draft cover letter for filing") == "drafting"


def test_classify_mass_audit_instruction() -> None:
    assert classify_instruction("run mass audit on AOD-1001") == "mass_audit"


def test_classify_legal_mapping_instruction() -> None:
    assert classify_instruction("legal mapping for elements") == "legal_mapping"


def test_agent_result_is_valid_requires_gaps_or_uncertainty_when_incomplete() -> None:
    incomplete = AgentResult(
        agent="drafting",
        matter_id="AOD-1001",
        anchor_facts=["x"],
        anchor_law=["y"],
        anchor_strategy=["z"],
        anchor_risk=["r"],
        anchor_next=["n"],
        gaps=["needs review"],
        summary="stub",
        confidence=0.5,
        complete=False,
    )
    assert incomplete.is_valid() is True

    suspicious = AgentResult(
        agent="drafting",
        matter_id="AOD-1001",
        anchor_facts=["x"],
        anchor_law=["y"],
        anchor_strategy=["z"],
        anchor_risk=["r"],
        anchor_next=["n"],
        summary="too confident",
        confidence=0.99,
        complete=True,
    )
    assert suspicious.is_valid() is False
