"""Tests for case-type-aware fact extraction hints."""

from __future__ import annotations

from app.agents.fact_extraction_agent import fact_extraction_agent


def test_extract_with_aos_context_hints() -> None:
    text = (
        "Client seeks AOS with I-601A waiver. Qualifying relative: U.S. citizen spouse Maria Lopez. "
        "Extreme hardship factors include medical needs and financial dependence. "
        "Grounds of inadmissibility under INA §212(a)(9)(B)(i) unlawful presence. "
        "Positive factors: community service and tax compliance."
    )
    context = {
        "document_category": "case_assessment",
        "fact_field_hints": [
            {"id": "qualifyingRelative", "label": "Qualifying relative and relationship"},
            {"id": "extremeHardshipFactors", "label": "Extreme hardship factors"},
            {"id": "inadmissibilityGrounds", "label": "Grounds of inadmissibility (INA §212(a))"},
            {"id": "positiveEquities", "label": "Positive discretionary factors"},
        ],
    }
    facts = fact_extraction_agent.extract(text, context=context)
    field_ids = {f.field_id for f in facts if f.field_id}
    assert "qualifyingRelative" in field_ids or any("qualifying" in f.value.lower() for f in facts)
    assert len(facts) >= 4


def test_extract_without_context_still_finds_dates() -> None:
    text = "Master calendar hearing scheduled for March 15, 2026. A123456789."
    facts = fact_extraction_agent.extract(text)
    types = {f.fact_type for f in facts}
    assert "date" in types
    assert "a_number" in types
