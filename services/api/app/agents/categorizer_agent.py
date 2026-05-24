"""Heuristic document categorizer for intake pipeline."""

from __future__ import annotations

import re
from typing import Any

from app.agents._base import FiveAnchorsAgent
from app.models.agent_result import AgentResult

_CATEGORY_RULES: list[tuple[str, list[str]]] = [
    ("court_filing", [r"\b(court|petition|motion|brief|order|judgment|docket)\b"]),
    ("government_id", [r"\b(passport|driver.?s license|a-number|alien registration)\b"]),
    ("country_conditions", [r"\b(country report|human rights|state department|dos)\b"]),
    ("correspondence", [r"\b(dear|sincerely|letter|email|re:)\b"]),
    ("medical", [r"\b(medical|diagnosis|hospital|physician|treatment)\b"]),
    ("financial", [r"\b(tax|bank|invoice|receipt|w-2|pay stub)\b"]),
    ("hearing_notice", [r"\b(hearing|master calendar|individual hearing|noid|nta)\b"]),
    ("affidavit", [r"\b(affidavit|declaration|sworn statement|i declare under penalty)\b"]),
]


class CategorizerAgent(FiveAnchorsAgent):
    agent_name = "categorizer"

    def categorize(self, text: str, filename: str = "") -> dict[str, Any]:
        sample = f"{filename}\n{text[:8000]}".lower()
        scores: dict[str, int] = {}
        for category, patterns in _CATEGORY_RULES:
            hits = sum(len(re.findall(p, sample, re.I)) for p in patterns)
            if hits:
                scores[category] = hits
        if not scores:
            return {"category": "uncategorized", "confidence": 0.35, "signals": []}
        best = max(scores, key=scores.get)
        total_hits = scores[best]
        confidence = min(0.35 + total_hits * 0.12, 0.92)
        return {"category": best, "confidence": round(confidence, 3), "signals": list(scores.keys())}

    def run(self, **kwargs: Any) -> AgentResult:
        text: str = kwargs.get("text", "")
        filename: str = kwargs.get("filename", "")
        matter_id: str | None = kwargs.get("matter_id")
        result = self.categorize(text, filename)
        category = result["category"]
        return self._result(
            matter_id,
            anchor_facts=[f"Document classified as {category}."],
            anchor_law=["Category informs element mapping and evidence weight."],
            anchor_strategy=[f"Route {category} docs to relevant assessment checklist sections."],
            anchor_risk=["Heuristic only — attorney should confirm category before filing use."],
            anchor_next=["Review category in matter workbench", "Correct miscategorization if needed"],
            summary=f"Categorized as {category} (confidence {result['confidence']:.0%}).",
            confidence=result["confidence"],
            metadata=result,
        )


categorizer_agent = CategorizerAgent()
