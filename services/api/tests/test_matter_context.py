"""Matter context formatting tests."""

from __future__ import annotations

import json

from app.services.matter_context import format_assessment_data


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
