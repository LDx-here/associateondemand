"""Agent routing and envelope tests."""

from __future__ import annotations

from app.agents.pm_orchestrator import _agent_deliverable_ready, classify_instruction
from app.models.agent_result import AgentResult, Uncertainty


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


def test_deliverable_ready_with_disclosure_gaps() -> None:
    result = AgentResult(
        agent="drafting",
        matter_id="AOD-1001",
        anchor_facts=["x"],
        anchor_law=["y"],
        anchor_strategy=["z"],
        anchor_risk=["r"],
        anchor_next=["n"],
        gaps=["Attorney review required before filing or client communication."],
        uncertain=[
            Uncertainty(item="draft", confidence=0.8, reason="LLM draft"),
        ],
        summary="Draft complete.",
        metadata={"full_memo": "MEMORANDUM\n\nDraft body."},
        complete=False,
    )
    assert _agent_deliverable_ready(result, "drafting") is True


def test_deliverable_not_ready_without_memo() -> None:
    result = AgentResult(
        agent="drafting",
        matter_id="AOD-1001",
        anchor_facts=["x"],
        anchor_law=["y"],
        anchor_strategy=["z"],
        anchor_risk=["r"],
        anchor_next=["n"],
        gaps=["ANTHROPIC_API_KEY not configured — drafting cannot run LLM path."],
        summary="blocked",
        complete=False,
    )
    assert _agent_deliverable_ready(result, "drafting") is False
