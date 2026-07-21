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

CONTEXT_KEYWORD_HINTS: dict[str, tuple[str, ...]] = {
    "extremeHardshipFactors": ("extreme hardship", "hardship to", "hardship factors"),
    "inadmissibilityGrounds": ("212(a)", "inadmissib", "unlawful presence", "misrepresentation"),
    "qualifyingRelative": ("qualifying relative", "u.s. citizen spouse", "lpr spouse", "citizen parent"),
    "positiveEquities": ("positive factor", "community service", "rehabilitation", "tax compliance"),
    "adverseFactors": ("criminal", "prior denial", "negative factor", "adverse factor"),
    "reliefSought": ("relief sought", "aos", "adjustment of status", "waiver"),
    "clientStatus": ("current status", "immigration status", "out of status", "lawful permanent"),
}


@dataclass
class ExtractedFactRecord:
    fact_type: str
    value: str
    context: str
    confidence: float
    source_page: int | None = None
    field_id: str | None = None

    def to_dict(self) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "fact_type": self.fact_type,
            "value": self.value,
            "context": self.context,
            "confidence": self.confidence,
            "source_page": self.source_page,
        }
        if self.field_id:
            payload["fieldId"] = self.field_id
        return payload


class FactExtractionAgent(FiveAnchorsAgent):
    agent_name = "fact_extraction"

    def extract(self, text: str, *, context: dict[str, Any] | None = None) -> list[ExtractedFactRecord]:
        if not text.strip():
            return []

        facts: list[ExtractedFactRecord] = []
        seen: set[tuple[str, str]] = set()

        def add(
            fact_type: str,
            value: str,
            ctx: str,
            confidence: float,
            *,
            field_id: str | None = None,
        ) -> None:
            key = (fact_type, value.strip().lower())
            if not value.strip() or key in seen:
                return
            seen.add(key)
            facts.append(
                ExtractedFactRecord(
                    fact_type=fact_type,
                    value=value.strip(),
                    context=ctx[:300],
                    confidence=confidence,
                    field_id=field_id,
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

        for match in re.finditer(r"\b(?:Receipt|Case|File)\s*(?:No\.?|#)?\s*:?\s*([A-Z0-9-]{6,})\b", text, re.I):
            start = max(0, match.start() - 30)
            end = min(len(text), match.end() + 30)
            add("reference_number", match.group(1), text[start:end], 0.72)

        if context:
            facts.extend(self._extract_from_context_hints(text, context, seen))

        return facts[:50]

    def _extract_from_context_hints(
        self,
        text: str,
        context: dict[str, Any],
        seen: set[tuple[str, str]],
    ) -> list[ExtractedFactRecord]:
        hints = context.get("fact_field_hints") or []
        if not isinstance(hints, list):
            hints = []

        legal_elements = context.get("legal_elements") or []
        if isinstance(legal_elements, list):
            for element in legal_elements[:12]:
                label = str(element).strip()
                if not label:
                    continue
                hints.append({"id": label.lower().replace(" ", "_"), "label": label})

        extracted: list[ExtractedFactRecord] = []
        lower = text.lower()

        for hint in hints:
            if not isinstance(hint, dict):
                continue
            field_id = str(hint.get("id") or "").strip()
            label = str(hint.get("label") or field_id).strip()
            if not field_id and not label:
                continue

            keywords = CONTEXT_KEYWORD_HINTS.get(field_id, ())
            search_terms = [label.lower()] + [k.lower() for k in keywords if k]
            idx = -1
            matched_term = ""
            for term in search_terms:
                if len(term) < 4:
                    continue
                pos = lower.find(term)
                if pos >= 0:
                    idx = pos
                    matched_term = term
                    break
            if idx < 0:
                continue

            start = max(0, idx - 20)
            end = min(len(text), idx + len(matched_term) + 160)
            snippet = text[start:end].strip()
            if len(snippet) < 8:
                continue

            key = (field_id or label, snippet.lower())
            if key in seen:
                continue
            seen.add(key)
            extracted.append(
                ExtractedFactRecord(
                    fact_type=field_id or "assessment_field",
                    value=snippet,
                    context=snippet[:300],
                    confidence=0.68,
                    field_id=field_id or None,
                )
            )

        return extracted

    def run(self, **kwargs: Any) -> AgentResult:
        text: str = kwargs.get("text", "")
        matter_id: str | None = kwargs.get("matter_id")
        context: dict[str, Any] | None = kwargs.get("context")
        facts = self.extract(text, context=context)
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
