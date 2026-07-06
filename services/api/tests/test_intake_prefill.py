"""Tests for intake OCR → drafting-facts prefill heuristics (Phase 2)."""

from __future__ import annotations

import re


def extract_heuristic_facts(text: str) -> list[dict[str, str]]:
    """Mirror of web/src/lib/intake-prefill.ts extractHeuristicFactsFromText (smoke test)."""
    facts: list[dict[str, str]] = []
    if not text.strip():
        return facts

    for match in re.finditer(r"\b\d{4}-\d{2}-\d{2}\b", text):
        facts.append({"fact_type": "date", "value": match.group()})

    if re.search(r"hardship", text, re.I):
        facts.append({"fact_type": "hardship_narrative", "value": "hardship referenced"})

    if re.search(r"212\s*\(\s*a\s*\)", text, re.I):
        facts.append({"fact_type": "inadmissibility", "value": "INA §212(a) referenced"})

    return facts


def test_extract_heuristic_facts_immigration_snippet() -> None:
    text = "Entry 2019-03-15. Extreme hardship to U.S. citizen spouse. INA §212(a)(9)(B)(i)."
    facts = extract_heuristic_facts(text)
    types = {f["fact_type"] for f in facts}
    assert "date" in types
    assert "hardship_narrative" in types
    assert "inadmissibility" in types
