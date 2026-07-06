"""Matter context formatting tests."""

from __future__ import annotations

import json

from app.services.matter_context import format_assessment_data, format_drafting_facts


def test_format_assessment_data_structured_json() -> None:
    raw = json.dumps(
        {
            "claimType": "Asylum — PSG",
            "legalStandard": "Well-founded fear",
            "overallAssessment": "Strong on persecution narrative; weak on nexus.",
            "immediateActions": ["Obtain country conditions memo", "", "Schedule client call", ""],
        }
    )
    text = format_assessment_data(raw)
    assert "Claim type: Asylum — PSG" in text
    assert "Overall assessment:" in text
    assert "Obtain country conditions memo" in text


def test_format_assessment_data_empty() -> None:
    assert format_assessment_data("") == ""
    assert format_assessment_data(None) == ""


def test_format_drafting_facts_immigration() -> None:
    raw = {
        "v": 1,
        "practiceArea": "immigration",
        "caseType": "Immigration - Asylum",
        "fields": {
            "clientStatus": "Pending asylum",
            "reliefSought": "AOS approval",
            "entryDate": "2019-01-15",
            "supportingDocs": ["Passport or national ID", "I-94 / entry record"],
        },
        "additionalNotes": "Priority interview scheduled.",
    }
    text = format_drafting_facts(raw)
    assert "Structured facts for drafting" in text
    assert "Current immigration status: Pending asylum" in text
    assert "Passport or national ID" in text
    assert "Priority interview scheduled." in text


def test_format_drafting_facts_empty() -> None:
    assert format_drafting_facts(None) == ""
    assert format_drafting_facts({"v": 2}) == ""
