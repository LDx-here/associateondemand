"""Tests for LLM fact enrichment helpers."""

from __future__ import annotations

from unittest.mock import patch

from app.services.fact_enrichment import (
    enrich_facts_with_llm,
    heuristic_facts_need_enrichment,
    merge_enrichment_into_payload,
)


def test_heuristic_facts_need_enrichment_detects_name_spam() -> None:
    facts = [
        {"fact_type": "name", "value": "John Smith"},
        {"fact_type": "name", "value": "Maria Lopez"},
        {"fact_type": "name", "value": "USCIS Office"},
    ]
    assert heuristic_facts_need_enrichment(facts) is True


def test_heuristic_facts_need_enrichment_skips_mapped_facts() -> None:
    facts = [
        {"fact_type": "qualifyingRelative", "value": "Spouse", "fieldId": "qualifyingRelative"},
        {"fact_type": "date", "value": "March 1, 2026"},
    ]
    assert heuristic_facts_need_enrichment(facts) is False


def test_enrich_facts_without_api_key_returns_warning() -> None:
    with patch("app.services.fact_enrichment.is_configured", return_value=False):
        result = enrich_facts_with_llm(
            ocr_text="Qualifying relative: U.S. citizen spouse Maria Lopez.",
            heuristic_facts=[{"fact_type": "name", "value": "Maria Lopez"}],
            context={"case_type": "AOS waiver", "practice_area": "immigration"},
        )
    assert result["enrichment_status"] == "heuristic_only"
    assert "ANTHROPIC_API_KEY" in result.get("enrichment_warning", "")
    assert result["facts"][0]["value"] == "Maria Lopez"


def test_enrich_facts_with_mocked_llm() -> None:
    llm_json = """{
      "facts": [
        {
          "label": "Qualifying relative — spouse",
          "fact_type": "qualifying_relative",
          "value": "Maria Lopez (U.S. citizen spouse)",
          "legal_element": "Extreme hardship to qualifying relative",
          "legal_element_id": "extreme-hardship",
          "field_id": "qualifyingRelative",
          "element_fit": "Identifies the U.S. citizen spouse as the qualifying relative for hardship analysis.",
          "context": "Qualifying relative: U.S. citizen spouse Maria Lopez",
          "confidence": 0.88
        }
      ],
      "summary": "Mapped spouse to hardship element."
    }"""
    with patch("app.services.fact_enrichment.is_configured", return_value=True):
        with patch("app.services.fact_enrichment.generate_text", return_value=llm_json):
            result = enrich_facts_with_llm(
                ocr_text="Qualifying relative: U.S. citizen spouse Maria Lopez.",
                heuristic_facts=[{"fact_type": "name", "value": "Maria Lopez"}],
                context={
                    "case_type": "AOS waiver",
                    "practice_area": "immigration",
                    "fact_field_hints": [
                        {"id": "qualifyingRelative", "label": "Qualifying relative and relationship"}
                    ],
                },
            )
    assert result["enrichment_status"] == "enriched"
    assert result["facts"][0]["label"] == "Qualifying relative — spouse"
    assert result["facts"][0]["fieldId"] == "qualifyingRelative"
    assert result["facts"][0]["elementFit"]


def test_merge_enrichment_into_payload_assigns_ids() -> None:
    merged = merge_enrichment_into_payload(
        [{"fact_type": "name", "value": "X"}],
        {"facts": [{"fact_type": "client", "value": "Y"}]},
    )
    assert len(merged) == 1
    assert merged[0]["id"]
