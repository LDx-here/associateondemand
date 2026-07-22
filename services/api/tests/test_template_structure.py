"""Tests for template structure / CREAC parsing."""

from __future__ import annotations

from app.services.template_structure import (
    detect_creac_role,
    format_creac_facts_for_prompt,
    format_structure_for_prompt,
    parse_template_structure,
)


SAMPLE_CREAC = """
CONCLUSION

Respondent respectfully requests that USCIS grant adjustment of status.

II. RULE

Under INA § 245(a), the Attorney General may adjust status as a matter of discretion.
Matter of Marin requires balancing of equities.

III. EXPLANATION

Meeting statutory eligibility alone does not entitle an applicant to adjustment.
USCIS weighs the totality of the circumstances under PM-602-0199.

IV. ANALYSIS

Respondent has strong family ties to a U.S. citizen spouse and documented hardship.

V. CONCLUSION

For the foregoing reasons, Respondent requests approval of the I-485.
"""


def test_detect_creac_roles() -> None:
    assert detect_creac_role("II. RULE") == "rule"
    assert detect_creac_role("Legal Standard") == "rule"
    assert detect_creac_role("IV. ANALYSIS") == "analysis"
    assert detect_creac_role("CONCLUSION") == "conclusion"
    assert detect_creac_role("Explanation") == "explanation"


def test_parse_creac_aos_template() -> None:
    sections = parse_template_structure(
        SAMPLE_CREAC,
        deliverable_id="aos-discretionary-brief",
    )
    roles = [s["role"] for s in sections]
    assert "rule" in roles
    assert "explanation" in roles
    assert "analysis" in roles
    # Opening + closing conclusions → last marked conclusion_close
    assert roles.count("conclusion") + roles.count("conclusion_close") >= 2
    assert any(s["role"] == "conclusion_close" for s in sections)
    rule = next(s for s in sections if s["role"] == "rule")
    assert "245(a)" in rule["contentExcerpt"] or "Marin" in rule["contentExcerpt"]


def test_parse_heading_fallback() -> None:
    text = "## Caption\n\nIN THE MATTER OF\n\n## Introduction\n\nRespondent submits…\n"
    sections = parse_template_structure(text, prefer_creac=False)
    assert len(sections) >= 2
    assert sections[0]["label"] == "Caption"


def test_format_structure_preserves_rule() -> None:
    sections = parse_template_structure(SAMPLE_CREAC, deliverable_id="aos-discretionary-brief")
    block = format_structure_for_prompt(sections)
    assert "TEMPLATE STRUCTURE" in block
    assert "PRESERVE" in block
    assert "[RULE]" in block.upper() or "rule" in block.lower()


def test_format_creac_facts() -> None:
    block = format_creac_facts_for_prompt(
        {
            "extremeHardshipFactors": "Medical needs of USC spouse",
            "positiveEquities": "Long residence; community ties",
            "reliefSought": "AOS grant",
        }
    )
    assert "FACTS FOR ANALYSIS" in block
    assert "extremeHardshipFactors" in block
    assert "Conclusion guidance" in block
