"""Five-Anchors contract for agent outputs (Phase 4+)."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field, model_validator


class AgentResult(BaseModel):
    """Standard envelope returned by PM, Research, Pattern, and Strategy agents."""

    agent: str
    matter_id: str | None = None
    anchor_facts: list[str] = Field(default_factory=list, description="Verified facts tied to sources")
    anchor_law: list[str] = Field(default_factory=list, description="Applicable rules/elements")
    anchor_strategy: list[str] = Field(default_factory=list, description="Recommended strategic moves")
    anchor_risk: list[str] = Field(default_factory=list, description="Risks, gaps, vulnerabilities")
    anchor_next: list[str] = Field(default_factory=list, description="Concrete next actions")
    gaps: list[str] = Field(default_factory=list, description="Blockers or unanswered questions")
    summary: str = ""
    citations: list[str] = Field(default_factory=list)
    confidence: float = Field(ge=0.0, le=1.0, default=0.5)
    metadata: dict[str, Any] = Field(default_factory=dict)
    complete: bool = True
    job_id: str | None = None

    @model_validator(mode="after")
    def enforce_five_anchors(self) -> AgentResult:
        """Flag incomplete results when anchors or gaps are missing."""

        anchors = (
            self.anchor_facts,
            self.anchor_law,
            self.anchor_strategy,
            self.anchor_risk,
            self.anchor_next,
        )
        if self.gaps:
            self.complete = False
            return self
        if not all(anchors):
            self.complete = False
            if not self.gaps:
                missing = []
                names = ("facts", "law", "strategy", "risk", "next")
                for name, items in zip(names, anchors, strict=True):
                    if not items:
                        missing.append(f"anchor_{name}")
                self.gaps = [f"Five-Anchors incomplete: missing {', '.join(missing)}"]
        return self


def assert_complete(result: AgentResult) -> AgentResult:
    """Raise if result is blocked or missing Five-Anchors."""

    if result.gaps and not result.complete:
        return result
    if not result.complete:
        raise ValueError(f"Agent {result.agent} returned incomplete Five-Anchors: {result.gaps}")
    return result
