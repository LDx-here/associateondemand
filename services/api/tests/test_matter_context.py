"""Matter context formatting tests."""

from __future__ import annotations

import json

from app.services.matter_context import (
    format_assessment_data,
    format_assessment_document,
    format_drafting_facts,
)


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


def test_format_assessment_document_uploaded_scan() -> None:
    raw = {
        "v": 1,
        "documentId": "doc-1",
        "title": "client-assessment.pdf",
        "ocrText": "Relief sought: adjustment of status. Entry: 2019.",
        "facts": [{"fact_type": "relief", "value": "AOS", "confidence": 0.8}],
    }
    text = format_assessment_document(raw)
    assert "Case assessment document (uploaded scan)" in text
    assert "client-assessment.pdf" in text
    assert "relief: AOS" in text


def test_format_assessment_document_empty() -> None:
    assert format_assessment_document(None) == ""
    assert format_assessment_document({"v": 2}) == ""
