"""Tests for AOS fact extract service."""

from __future__ import annotations

from app.services.aos_fact_extract import extract_aos_facts, heuristic_extract_aos_facts


SAMPLE = """
Applicant Maria Elena Rodriguez, A-123456789. Entered the U.S. on March 15, 2019 at Laredo, Texas on B-2 visa.
U.S. citizen daughter Ana is petitioner. I-130 approved January 12, 2021. I-485 filed June 3, 2022.
Client has been out of status since visa expired. Primary equity: 40-year nursing career caring for autistic
U.S. citizen grandson Daniel — IEP at school, no other caregiver. Extreme hardship to daughter if applicant departs.
Positive factors: tax compliance, church volunteer, long residence. Prior overstay only adverse factor.
"""


def test_heuristic_extract_aos_facts_finds_key_fields() -> None:
    result = heuristic_extract_aos_facts(SAMPLE)
    fields = result["fields"]
    assert fields["aNumber"]
    assert fields["entryDate"] or fields["clientStatus"]
    assert fields["positiveEquities"] or fields["sectionAFacts"]
    assert result["extraction_mode"] == "heuristic"


def test_extract_aos_facts_force_heuristic() -> None:
    result = extract_aos_facts(SAMPLE, force_heuristic=True)
    assert result["extraction_mode"] == "heuristic"
    assert isinstance(result["fields"], dict)


def test_heuristic_empty_summary() -> None:
    result = heuristic_extract_aos_facts("")
    assert result["confidence"] == "low"
    assert all(v == "" for v in result["fields"].values())
