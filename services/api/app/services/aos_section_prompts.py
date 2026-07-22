"""Part 8.2 user prompts for AOS FILL sections — full client facts, no thin subsets.

Source: brain/03_Firm_Knowledge/immigration/AOS_Brief_Parser_Pipeline.md §8.2
"""

from __future__ import annotations

import json
import logging
from typing import Any

LOGGER = logging.getLogger(__name__)


def _case_facts(facts: dict[str, Any]) -> dict[str, Any]:
    cf = facts.get("case_facts") if isinstance(facts, dict) else None
    return cf if isinstance(cf, dict) else (facts if isinstance(facts, dict) else {})


def _safe_get(d: dict[str, Any] | None, *keys: str, default: Any = "") -> Any:
    cur: Any = d or {}
    for k in keys:
        if not isinstance(cur, dict):
            return default
        cur = cur.get(k, default)
    return cur if cur is not None else default


def format_family_facts(family_ties: dict[str, Any] | None) -> str:
    family_ties = family_ties or {}
    members = family_ties.get("members") or []
    lines: list[str] = []
    for m in members:
        if not isinstance(m, dict):
            lines.append(f"  - {m}")
            continue
        lines.append(
            f"  - {m.get('name', 'N/A')}: {m.get('relationship', 'N/A')}, "
            f"status: {m.get('status', 'N/A')}, dependence: {m.get('dependence', 'N/A')}, "
            f"relationship quality: {m.get('quality_description', 'N/A')}"
        )
    notes = family_ties.get("quality_notes") or ""
    if not lines and notes:
        return notes
    if not lines:
        return "[No family members listed — use Section A facts and positive equities inventory]"
    return "\n".join(lines) + (f"\nAdditional notes: {notes}" if notes else "")


def format_humanitarian(humanitarian: dict[str, Any] | None) -> str:
    h = humanitarian or {}
    if not h:
        return "[None provided]"
    parts: list[str] = []
    if h.get("age") is not None and str(h.get("age")).strip():
        parts.append(f"age={h['age']}")
    conditions = h.get("health_conditions") or []
    if conditions:
        parts.append("health: " + "; ".join(str(c) for c in conditions))
    if h.get("hardship_if_denied"):
        parts.append(f"hardship if denied: {h['hardship_if_denied']}")
    # Freeform blob from drafting fields
    if h.get("narrative"):
        parts.append(str(h["narrative"]))
    return " | ".join(parts) if parts else "[None provided]"


def format_employment(employment: dict[str, Any] | None) -> str:
    e = employment or {}
    if not e:
        return "[None provided]"
    parts: list[str] = []
    history = e.get("us_employment_history") or []
    if history:
        parts.append("employment: " + "; ".join(str(x) for x in history))
    creds = e.get("professional_credentials") or []
    if creds:
        parts.append("credentials: " + "; ".join(str(x) for x in creds))
    if e.get("tax_history"):
        parts.append(f"taxes: {e['tax_history']}")
    if e.get("narrative"):
        parts.append(str(e["narrative"]))
    return " | ".join(parts) if parts else "[None provided]"


def format_community(community: dict[str, Any] | None) -> str:
    c = community or {}
    if not c:
        return "[None provided]"
    parts: list[str] = []
    for key in (
        "service_activities",
        "awards_recognitions",
        "religious_community",
        "educational_activities",
        "character_witnesses",
        "criminal_record_details",
        "narrative",
    ):
        val = c.get(key)
        if val is None or val == "" or val is False:
            continue
        if isinstance(val, list):
            parts.append(f"{key}: " + "; ".join(str(x) for x in val))
        else:
            parts.append(f"{key}: {val}")
    if "criminal_record" in c:
        parts.append(f"criminal_record: {c.get('criminal_record')}")
    return " | ".join(parts) if parts else "[None provided]"


def _pronouns(app: dict[str, Any]) -> str:
    return (
        f"{app.get('pronoun_subject') or 'they'}/"
        f"{app.get('pronoun_object') or 'them'}/"
        f"{app.get('pronoun_possessive') or 'their'}"
    )


def _all_facts_appendix(cf: dict[str, Any]) -> str:
    """Dump full case_facts (minus huge binary) so no client fact is omitted."""
    try:
        blob = json.dumps(cf, indent=2, default=str, ensure_ascii=False)
    except Exception:
        blob = str(cf)
    if len(blob) > 24000:
        blob = blob[:24000] + "\n… [truncated for prompt size]"
    return (
        "\n\nALL AVAILABLE CLIENT FACTS (complete Part 6 inventory — use every relevant fact; "
        "do not invent facts absent from this payload):\n"
        f"{blob}\n"
    )


def fact_keys_included(facts: dict[str, Any]) -> list[str]:
    """Top-level and nested keys present for debug/metadata."""
    cf = _case_facts(facts)
    keys: list[str] = []

    def walk(obj: Any, prefix: str = "") -> None:
        if isinstance(obj, dict):
            for k, v in obj.items():
                path = f"{prefix}.{k}" if prefix else str(k)
                keys.append(path)
                if isinstance(v, (dict, list)):
                    walk(v, path)
        elif isinstance(obj, list) and obj and isinstance(obj[0], dict):
            walk(obj[0], f"{prefix}[]")

    walk(cf)
    return keys


def build_section_prompt(section: dict[str, Any], facts: dict[str, Any]) -> str:
    """
    Build the user-turn prompt for generating a specific FILL section (Part 8.2).

    Always includes the section-specific narrative PLUS the full client facts appendix.
    """
    cf = _case_facts(facts)
    ca = cf.get("case_architecture") if isinstance(cf.get("case_architecture"), dict) else {}
    pf = cf.get("positive_factors") if isinstance(cf.get("positive_factors"), dict) else {}
    af = cf.get("adverse_factors") if isinstance(cf.get("adverse_factors"), dict) else {}
    app = cf.get("applicant") if isinstance(cf.get("applicant"), dict) else {}
    entry = (
        cf.get("entry_and_immigration_history")
        if isinstance(cf.get("entry_and_immigration_history"), dict)
        else {}
    )
    petition = cf.get("petition") if isinstance(cf.get("petition"), dict) else {}
    primary_adverse = (
        af.get("primary_adverse") if isinstance(af.get("primary_adverse"), dict) else {}
    )

    sid = str(section.get("section_id") or "")
    name = app.get("full_name") or cf.get("applicant_full_name") or "[APPLICANT]"
    pronouns = _pronouns(app)

    if sid == "section_a":
        facts_narrative = f"""
PRIMARY EQUITY SECTION FACTS:
Section heading (use exactly): {ca.get('section_a_heading') or cf.get('section_a_heading') or '[SECTION A HEADING NEEDED]'}
Applicant name: {name}
Applicant pronouns: {pronouns}
Case theme: {ca.get('case_theme') or cf.get('case_theme') or '[CASE THEME NEEDED]'}
Facts to develop:
{ca.get('section_a_facts') or cf.get('section_a_facts') or '[No Section A facts provided]'}
Family members and relationship quality:
{format_family_facts(pf.get('family_ties') if isinstance(pf.get('family_ties'), dict) else {})}
Humanitarian (if relevant to Section A): {format_humanitarian(pf.get('humanitarian') if isinstance(pf.get('humanitarian'), dict) else {})}
Petition context: petitioner={petition.get('petitioner_name') or cf.get('petitioner_name')}; relationship={petition.get('petitioner_relationship') or cf.get('petitioner_relationship')}
Entry context: {entry.get('last_entry_date') or cf.get('entry_date')} via {entry.get('last_entry_port') or cf.get('port_of_entry')} on {entry.get('last_entry_visa_type') or cf.get('entry_visa_type')}
Citations to include: Matter of Marin (16 I&N Dec. 581), Matter of Mendez-Morales (21 I&N Dec. 296), 1 USCIS-PM E.8(C)(2)
Include Mendez-Morales: {ca.get('include_mendez', True)}
Length: 2-4 substantive paragraphs. The first paragraph introduces the centerpiece equity. Middle paragraphs develop specific facts. Final paragraph connects to legal standard and cites authority.
"""
    elif sid == "section_b":
        facts_narrative = f"""
SECONDARY EQUITY SECTION FACTS:
Section heading (use exactly): {ca.get('section_b_heading') or cf.get('section_b_heading') or '[SECTION B HEADING NEEDED]'}
Applicant name: {name}
Applicant pronouns: {pronouns}
Facts to develop (bundle all of these into 2-4 paragraphs — do not give each its own sub-heading):
{ca.get('section_b_facts') or cf.get('section_b_facts') or '[No Section B facts provided]'}
Humanitarian factors: {format_humanitarian(pf.get('humanitarian') if isinstance(pf.get('humanitarian'), dict) else {})}
Employment: {format_employment(pf.get('employment_and_economic') if isinstance(pf.get('employment_and_economic'), dict) else {})}
Community: {format_community(pf.get('community_and_moral_character') if isinstance(pf.get('community_and_moral_character'), dict) else {})}
Family ties (supporting): {format_family_facts(pf.get('family_ties') if isinstance(pf.get('family_ties'), dict) else {})}
Positive equities inventory: {ca.get('balancing_inventory') or cf.get('balancing_inventory') or cf.get('positive_equities') or '[See Section B facts]'}
Citations to include: Matter of Marin (16 I&N Dec. 581), 1 USCIS-PM E.8(C)(2)
"""
    elif sid == "section_d_adverse":
        facts_narrative = f"""
ADVERSE FACTORS SECTION FACTS:
Section heading (use exactly): {ca.get('adverse_heading') or cf.get('adverse_heading') or '[ADVERSE HEADING NEEDED]'}
Applicant name: {name}
Applicant pronouns: {pronouns}
Adverse fact: {primary_adverse.get('description') or cf.get('adverse_facts') or '[ADVERSE FACT NEEDED]'}
Context (why it arose): {primary_adverse.get('context') or primary_adverse.get('description') or cf.get('adverse_facts') or '[CONTEXT NEEDED]'}
Adverse factor type: {primary_adverse.get('type') or 'other'}
Is fraud involved: {primary_adverse.get('is_fraud', False)}
Rehabilitation (if any): {primary_adverse.get('rehabilitation') or '[None stated]'}
Additional adverse: {af.get('additional_adverse') or '[None]'}
Entry / overstay context: entry={entry.get('last_entry_date') or cf.get('entry_date')}; authorized stay expired={entry.get('authorized_stay_expiration') or '[N/A]'}; departure would trigger bar={entry.get('departure_would_trigger_bar', True)}
Length: 1-2 paragraphs ONLY. No more.
Instructions: (1) State the adverse fact directly in the first sentence. Do not obscure it. (2) Provide context in remaining sentences. (3) Establish this does not trigger the elevated Marin standard. (4) Cite Matter of Arai (13 I&N Dec. 494) to establish the baseline rule applies.
Do NOT use these words in the heading: Immigration Violations, Overstay, Unlawful Presence
"""
    elif sid == "section_e_balancing":
        adverse_brief = ca.get("adverse_factor_brief") or cf.get("adverse_factor_brief") or "[adverse factor]"
        theme_brief = (
            ca.get("case_theme_brief")
            or cf.get("case_theme_brief")
            or ca.get("case_theme")
            or cf.get("case_theme")
            or "[case theme]"
        )
        facts_narrative = f"""
BALANCING SECTION FACTS:
Applicant name: {name}
Applicant pronouns: {pronouns}
Adverse factor (one phrase): {adverse_brief}
Positive equities inventory: {ca.get('balancing_inventory') or cf.get('balancing_inventory') or '[List positive equities from Sections A and B]'}
Case theme (for closing sentence): {theme_brief}
Section A heading (reference): {ca.get('section_a_heading') or cf.get('section_a_heading')}
Section B heading (reference): {ca.get('section_b_heading') or cf.get('section_b_heading')}
Family / humanitarian / employment / community summary:
  Family: {format_family_facts(pf.get('family_ties') if isinstance(pf.get('family_ties'), dict) else {})}
  Humanitarian: {format_humanitarian(pf.get('humanitarian') if isinstance(pf.get('humanitarian'), dict) else {})}
  Employment: {format_employment(pf.get('employment_and_economic') if isinstance(pf.get('employment_and_economic'), dict) else {})}
  Community: {format_community(pf.get('community_and_moral_character') if isinstance(pf.get('community_and_moral_character'), dict) else {})}
Citations to include: Matter of Arai (13 I&N Dec. 494), Matter of Marin (16 I&N Dec. 581)
The FINAL SENTENCE must be exactly: "This is not a case about {adverse_brief}. It is a case about {theme_brief}. A favorable exercise of discretion is both legally supported and compelled by the facts of this record."
Length: 2-3 paragraphs.
"""
    elif sid in {"argument_intro", "statutory_eligibility", "aos_mechanism"}:
        facts_narrative = f"""
SECTION: {sid}
Heading (use if provided): {section.get('heading') or '[use template heading]'}
Applicant name: {name}
Applicant pronouns: {pronouns}
Case theme: {ca.get('case_theme') or cf.get('case_theme')}
Entry: date={entry.get('last_entry_date') or cf.get('entry_date')}; port={entry.get('last_entry_port') or cf.get('port_of_entry')}; visa={entry.get('last_entry_visa_type') or cf.get('entry_visa_type')}; authorized stay expiration={entry.get('authorized_stay_expiration')}
Petition: petitioner={petition.get('petitioner_name') or cf.get('petitioner_name')}; relationship={petition.get('petitioner_relationship') or cf.get('petitioner_relationship')}; I-130 approved={petition.get('i130_approved_date') or cf.get('i130_approved_date')}; I-485 filed={petition.get('i485_filed_date') or cf.get('i485_filed_date')}
Departure harm: {cf.get('departure_harm') or '[See facts]'}
Adverse brief: {ca.get('adverse_factor_brief') or cf.get('adverse_factor_brief')}
Section A heading: {ca.get('section_a_heading') or cf.get('section_a_heading')}
Section B heading: {ca.get('section_b_heading') or cf.get('section_b_heading')}
Instructions: Draft this section using ONLY the client facts provided. Citations in footnotes only. Follow writing rules 1–12 from the system prompt.
"""
    else:
        facts_narrative = (
            f"[Section: {sid}]\nApplicant: {name} ({pronouns})\n"
            f"Theme: {ca.get('case_theme') or cf.get('case_theme')}\n"
            "Draft using all available client facts. Citations in footnotes only."
        )

    keys = fact_keys_included(facts)
    LOGGER.debug(
        "aos build_section_prompt section=%s fact_key_count=%s keys_sample=%s",
        sid,
        len(keys),
        keys[:40],
    )

    return (
        "Draft the following section of the AOS Discretionary Memorandum:\n\n"
        + facts_narrative.strip()
        + _all_facts_appendix(cf)
        + f"\n[metadata: fact_keys_included={len(keys)} section_id={sid}]\n"
    )
