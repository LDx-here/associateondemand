"""Tests for Part 8.1 system prompt completeness + Part 8.2 section prompts + thinking kwargs."""

from __future__ import annotations

from unittest.mock import patch

from app.services.aos_brief_generator import (
    AOS_SYSTEM_PROMPT,
    _facts_from_drafting_fields,
    generate_aos_brief,
)
from app.services.aos_section_prompts import build_section_prompt, fact_keys_included
from app.services.aos_system_prompt import SYSTEM_PROMPT_PART_8_1
from app.services.llm import aos_max_tokens, aos_model_name, aos_thinking_kwargs, generate_text


def test_part_8_1_system_prompt_is_full_not_truncated():
    sp = SYSTEM_PROMPT_PART_8_1
    assert sp is AOS_SYSTEM_PROMPT
    assert len(sp) > 7000
    # Verbatim Patel quote
    assert (
        'The grant of an application for adjustment of status under section 245 '
        "is a matter of administrative grace"
    ) in sp
    assert "Matter of Patel, 17 I&N Dec. 597 (BIA 1980)" in sp
    # Marin balancing + elevated standard
    assert "Matter of Marin, 16 I&N Dec. 581, 584-85 (BIA 1978)" in sp
    assert "balance the adverse factors evidencing an alien's undesirability" in sp
    # Arai baseline
    assert "Matter of Arai, 13 I&N Dec. 494, 496 (BIA 1970)" in sp
    assert (
        "In the absence of adverse factors, adjustment will ordinarily be granted"
    ) in sp
    # Writing rules 1–12 present
    for n in range(1, 13):
        assert f"{n}." in sp
    assert "12. The balancing section must close with:" in sp
    assert "OUTPUT FORMAT:" in sp
    assert "Do not output anything outside this format." in sp
    assert "Kingdom Counsel Firm" in sp


def test_build_section_prompt_includes_all_client_fact_buckets():
    fields = {
        "applicantName": "Phanpit Sakkhi",
        "pronounSubject": "she",
        "pronounObject": "her",
        "pronounPossessive": "her",
        "caseTheme": "This case concerns a retired nurse whose care is indispensable.",
        "caseThemeBrief": "indispensable caregiving",
        "sectionAHeading": "Ms. Sakkhi's Nursing Career Makes Her Uniquely Qualified",
        "sectionAFacts": "Daily specialized care for autistic USC grandson Saeng.",
        "sectionBHeading": "Community Service and Moral Character",
        "sectionBFacts": "Temple volunteer; tax compliance for five years.",
        "adverseHeading": "The Circumstances of Continued Presence Do Not Diminish This Application",
        "adverseFactorBrief": "an overstay",
        "adverseFacts": "Remained beyond B-2 stay after caregiving need arose.",
        "balancingInventory": "caregiving, community service, clean record",
        "positiveEquities": "Family unity; community ties; employment history as nurse",
        "extremeHardshipFactors": "Grandson would lose specialized care.",
        "departureHarm": "3/10-year bar would apply on departure.",
        "petitionerName": "Daughter USC",
        "petitionerRelationship": "daughter",
        "entryDate": "February 22, 2023",
        "portOfEntry": "Los Angeles",
        "entryVisaType": "B-2",
        "i130ApprovedDate": "August 1, 2023",
        "i485FiledDate": "September 1, 2023",
    }
    facts = _facts_from_drafting_fields(fields, matter_id="MAT-1")
    keys = fact_keys_included(facts)
    assert "applicant" in keys or any(k.startswith("applicant") for k in keys)
    assert any("positive_factors" in k for k in keys)
    assert any("case_architecture" in k for k in keys)
    assert any("adverse_factors" in k for k in keys)

    for sid in (
        "section_a",
        "section_b",
        "section_d_adverse",
        "section_e_balancing",
        "argument_intro",
        "statutory_eligibility",
    ):
        prompt = build_section_prompt({"section_id": sid}, facts)
        assert "Phanpit Sakkhi" in prompt
        assert "ALL AVAILABLE CLIENT FACTS" in prompt
        assert "case_theme" in prompt.lower() or "Case theme" in prompt
        # Full inventory appendix includes nested buckets
        assert "positive_factors" in prompt
        assert "family_ties" in prompt or "Family members" in prompt
        assert "she/her/her" in prompt or "pronoun" in prompt.lower()


def test_section_a_prompt_has_family_and_citations():
    facts = _facts_from_drafting_fields(
        {
            "applicantName": "Phanpit Sakkhi",
            "sectionAHeading": "Primary Equity Claim",
            "sectionAFacts": "Care for grandson.",
            "caseTheme": "Caregiving theme",
            "qualifyingRelative": "Daughter",
            "petitionerRelationship": "daughter",
        }
    )
    prompt = build_section_prompt({"section_id": "section_a"}, facts)
    assert "PRIMARY EQUITY SECTION FACTS" in prompt
    assert "Matter of Marin" in prompt
    assert "Matter of Mendez-Morales" in prompt
    assert "Care for grandson" in prompt


def test_aos_thinking_kwargs_and_max_tokens():
    thinking = aos_thinking_kwargs()
    assert thinking == {"type": "enabled", "budget_tokens": 8192}
    assert aos_max_tokens() > thinking["budget_tokens"]
    assert aos_model_name()  # non-empty default


def test_generate_text_passes_thinking_and_omits_temperature(monkeypatch):
    captured: dict = {}

    class FakeResp:
        status_code = 200

        def json(self):
            return {"content": [{"type": "text", "text": "HEADING: X\nBODY: y\nFOOTNOTES:\n1. z"}]}

        @property
        def text(self):
            return ""

    class FakeClient:
        def __init__(self, *a, **k):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *a):
            return False

        def post(self, url, headers=None, json=None):
            captured["json"] = json
            return FakeResp()

    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-test-key")
    # This test covers the thinking/temperature payload, not PII handling;
    # pseudonymization fails closed without a Presidio analyzer and would
    # short-circuit the call before a payload is ever built.
    monkeypatch.setenv("AOD_PSEUDONYMIZE", "off")
    with patch("app.services.llm.httpx.Client", FakeClient):
        out = generate_text(
            system="sys",
            user="user",
            max_tokens=16000,
            temperature=0.2,
            model="claude-sonnet-4-6",
            thinking={"type": "enabled", "budget_tokens": 8192},
        )
    assert out and "BODY" in out
    assert captured["json"]["thinking"] == {"type": "enabled", "budget_tokens": 8192}
    assert "temperature" not in captured["json"]
    assert captured["json"]["max_tokens"] >= 8192
    assert captured["json"]["system"] == "sys"


def test_generate_aos_brief_api_path_uses_full_system_and_thinking(monkeypatch, tmp_path):
    captured: list[dict] = []

    def fake_generate_text(**kwargs):
        captured.append(kwargs)
        return (
            "HEADING: Test Heading\n"
            "BODY: This is not a case about an overstay. It is a case about care. "
            "A favorable exercise of discretion is both legally supported and compelled "
            "by the facts of this record.\n"
            "FOOTNOTES:\n1. Matter of Arai, 13 I&N Dec. 494, 496 (BIA 1970)."
        )

    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-test-key")
    # This test covers the thinking/temperature payload, not PII handling;
    # pseudonymization fails closed without a Presidio analyzer and would
    # short-circuit the call before a payload is ever built.
    monkeypatch.setenv("AOD_PSEUDONYMIZE", "off")
    monkeypatch.setenv("AOD_AOS_USE_API", "1")
    with patch("app.services.llm.is_configured", return_value=True), patch(
        "app.services.llm.generate_text", side_effect=fake_generate_text
    ):
        result = generate_aos_brief(
            None,
            {
                "fields": {
                    "applicantName": "Phanpit Sakkhi",
                    "caseTheme": "This case concerns a retired nurse whose care of her autistic U.S. citizen grandson is indispensable.",
                    "caseThemeBrief": "indispensable care of an autistic U.S. citizen grandson",
                    "adverseFactorBrief": "an overstay",
                    "sectionAHeading": "Ms. Sakkhi's Nursing Career Makes Her Uniquely Qualified to Care for Her Autistic U.S. Citizen Grandson",
                    "sectionAFacts": "Daily care.",
                    "sectionBHeading": "Community Service Reinforces the Equities",
                    "sectionBFacts": "Temple volunteer.",
                    "adverseHeading": "The Circumstances of Ms. Sakkhi's Continued Presence Do Not Diminish the Strength of This Application",
                    "adverseFacts": "Overstay after caregiving need.",
                    "balancingInventory": "care, community, clean record",
                    "entryDate": "February 22, 2023",
                    "portOfEntry": "LAX",
                    "entryVisaType": "B-2",
                    "petitionerName": "Daughter",
                    "petitionerRelationship": "daughter",
                    "i130ApprovedDate": "2023-08-01",
                    "i485FiledDate": "2023-09-01",
                },
                "matter_id": "T-1",
            },
            tmp_path / "out.docx",
            use_api=True,
        )

    assert captured, "expected FILL sections to call generate_text"
    for call in captured:
        assert call["system"] == SYSTEM_PROMPT_PART_8_1
        assert len(call["system"]) > 7000
        assert call["thinking"] == {"type": "enabled", "budget_tokens": 8192}
        assert "ALL AVAILABLE CLIENT FACTS" in call["user"]
        assert "Phanpit Sakkhi" in call["user"]
    meta = result["prompt_meta"]
    assert meta["system_prompt_chars"] > 7000
    assert meta["thinking"]["budget_tokens"] == 8192
    assert meta["fact_key_count"] > 10
    assert result["api_used"] is True
