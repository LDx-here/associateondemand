"""AOS Output Fix — PRESERVE verbatim + paragraph library FILL (no API)."""

from __future__ import annotations

import tempfile
from pathlib import Path

from app.services.aos_brief_generator import (
    assemble_fill_section_no_api,
    assemble_preserve_section,
    generate_aos_brief,
)
from app.services.aos_paragraph_library import (
    evaluate_selection_logic,
    fill_section,
    library_loaded,
    load_paragraph_library,
)
from app.services.brief_parser.aos_discretionary import (
    DEFAULT_LEGAL_STANDARD,
    build_default_aos_template,
    is_empty_or_label_preserve,
    merge_canonical_preserve_sections,
)


def _autistic_fixture_facts():
    return {
        "case_facts": {
            "applicant": {
                "full_name": "Phanpit Sakkhi",
                "a_number": "A-123456789",
                "pronoun_subject": "she",
                "pronoun_object": "her",
                "pronoun_possessive": "her",
            },
            "applicant_full_name": "Phanpit Sakkhi",
            "entry_date": "February 22, 2023",
            "port_of_entry": "Los Angeles",
            "entry_visa_type": "B-2",
            "petitioner_name": "Daughter USC",
            "petitioner_relationship": "daughter",
            "i130_approved_date": "August 1, 2023",
            "i485_filed_date": "September 1, 2023",
            "case_theme": (
                "This case concerns a retired nurse whose care of her autistic U.S. citizen "
                "grandson is indispensable."
            ),
            "case_theme_brief": "indispensable care of an autistic U.S. citizen grandson",
            "adverse_factor_brief": "an overstay",
            "section_a_heading": (
                "Ms. Sakkhi's Nursing Career Makes Her Uniquely Qualified to Care for "
                "Her Autistic U.S. Citizen Grandson"
            ),
            "section_a_facts": (
                "She provides daily specialized care for her autistic U.S. citizen grandson Saeng."
            ),
            "section_b_heading": (
                "Ms. Sakkhi's Community Service and Moral Character Reinforce the Equities"
            ),
            "section_b_facts": "Temple volunteer; tax compliance.",
            "adverse_heading": (
                "The Circumstances of Ms. Sakkhi's Continued Presence Do Not Diminish "
                "the Strength of This Application"
            ),
            "adverse_facts": "She remained beyond authorized stay after changed circumstances.",
            "balancing_inventory": "family care, community service, clean record",
            "departure_harm": "Departure would trigger the 3/10-year bar and sever caregiving.",
            "departure_bar_type": "ten-year",
            "attorney_name": "La'Dajia Ferguson",
            "firm_name": "Kingdom Counsel Firm",
            "attorney_bar": "TX 123",
            "bar_number": "TX 123",
            "date": "2026-07-23",
            "case_architecture": {
                "case_theme": (
                    "This case concerns a retired nurse whose care of her autistic U.S. citizen "
                    "grandson is indispensable."
                ),
                "case_theme_brief": "indispensable care of an autistic U.S. citizen grandson",
                "adverse_factor_brief": "an overstay",
                "section_a_heading": (
                    "Ms. Sakkhi's Nursing Career Makes Her Uniquely Qualified to Care for "
                    "Her Autistic U.S. Citizen Grandson"
                ),
                "section_b_heading": (
                    "Ms. Sakkhi's Community Service and Moral Character Reinforce the Equities"
                ),
                "adverse_heading": (
                    "The Circumstances of Ms. Sakkhi's Continued Presence Do Not Diminish "
                    "the Strength of This Application"
                ),
                "balancing_inventory": "family care, community service, clean record",
            },
            "positive_factors": {
                "family_ties": {
                    "members": [
                        {
                            "name": "Saeng",
                            "relationship": "grandson",
                            "status": "US_citizen",
                            "dependence": "primary caregiver; autism spectrum disorder",
                            "quality_description": "autistic U.S. citizen grandson requiring daily care",
                        }
                    ],
                    "quality_notes": "Daily specialized autism care.",
                },
                "humanitarian": {"age": 65},
                "employment_and_economic": {
                    "professional_credentials": [
                        {"credential": "Registered Nurse", "issuing_body": "Thailand"}
                    ],
                    "us_employment_history": [],
                },
                "community_and_moral_character": {
                    "service_activities": [{"role": "volunteer", "organization": "temple"}],
                    "religious_community": "Buddhist temple",
                    "criminal_record": False,
                },
            },
            "adverse_factors": {
                "primary_adverse": {
                    "type": "overstay",
                    "description": "Remained beyond authorized stay.",
                    "context": "Changed family caregiving circumstances.",
                    "date_arose": "2023",
                }
            },
            "attorney": {
                "attorney_name": "La'Dajia Ferguson",
                "firm_name": "Kingdom Counsel Firm",
                "bar_number": "TX 123",
            },
            "service": {"parties": "USCIS", "method": "electronic submission"},
        }
    }


def test_library_loads():
    assert library_loaded()
    lib = load_paragraph_library()
    assert lib.get("version")
    assert "caregiver_autistic_dependent" in (lib.get("equity") or {})


def test_preserve_legal_standard_has_patel_and_arai_verbatim():
    tmpl = build_default_aos_template()
    legal = next(s for s in tmpl["sections"] if s["section_id"] == "legal_standard")
    body = assemble_preserve_section(legal, _autistic_fixture_facts())
    assert "Matter of Patel" in body
    assert "Matter of Arai" in body
    assert "[PRESERVE from firm template]" not in body
    assert "[PRESERVE" not in body
    assert "Matter of Patel" in DEFAULT_LEGAL_STANDARD
    assert "Matter of Arai" in DEFAULT_LEGAL_STANDARD


def test_preserve_fallback_from_label():
    tmpl = {
        "sections": [
            {
                "section_id": "legal_standard",
                "classification": "PRESERVE",
                "preserved_text": "[PRESERVE from firm template] INA §245(a) / Matter of Marin",
            }
        ]
    }
    merged = merge_canonical_preserve_sections(tmpl)
    legal = merged["sections"][0]
    assert not is_empty_or_label_preserve(legal["preserved_text"])
    assert "Matter of Patel" in legal["preserved_text"]
    assert legal.get("canonical_preserve_fallback") is True


def test_fill_section_a_returns_library_paragraph_not_label():
    facts = _autistic_fixture_facts()
    body = fill_section("section_a", facts)
    assert "[FILL with matter facts]" not in body
    assert "autism" in body.lower() or "caregiver" in body.lower() or "Matter of Marin" in body
    assert "Phanpit Sakkhi" in body or "her" in body.lower()


def test_assemble_fill_section_a_via_generator_helper():
    tmpl = build_default_aos_template()
    section_a = next(s for s in tmpl["sections"] if s["section_id"] == "section_a")
    body = assemble_fill_section_no_api(section_a, _autistic_fixture_facts())
    assert "[FILL with matter facts]" not in body
    assert "[SECTION REQUIRES" not in body
    assert len(body) > 200


def test_selection_logic_triggers_for_autistic_dependent():
    report = evaluate_selection_logic(_autistic_fixture_facts())
    assert report["flags"]["has_autistic_dependent"] is True
    alerts = report.get("novel_combination_alerts") or []
    assert alerts, "expected novel_combination / autistic alerts"
    assert any("autistic" in a.lower() or "caregiver" in a.lower() for a in alerts)


def test_generate_brief_library_path_includes_certificate():
    facts = _autistic_fixture_facts()
    with tempfile.TemporaryDirectory() as tmp:
        out = Path(tmp) / "brief.docx"
        result = generate_aos_brief(None, facts, out, use_api=False)
        assert Path(result["output_path"]).exists()
        assert result.get("library_loaded") is True
        legal = next(s for s in result["assembled_sections"] if s["section_id"] == "legal_standard")
        assert "Matter of Patel" in legal["body"]
        assert "Matter of Arai" in legal["body"]
        assert "[PRESERVE" not in legal["body"]
        section_a = next(s for s in result["assembled_sections"] if s["section_id"] == "section_a")
        assert "[FILL with matter facts]" not in section_a["body"]
        assert len(section_a["body"]) > 100
        cos = next(
            s for s in result["assembled_sections"] if s["section_id"] == "certificate_of_service"
        )
        assert "CERTIFICATE OF SERVICE" in cos["body"]
        assert "La'Dajia Ferguson" in cos["body"] or "Kingdom Counsel" in cos["body"]
        balancing = next(
            s for s in result["assembled_sections"] if s["section_id"] == "section_e_balancing"
        )
        assert "This is not a case about" in balancing["body"]
