"""Five-Anchors agent base contract for intake agents."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

from app.models.agent_result import AgentResult


class FiveAnchorsAgent(ABC):
    """Base class for agents that emit the Five-Anchors envelope."""

    agent_name: str = "base"

    @abstractmethod
    def run(self, **kwargs: Any) -> AgentResult:
        """Execute agent logic and return a Five-Anchors result."""

    def _result(
        self,
        matter_id: str | None,
        *,
        anchor_facts: list[str] | None = None,
        anchor_law: list[str] | None = None,
        anchor_strategy: list[str] | None = None,
        anchor_risk: list[str] | None = None,
        anchor_next: list[str] | None = None,
        summary: str = "",
        citations: list[str] | None = None,
        confidence: float = 0.5,
        metadata: dict[str, Any] | None = None,
    ) -> AgentResult:
        return AgentResult(
            agent=self.agent_name,
            matter_id=matter_id,
            anchor_facts=anchor_facts or [],
            anchor_law=anchor_law or [],
            anchor_strategy=anchor_strategy or [],
            anchor_risk=anchor_risk or [],
            anchor_next=anchor_next or [],
            summary=summary,
            citations=citations or [],
            confidence=confidence,
            metadata=metadata or {},
        )
