"""Regex/heuristic fact extraction from OCR text."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any

from app.agents._base import FiveAnchorsAgent
from app.models.agent_result import AgentResult

DATE_PATTERNS = [
    r"\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+\d{1,2},?\s+\d{4}\b",
    r"\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b",
    r"\b\d{4}-\d{2}-\d{2}\b",
]

NAME_PATTERNS = [
    r"\b(?:Mr\.|Ms\.|Mrs\.|Dr\.)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b",
    r"\b[A-Z][a-z]+\s+[A-Z][a-z]+\b",
]

A_NUMBER_PATTERN = r"\bA\d{8,9}\b"

EVENT_KEYWORDS = {
    "hearing": ["hearing", "master calendar", "individual hearing"],
    "interview": ["asylum interview", "credible fear", "interview"],
    "arrest": ["arrest", "detained", "custody", "ice"],
    "filing": ["filed", "petition", "application submitted"],
    "removal": ["removal", "deportation", "nta", "notice to appear"],
    "travel": ["entered", "border", "port of entry", "cbp"],
}


@dataclass
class ExtractedFactRecord:
    fact_type: str
    value: str
    context: str
    confidence: float
    source_page: int | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "fact_type": self.fact_type,
            "value": self.value,
            "context": self.context,
            "confidence": self.confidence,
            "source_page": self.source_page,
        }


class FactExtractionAgent(FiveAnchorsAgent):
    agent_name = "fact_extraction"

    def extract(self, text: str) -> list[ExtractedFactRecord]:
        if not text.strip():
            return []

        facts: list[ExtractedFactRecord] = []
        seen: set[tuple[str, str]] = set()

        def add(fact_type: str, value: str, context: str, confidence: float) -> None:
            key = (fact_type, value.strip().lower())
            if not value.strip() or key in seen:
                return
            seen.add(key)
            facts.append(
                ExtractedFactRecord(
                    fact_type=fact_type,
                    value=value.strip(),
                    context=context[:300],
                    confidence=confidence,
                )
            )

        for pattern in DATE_PATTERNS:
            for match in re.finditer(pattern, text, re.I):
                start = max(0, match.start() - 60)
                end = min(len(text), match.end() + 60)
                add("date", match.group(), text[start:end], 0.78)

        for match in re.finditer(A_NUMBER_PATTERN, text):
            start = max(0, match.start() - 40)
            end = min(len(text), match.end() + 40)
            add("a_number", match.group(), text[start:end], 0.9)

        for pattern in NAME_PATTERNS:
            for match in re.finditer(pattern, text):
                value = match.group()
                if value.lower() in {"united states", "department of", "immigration court"}:
                    continue
                start = max(0, match.start() - 40)
                end = min(len(text), match.end() + 40)
                add("name", value, text[start:end], 0.55)

        lower = text.lower()
        for event_type, keywords in EVENT_KEYWORDS.items():
            for kw in keywords:
                idx = lower.find(kw)
                if idx >= 0:
                    start = max(0, idx - 50)
                    end = min(len(text), idx + len(kw) + 80)
                    add("event", event_type.replace("_", " "), text[start:end], 0.65)
                    break

        # Case/receipt numbers
        for match in re.finditer(r"\b(?:Receipt|Case|File)\s*(?:No\.?|#)?\s*:?\s*([A-Z0-9-]{6,})\b", text, re.I):
            start = max(0, match.start() - 30)
            end = min(len(text), match.end() + 30)
            add("reference_number", match.group(1), text[start:end], 0.72)

        return facts[:50]

    def run(self, **kwargs: Any) -> AgentResult:
        text: str = kwargs.get("text", "")
        matter_id: str | None = kwargs.get("matter_id")
        facts = self.extract(text)
        fact_summaries = [f"{f.fact_type}: {f.value}" for f in facts[:8]]
        avg_conf = sum(f.confidence for f in facts) / len(facts) if facts else 0.0
        return self._result(
            matter_id,
            anchor_facts=fact_summaries or ["No structured facts detected in OCR output."],
            anchor_law=["Map dates and events to procedural deadlines and element tests."],
            anchor_strategy=["Prioritize hearing dates and A-numbers for docket cross-check."],
            anchor_risk=["OCR errors may corrupt names/dates — verify against source scan."],
            anchor_next=["Attorney review extracted facts", "Accept or edit in matter workbench"],
            summary=f"Extracted {len(facts)} fact(s) from document text.",
            confidence=round(avg_conf, 3) if facts else 0.2,
            metadata={"facts": [f.to_dict() for f in facts], "count": len(facts)},
        )


fact_extraction_agent = FactExtractionAgent()
