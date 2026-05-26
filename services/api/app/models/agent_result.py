"""Five-Anchors AgentResult contract (BUILD_SPEC §8).

This module is the source of truth for every agent return envelope under
``services/api/app/agents/``. BUILD_SPEC §8 defines a nested ``FiveAnchors``
shape with discrete ``Uncertainty``, ``GapQuestion``, and ``SourceRef`` models
plus an ``is_valid()`` guard that rejects any result claiming full certainty
(no gaps AND no uncertainties).

The Phase 4 agents shipped a flat ``anchor_facts/anchor_law/...`` shape with
``gaps: list[str]``. To avoid churning ~15 callsites we keep those legacy
fields and additionally surface the BUILD_SPEC nested models. A
``model_validator`` mirrors legacy data into the new shape so both consumers
see the same envelope.
"""

from __future__ import annotations

from enum import Enum
from typing import Any

from pydantic import BaseModel, Field, model_validator


class ConfidenceLevel(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class Uncertainty(BaseModel):
    """An item the agent is not fully sure about."""

    item: str
    confidence: float = Field(ge=0.0, le=1.0, default=0.5)
    reason: str = ""


class GapQuestion(BaseModel):
    """A question the agent needs answered before proceeding."""

    question: str
    priority: int = 3
    why_it_matters: str = ""


class SourceRef(BaseModel):
    """A citation backing a claim produced by the agent."""

    claim: str
    source: str
    url: str | None = None
    date: str | None = None


class FiveAnchors(BaseModel):
    """The Five-Anchors structured context (BUILD_SPEC §8)."""

    facts: list[str] = Field(default_factory=list)
    legal_context: list[str] = Field(default_factory=list)
    documents_evidence: list[str] = Field(default_factory=list)
    procedural_posture: list[str] = Field(default_factory=list)
    uncertainty: list[str] = Field(default_factory=list)


class AgentResult(BaseModel):
    """Standard envelope returned by every agent.

    BUILD_SPEC §8 canonical fields:
      * ``agent_name`` / ``matter_id``
      * ``identified`` (structured payload)
      * ``uncertain`` (list[Uncertainty])
      * ``gap_questions`` (list[GapQuestion]) — BUILD_SPEC calls this ``gaps``
        but the legacy flat ``gaps: list[str]`` field already exists; we keep
        both and ``is_valid()`` consults either.
      * ``sources`` (list[SourceRef])
      * ``anchors`` (FiveAnchors)
      * ``summary``
      * ``next_steps``

    Legacy fields (Phase 4):
      * ``agent`` (alias for ``agent_name``)
      * ``anchor_facts/anchor_law/anchor_strategy/anchor_risk/anchor_next``
      * ``gaps`` (list[str])
      * ``citations`` / ``confidence`` / ``complete`` / ``metadata`` / ``job_id``
    """

    # BUILD_SPEC §8 canonical shape.
    agent_name: str = ""
    matter_id: str | None = None
    identified: dict[str, Any] = Field(default_factory=dict)
    uncertain: list[Uncertainty] = Field(default_factory=list)
    gap_questions: list[GapQuestion] = Field(default_factory=list)
    sources: list[SourceRef] = Field(default_factory=list)
    anchors: FiveAnchors = Field(default_factory=FiveAnchors)
    summary: str = ""
    next_steps: list[str] = Field(default_factory=list)

    # Legacy Phase 4 shape — kept authoritative for existing agents.
    agent: str = ""
    anchor_facts: list[str] = Field(default_factory=list)
    anchor_law: list[str] = Field(default_factory=list)
    anchor_strategy: list[str] = Field(default_factory=list)
    anchor_risk: list[str] = Field(default_factory=list)
    anchor_next: list[str] = Field(default_factory=list)
    gaps: list[str] = Field(default_factory=list)
    citations: list[str] = Field(default_factory=list)
    confidence: float = Field(ge=0.0, le=1.0, default=0.5)
    metadata: dict[str, Any] = Field(default_factory=dict)
    complete: bool = True
    job_id: str | None = None

    @model_validator(mode="after")
    def _sync_legacy_and_spec(self) -> "AgentResult":
        """Keep legacy anchor_* + agent fields in sync with BUILD_SPEC shape."""

        if not self.agent_name and self.agent:
            self.agent_name = self.agent
        if not self.agent and self.agent_name:
            self.agent = self.agent_name

        if not self.anchors.facts and self.anchor_facts:
            self.anchors.facts = list(self.anchor_facts)
        if not self.anchors.legal_context and self.anchor_law:
            self.anchors.legal_context = list(self.anchor_law)
        if not self.anchors.documents_evidence and self.anchor_strategy:
            self.anchors.documents_evidence = list(self.anchor_strategy)
        if not self.anchors.procedural_posture and self.anchor_next:
            self.anchors.procedural_posture = list(self.anchor_next)
        if not self.anchors.uncertainty and self.anchor_risk:
            self.anchors.uncertainty = list(self.anchor_risk)

        if not self.next_steps and self.anchor_next:
            self.next_steps = list(self.anchor_next)

        # Pull plain-string gaps into gap_questions when caller didn't supply them.
        if not self.gap_questions and self.gaps:
            self.gap_questions = [
                GapQuestion(question=g, priority=3, why_it_matters="")
                for g in self.gaps
            ]

        anchors_present = (
            self.anchor_facts,
            self.anchor_law,
            self.anchor_strategy,
            self.anchor_risk,
            self.anchor_next,
        )
        if self.gaps or self.gap_questions:
            self.complete = False
        elif not all(anchors_present):
            self.complete = False
            names = ("facts", "law", "strategy", "risk", "next")
            missing = [
                f"anchor_{name}"
                for name, items in zip(names, anchors_present)
                if not items
            ]
            if missing and not self.gaps:
                self.gaps = [f"Five-Anchors incomplete: missing {', '.join(missing)}"]
                self.gap_questions = [
                    GapQuestion(question=g, priority=2, why_it_matters="Anchor missing.")
                    for g in self.gaps
                ]

        return self

    def is_valid(self) -> bool:
        """BUILD_SPEC §8 contract.

        Returns False when the agent claims full certainty (no gaps AND no
        uncertainties) — humans should review such outputs. Returns True
        when at least one gap or uncertainty is disclosed.

        ``complete`` (Phase 4) is intentionally NOT consulted here — that
        field signals whether the agent finished its work, which is a
        separate concern from whether the output is trustworthy. The PM
        Orchestrator checks both ``is_valid()`` and ``complete`` before
        promoting an agent result.
        """

        has_gap = bool(self.gaps) or bool(self.gap_questions)
        has_uncertain = bool(self.uncertain)
        if not has_gap and not has_uncertain:
            return False
        return True


def assert_complete(result: AgentResult) -> AgentResult:
    """Raise when an agent returns an incomplete envelope without flagging gaps."""

    if result.gaps and not result.complete:
        return result
    if not result.complete:
        raise ValueError(
            f"Agent {result.agent_name or result.agent} returned incomplete "
            f"Five-Anchors: {result.gaps}"
        )
    return result
