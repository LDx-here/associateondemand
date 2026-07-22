"""AOS discretionary brief — parse DOCX → Part 5 template JSON."""

from __future__ import annotations

from datetime import date
from pathlib import Path
from typing import Any, BinaryIO

from app.services.brief_parser.blocks import group_blocks_into_sections, parse_docx_to_blocks
from app.services.brief_parser.classification import (
    detect_variable_slots,
    extract_citations_from_paragraph,
    resolve_section_classification,
    slugify,
)
from app.services.brief_parser.registry import BriefTypeSpec, register_brief_type

BRIEF_TYPE = "AOS_DISCRETIONARY"
CATALOG_SKU = "aos-discretionary-brief"
TASK_ALIAS = "aos_discretionary_brief"
TEMPLATE_ID = "aos_discretionary_standard_v1"

# Fixed Legal Standard prose (System Guide Part 4.1) — used when source has no PRESERVE body.
DEFAULT_LEGAL_STANDARD = (
    "Section 245 of the Immigration and Nationality Act (INA) provides that the Attorney General "
    "may, in his discretion, adjust the status of an eligible alien to that of a lawful permanent "
    "resident. INA §245(a), 8 U.S.C. §1255(a). Adjustment of status is \"a matter of administrative "
    "grace,\" and \"[a]n applicant has the burden of showing that discretion should be exercised in "
    "his favor.\" Matter of Patel, 17 I&N Dec. 597 (BIA 1980).\n\n"
    "The discretionary analysis requires \"a balancing of the negative factors evidencing the "
    "person's undesirability as a permanent resident with the social and humane considerations "
    "presented on his or her behalf to determine whether relief appears in the best interests of "
    "this country.\" Matter of Marin, 16 I&N Dec. 581, 584 (BIA 1978). Where adverse factors are "
    "present, the applicant must present offsetting equities. However, \"in the absence of adverse "
    "factors, adjustment will ordinarily be granted, still as a matter of discretion.\" Matter of "
    "Arai, 13 I&N Dec. 494, 496 (BIA 1970). The elevated standard requiring \"unusual or outstanding "
    "equities\" is triggered only where adverse factors are serious — where, as here, they are "
    "limited, the Arai baseline governs. See Matter of Marin, 16 I&N Dec. at 585.\n\n"
    "Meeting the statutory and regulatory requirements alone does not entitle the requestor to the "
    "benefit sought. 1 USCIS-PM E.8(A). The burden rests with the applicant to affirmatively "
    "demonstrate that a favorable exercise of discretion is warranted. Matter of Patel, supra. "
    "This Memorandum satisfies that burden."
)

DEFAULT_AOS_MECHANISM = (
    "Congress created adjustment of status to permit eligible applicants who were lawfully admitted "
    "to the United States to complete the immigration process without the family separation, risk, "
    "and disruption that departure and consular processing would entail. Adjustment of status is "
    "not a loophole — it is the mechanism Congress provided for exactly this situation. INA §245(a).\n\n"
    "Consular processing would impose consequences that adjustment of status was designed to avoid. "
    "Departure from the United States to pursue a visa at a U.S. consulate abroad would trigger the "
    "three-year or ten-year unlawful presence bars under INA §212(a)(9)(B) — bars that do not "
    "currently apply to ##APPLICANT_FULL_NAME##, who has remained in the United States continuously "
    "since ##ENTRY_DATE##. ##DEPARTURE_HARM## Adjustment of status allows the family-unification "
    "purpose of the INA to be realized without subjecting ##APPLICANT_FULL_NAME## to those "
    "consequences.\n\n"
    "A favorable exercise of discretion here advances, rather than frustrates, the policies the "
    "immigration laws are designed to protect."
)

DEFAULT_FOOTNOTES = {
    "preserved_citations": [
        {"key": "fn_patel", "text": "Matter of Patel, 17 I&N Dec. 597 (BIA 1980)."},
        {"key": "fn_marin_584", "text": "Matter of Marin, 16 I&N Dec. 581, 584 (BIA 1978)."},
        {"key": "fn_marin_585", "text": "Matter of Marin, 16 I&N Dec. 581, 585 (BIA 1978)."},
        {"key": "fn_arai", "text": "Matter of Arai, 13 I&N Dec. 494, 496 (BIA 1970)."},
        {"key": "fn_mendez", "text": "Matter of Mendez-Morales, 21 I&N Dec. 296, 301 (BIA 1996)."},
        {"key": "fn_edwards", "text": "Matter of Edwards, 20 I&N Dec. 191, 196 (BIA 1990)."},
        {
            "key": "fn_pm_e8",
            "text": (
                "1 USCIS-PM E.8(A), available at "
                "https://www.uscis.gov/policy-manual/volume-1-part-e-chapter-8."
            ),
        },
        {"key": "fn_ina_245", "text": "INA §245(a), 8 U.S.C. §1255(a)."},
        {"key": "fn_ina_212_9b", "text": "INA §212(a)(9)(B), 8 U.S.C. §1182(a)(9)(B)."},
        {"key": "fn_ina_201b", "text": "INA §201(b)(2)(A)(i), 8 U.S.C. §1151(b)(2)(A)(i)."},
    ],
    "fill_citations": [],
}


def build_default_aos_template() -> dict[str, Any]:
    """Part 5 schema with built-in fill templates (no firm DOCX yet)."""
    return {
        "template_id": TEMPLATE_ID,
        "template_name": "AOS Discretionary Memorandum — Standard Family-Based",
        "created_from": "builtin_default",
        "created_date": date.today().isoformat(),
        "brief_type": BRIEF_TYPE,
        "sections": [
            {
                "section_id": "cover",
                "heading": None,
                "classification": "CAPTION",
                "content_type": "mixed",
                "preserved_text": None,
                "slots": [
                    {
                        "slot_type": "applicant_name",
                        "label": "Applicant Full Name",
                        "replacement_key": "applicant_full_name",
                        "required": True,
                    },
                    {
                        "slot_type": "bracket",
                        "label": "A-Number",
                        "replacement_key": "applicant_a_number",
                        "required": False,
                    },
                    {
                        "slot_type": "bracket",
                        "label": "Case Theme",
                        "replacement_key": "case_theme",
                        "required": True,
                        "note": "Must be authored by attorney — cannot be auto-generated",
                    },
                ],
            },
            {
                "section_id": "legal_standard",
                "heading": "I. LEGAL STANDARD",
                "classification": "PRESERVE",
                "content_type": "verbatim",
                "preserved_text": DEFAULT_LEGAL_STANDARD,
                "slots": [],
                "citations_embedded": [
                    "Matter of Patel, 17 I&N Dec. 597 (BIA 1980)",
                    "Matter of Marin, 16 I&N Dec. 581, 584 (BIA 1978)",
                    "Matter of Arai, 13 I&N Dec. 494, 496 (BIA 1970)",
                    "1 USCIS-PM E.8(A)",
                ],
            },
            {
                "section_id": "statutory_eligibility",
                "heading": "II. STATUTORY ELIGIBILITY",
                "classification": "FILL",
                "content_type": "structured_fill",
                "preserved_text": None,
                "fill_template": (
                    "##APPLICANT_FULL_NAME## was inspected and admitted to the United States on "
                    "##ENTRY_DATE## at ##PORT_OF_ENTRY## on a ##ENTRY_VISA_TYPE## visa. "
                    "##PETITIONER_NAME##, a U.S. citizen ##PETITIONER_RELATIONSHIP##, filed an I-130 "
                    "petition that was approved on ##I130_APPROVED_DATE##. Form I-485 was filed on "
                    "##I485_FILED_DATE##."
                ),
                "slots": [
                    {"replacement_key": "applicant_full_name", "label": "Applicant Full Name", "required": True},
                    {"replacement_key": "entry_date", "label": "Date of Entry", "required": True},
                    {"replacement_key": "port_of_entry", "label": "Port of Entry", "required": True},
                    {"replacement_key": "entry_visa_type", "label": "Visa Type at Entry", "required": True},
                    {"replacement_key": "petitioner_name", "label": "Petitioner Name", "required": True},
                    {
                        "replacement_key": "petitioner_relationship",
                        "label": "Petitioner Relationship",
                        "required": True,
                    },
                    {"replacement_key": "i130_approved_date", "label": "I-130 Approval Date", "required": True},
                    {"replacement_key": "i485_filed_date", "label": "I-485 Filing Date", "required": True},
                ],
                "api_assistance": "optional",
            },
            {
                "section_id": "argument_intro",
                "heading": "III. ARGUMENT",
                "classification": "FILL",
                "content_type": "api_generated",
                "preserved_text": None,
                "fill_template": (
                    "##APPLICANT_FULL_NAME## satisfies the statutory eligibility requirements set forth "
                    "in INA §245(a), as established above. The question before this officer is whether a "
                    "favorable exercise of discretion is warranted. As established in Matter of Patel, "
                    "the applicant bears the burden of demonstrating that discretion should be exercised "
                    "in her favor. ##CASE_THEME## The record compiles that demonstration in full."
                ),
                "slots": [
                    {"replacement_key": "applicant_full_name", "label": "Applicant Full Name", "required": True},
                    {"replacement_key": "case_theme", "label": "Case Theme Sentence", "required": True},
                ],
                "api_assistance": "optional",
            },
            {
                "section_id": "section_a",
                "heading": "A. [ATTORNEY-AUTHORED HEADING]",
                "classification": "FILL",
                "content_type": "api_generated",
                "preserved_text": None,
                "fill_template": None,
                "slots": [
                    {
                        "replacement_key": "section_a_heading",
                        "label": "Section A Heading (argument claim)",
                        "required": True,
                    },
                    {"replacement_key": "section_a_facts", "label": "All facts for Section A", "required": True},
                ],
                "api_assistance": "required",
                "citations_to_include": [
                    "Matter of Marin, 16 I&N Dec. 581, 584-85 (BIA 1978)",
                    "Matter of Mendez-Morales, 21 I&N Dec. 296, 301 (BIA 1996)",
                    "1 USCIS-PM E.8(C)(2)",
                ],
            },
            {
                "section_id": "section_b",
                "heading": "B. [ATTORNEY-AUTHORED HEADING]",
                "classification": "FILL",
                "content_type": "api_generated",
                "preserved_text": None,
                "fill_template": None,
                "slots": [
                    {
                        "replacement_key": "section_b_heading",
                        "label": "Section B Heading (argument claim)",
                        "required": True,
                    },
                    {"replacement_key": "section_b_facts", "label": "All facts for Section B", "required": True},
                ],
                "api_assistance": "required",
                "citations_to_include": [
                    "Matter of Marin, 16 I&N Dec. 581, 584-85 (BIA 1978)",
                    "1 USCIS-PM E.8(C)(2)",
                ],
            },
            {
                "section_id": "section_c_aos_mechanism",
                "heading": (
                    "C. Congress Created Adjustment of Status to Permit Eligible Applicants "
                    "to Complete the Immigration Process Without Needless Family Separation"
                ),
                "classification": "PRESERVE",
                "content_type": "verbatim_with_fill",
                "preserved_text": DEFAULT_AOS_MECHANISM,
                "slots": [
                    {"replacement_key": "applicant_full_name", "label": "Applicant Full Name", "required": True},
                    {"replacement_key": "entry_date", "label": "Date of Entry", "required": True},
                    {
                        "replacement_key": "departure_harm",
                        "label": "Specific harm if applicant were to depart",
                        "required": True,
                    },
                ],
                "api_assistance": "optional",
            },
            {
                "section_id": "section_d_adverse",
                "heading": "D. [ATTORNEY-AUTHORED ADVERSE HEADING]",
                "classification": "FILL",
                "content_type": "api_generated",
                "preserved_text": None,
                "fill_template": None,
                "slots": [
                    {
                        "replacement_key": "adverse_heading",
                        "label": "Adverse section heading (proportionality frame)",
                        "required": True,
                    },
                    {"replacement_key": "adverse_facts", "label": "Adverse facts with full context", "required": True},
                ],
                "api_assistance": "required",
                "citations_to_include": [
                    "Matter of Arai, 13 I&N Dec. 494, 496 (BIA 1970)",
                    "Matter of Marin, 16 I&N Dec. 581, 585 (BIA 1978)",
                ],
                "heading_constraint": (
                    "Heading MUST NOT contain the words 'Immigration Violations', "
                    "'Overstay', or 'Unlawful Presence'"
                ),
            },
            {
                "section_id": "section_e_balancing",
                "heading": "E. The Balance of Equities Strongly Favors a Favorable Exercise of Discretion",
                "classification": "FILL",
                "content_type": "api_generated_with_template_close",
                "closing_template": (
                    "This is not a case about ##ADVERSE_FACTOR_BRIEF##. It is a case about "
                    "##CASE_THEME_BRIEF##. A favorable exercise of discretion is both legally "
                    "supported and compelled by the facts of this record."
                ),
                "slots": [
                    {
                        "replacement_key": "adverse_factor_brief",
                        "label": "Adverse factor in one phrase",
                        "required": True,
                    },
                    {
                        "replacement_key": "case_theme_brief",
                        "label": "Case theme restated briefly",
                        "required": True,
                    },
                    {
                        "replacement_key": "balancing_inventory",
                        "label": "List of positive equities for inventory",
                        "required": True,
                    },
                ],
                "api_assistance": "required",
                "citations_to_include": [
                    "Matter of Arai, 13 I&N Dec. 494, 496 (BIA 1970)",
                    "Matter of Marin, 16 I&N Dec. 581, 584 (BIA 1978)",
                ],
            },
            {
                "section_id": "conclusion",
                "heading": "IV. CONCLUSION",
                "classification": "BOILERPLATE",
                "content_type": "verbatim_with_fill",
                "preserved_text": (
                    "For the foregoing reasons, ##APPLICANT_FULL_NAME## respectfully requests that "
                    "U.S. Citizenship and Immigration Services exercise its discretion favorably and "
                    "approve the pending Application to Register Permanent Residence or Adjust Status "
                    "(Form I-485).\n\n"
                    "##APPLICANT_FULL_NAME## has demonstrated both legal eligibility and compelling "
                    "grounds for a favorable exercise of discretion. ##CASE_THEME## A favorable "
                    "exercise of discretion is warranted.\n\n"
                    "Respectfully submitted,\n\n"
                    "##ATTORNEY_NAME##\n##FIRM_NAME##\n##ATTORNEY_BAR##\n##DATE##"
                ),
                "slots": [
                    {"replacement_key": "applicant_full_name", "required": True},
                    {"replacement_key": "case_theme", "required": True},
                    {"replacement_key": "attorney_name", "required": True},
                    {"replacement_key": "firm_name", "required": True},
                    {"replacement_key": "attorney_bar", "required": False},
                    {"replacement_key": "date", "required": True},
                ],
            },
        ],
        "footnotes": DEFAULT_FOOTNOTES,
    }


def _infer_section_id(heading: str, classification: str, order: int) -> str:
    h = (heading or "").lower()
    if heading == "__COVER__" or classification == "CAPTION":
        return "cover"
    if "legal standard" in h or "statutory framework" in h:
        return "legal_standard"
    if "statutory eligibility" in h:
        return "statutory_eligibility"
    if h.strip().startswith("iii") or "argument" in h or "favorable" in h and "discretion" in h:
        if order <= 3:
            return "argument_intro"
    if re_match_letter(h, "a"):
        return "section_a"
    if re_match_letter(h, "b"):
        return "section_b"
    if "congress created" in h or "family separation" in h or re_match_letter(h, "c"):
        return "section_c_aos_mechanism"
    if "adverse" in h or re_match_letter(h, "d"):
        return "section_d_adverse"
    if "balanc" in h or re_match_letter(h, "e"):
        return "section_e_balancing"
    if "conclusion" in h:
        return "conclusion"
    return slugify(heading or f"section_{order}") or f"section_{order}"


def re_match_letter(heading: str, letter: str) -> bool:
    import re

    return bool(re.match(rf"^\s*{letter}\.\s+", heading or "", re.I))


def classify_and_build_template(
    sections: list[dict[str, Any]],
    *,
    source_name: str = "uploaded.docx",
    known_applicant_name: str | None = None,
) -> dict[str, Any]:
    """Convert grouped sections into Part 5 template JSON."""
    template = build_default_aos_template()
    template["created_from"] = source_name
    template["created_date"] = date.today().isoformat()
    out_sections: list[dict[str, Any]] = []

    for i, sec in enumerate(sections):
        heading = sec.get("heading") or ""
        paragraphs = list(sec.get("paragraphs") or [])
        body = "\n\n".join(p for p in paragraphs if p)
        classification = resolve_section_classification(heading, paragraphs)
        section_id = _infer_section_id(heading, classification, i)

        citations: list[str] = []
        for para in paragraphs:
            citations.extend(extract_citations_from_paragraph(para))
        citations = list(dict.fromkeys(citations))

        slots = detect_variable_slots(body, known_applicant_name=known_applicant_name)
        # Deduplicate by replacement_key
        seen_keys: set[str] = set()
        slot_objs: list[dict[str, Any]] = []
        for slot in slots:
            key = slot.get("replacement_key") or ""
            if key in seen_keys:
                continue
            seen_keys.add(key)
            slot_objs.append(
                {
                    "slot_type": slot.get("slot_type"),
                    "label": key.replace("_", " ").title(),
                    "replacement_key": key,
                    "required": key
                    in {
                        "applicant_full_name",
                        "entry_date",
                        "case_theme",
                        "section_a_heading",
                        "section_b_heading",
                        "adverse_heading",
                    },
                    "matched_text": slot.get("matched_text"),
                }
            )

        entry: dict[str, Any] = {
            "section_id": section_id,
            "heading": None if heading == "__COVER__" else heading,
            "level": sec.get("level", 1),
            "classification": classification,
            "content_type": (
                "verbatim"
                if classification == "PRESERVE"
                else "structured_fill"
                if classification == "FILL"
                else "mixed"
            ),
            "preserved_text": body if classification in {"PRESERVE", "BOILERPLATE"} else None,
            "slots": slot_objs,
            "contentExcerpt": body[:600],
            "citations_embedded": citations,
        }
        if classification == "FILL" and body:
            # Keep sample prose as fill_template hint with bracketed variables where detected
            entry["fill_template"] = None
            entry["sample_text"] = body[:4000]
            entry["api_assistance"] = "required" if section_id.startswith("section_") else "optional"
        if citations and classification == "FILL":
            entry["citations_to_include"] = citations
        out_sections.append(entry)

    if out_sections:
        template["sections"] = out_sections
    return template


def parse_aos_brief_docx(
    docx_path: str | Path | BinaryIO,
    *,
    source_name: str | None = None,
    known_applicant_name: str | None = None,
) -> dict[str, Any]:
    """Full parser entry: DOCX → template JSON."""
    path_label = source_name
    if path_label is None and isinstance(docx_path, (str, Path)):
        path_label = Path(docx_path).name
    blocks = parse_docx_to_blocks(docx_path)
    sections = group_blocks_into_sections(blocks)
    return classify_and_build_template(
        sections,
        source_name=path_label or "uploaded.docx",
        known_applicant_name=known_applicant_name,
    )


def brief_template_to_creac_sections(template: dict[str, Any]) -> list[dict[str, Any]]:
    """Map brief template sections → CREAC-shaped list for existing UI / meta.sections."""
    role_map = {
        "PRESERVE": "rule",
        "FILL": "analysis",
        "CAPTION": "caption",
        "BOILERPLATE": "conclusion_close",
    }
    out: list[dict[str, Any]] = []
    for i, sec in enumerate(template.get("sections") or []):
        if not isinstance(sec, dict):
            continue
        classification = str(sec.get("classification") or "FILL")
        sid = str(sec.get("section_id") or f"section-{i}")
        # Refine CREAC roles for known AOS ids
        role = role_map.get(classification, "other")
        if sid == "legal_standard":
            role = "rule"
        elif sid == "statutory_eligibility":
            role = "analysis"
        elif sid in {"argument_intro", "section_a", "section_b", "section_d_adverse", "section_e_balancing"}:
            role = "analysis"
        elif sid == "section_c_aos_mechanism":
            role = "explanation"
        elif sid == "conclusion":
            role = "conclusion_close"
        elif sid == "cover":
            role = "caption"
        label = sec.get("heading") or sid.replace("_", " ").title()
        excerpt = (
            sec.get("contentExcerpt")
            or sec.get("preserved_text")
            or sec.get("sample_text")
            or sec.get("fill_template")
            or ""
        )
        out.append(
            {
                "id": sid,
                "label": label,
                "role": role,
                "classification": classification,
                "contentExcerpt": str(excerpt)[:600],
                "order": i,
                "slots": sec.get("slots") or [],
            }
        )
    return out


def _register() -> None:
    from app.services.brief_parser.classification import classify_paragraph, classify_section_by_heading

    register_brief_type(
        BriefTypeSpec(
            brief_type=BRIEF_TYPE,
            catalog_sku=CATALOG_SKU,
            task_alias=TASK_ALIAS,
            template_id=TEMPLATE_ID,
            template_name="AOS Discretionary Memorandum — Standard Family-Based",
            classify_heading=classify_section_by_heading,
            classify_paragraph=classify_paragraph,
            build_default_template=build_default_aos_template,
            notes="Kingdom Counsel AOS discretionary memorandum pipeline.",
        )
    )


_register()
