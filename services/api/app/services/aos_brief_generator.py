"""AOS brief generator — deterministic assembly + optional API FILL prose.

Parser and Generator are SEPARATE. Legal logic lives in rules; LLM only enhances FILL.
Without API: structurally correct brief with placeholders.
With API: polished FILL sections.
"""

from __future__ import annotations

import os
import re
from datetime import date
from pathlib import Path
from typing import Any

from app.services.brief_parser.aos_discretionary import (
    BRIEF_TYPE,
    build_default_aos_template,
)
from app.services.brief_parser.classification import slugify

# System Guide Part 8.1 — condensed for prompt injection (full rules encoded).
AOS_SYSTEM_PROMPT = """You are a legal brief drafting assistant for an immigration law practice.
You are drafting a section of an AOS Discretionary Memorandum (Form I-485 support brief).

LEGAL FRAMEWORK (apply accurately; cite in footnotes only):
1. INA §245(a), 8 U.S.C. §1255(a) — three eligibility prongs; immediate relatives have visa availability under INA §201(b)(2)(A)(i).
2. Matter of Patel, 17 I&N Dec. 597 (BIA 1980) — administrative grace; applicant bears burden.
3. Matter of Marin, 16 I&N Dec. 581, 584-85 (BIA 1978) — balancing test; elevated standard only for serious adverse factors.
4. Matter of Arai, 13 I&N Dec. 494, 496 (BIA 1970) — absent serious adverse factors, adjustment ordinarily granted.
5. Matter of Mendez-Morales, 21 I&N Dec. 296, 301 (BIA 1996) — quality of family relationships (when relevant).
6. Matter of Edwards, 20 I&N Dec. 191, 196 (BIA 1990) — rehabilitation (criminal history only).
7. 1 USCIS-PM E.8 — cite alongside BIA when presenting favorable factors.
8. INA §212(a)(9)(B) — unlawful presence bars triggered by DEPARTURE, not continued presence.

WRITING RULES:
1. Case theme appears in Argument opening, balancing close, and Conclusion.
2. Section headings are argument claims — not category labels.
3. Bundle minor equities; do not give each its own heading.
4. Adverse heading MUST NOT contain "Immigration Violations", "Overstay", or "Unlawful Presence".
5. All citations in footnotes only — no in-text parenthetical citations.
6. Use verbatim quotes from the authorities above; do not paraphrase.
7. Never use "rebuttal". Never apologize ("unfortunately", "we acknowledge", "while it is true that").
8. Every factual claim must come from the provided intake. Mark uncertain facts [LIKE THIS].
9. Balancing must close with: "This is not a case about [adverse]. It is a case about [theme]. A favorable exercise of discretion is both legally supported and compelled by the facts of this record."

OUTPUT FORMAT:
HEADING: ...
BODY: ...
FOOTNOTES:
1. ...
"""


def flatten_facts(d: dict[str, Any], prefix: str = "") -> dict[str, Any]:
    result: dict[str, Any] = {}
    for k, v in (d or {}).items():
        full_key = f"{prefix}{k}" if not prefix else f"{prefix}_{k}"
        if isinstance(v, dict):
            result.update(flatten_facts(v, full_key))
        else:
            result[full_key] = v
            # Also expose leaf key for ##APPLICANT_FULL_NAME## style tokens
            result[str(k)] = v
    return result


def apply_simple_substitutions(template_text: str, facts: dict[str, Any]) -> tuple[str, list[str]]:
    flat = flatten_facts(facts.get("case_facts", facts) if isinstance(facts, dict) else {})
    # Normalize keys to lowercase for lookup
    flat_lower = {str(k).lower(): v for k, v in flat.items()}
    # Common aliases from practice-area fact field ids
    aliases = {
        "applicant_full_name": flat_lower.get("applicant_full_name")
        or flat_lower.get("full_name")
        or flat_lower.get("applicantfullname"),
        "entry_date": flat_lower.get("entry_date") or flat_lower.get("last_entry_date") or flat_lower.get("entrydate"),
        "port_of_entry": flat_lower.get("port_of_entry") or flat_lower.get("last_entry_port") or flat_lower.get("portofentry"),
        "entry_visa_type": flat_lower.get("entry_visa_type")
        or flat_lower.get("last_entry_visa_type")
        or flat_lower.get("entryvisatype"),
        "petitioner_name": flat_lower.get("petitioner_name") or flat_lower.get("qualifyingrelative"),
        "petitioner_relationship": flat_lower.get("petitioner_relationship"),
        "i130_approved_date": flat_lower.get("i130_approved_date") or flat_lower.get("i130approveddate"),
        "i485_filed_date": flat_lower.get("i485_filed_date") or flat_lower.get("i485fileddate"),
        "case_theme": flat_lower.get("case_theme") or flat_lower.get("casetheme"),
        "case_theme_brief": flat_lower.get("case_theme_brief") or flat_lower.get("casethemebrief"),
        "adverse_factor_brief": flat_lower.get("adverse_factor_brief") or flat_lower.get("adversefactorbrief"),
        "section_a_heading": flat_lower.get("section_a_heading") or flat_lower.get("sectionaheading"),
        "section_a_facts": flat_lower.get("section_a_facts") or flat_lower.get("sectionafacts"),
        "section_b_heading": flat_lower.get("section_b_heading") or flat_lower.get("sectionbheading"),
        "section_b_facts": flat_lower.get("section_b_facts") or flat_lower.get("sectionbfacts"),
        "adverse_heading": flat_lower.get("adverse_heading") or flat_lower.get("adverseheading"),
        "adverse_facts": flat_lower.get("adverse_facts")
        or flat_lower.get("adversefacts")
        or flat_lower.get("adversfactors"),
        "balancing_inventory": flat_lower.get("balancing_inventory")
        or flat_lower.get("balancinginventory")
        or flat_lower.get("positiveequities"),
        "departure_harm": flat_lower.get("departure_harm") or flat_lower.get("departureharm"),
        "attorney_name": flat_lower.get("attorney_name") or flat_lower.get("attorneyname"),
        "firm_name": flat_lower.get("firm_name") or flat_lower.get("firmname"),
        "attorney_bar": flat_lower.get("attorney_bar") or flat_lower.get("bar_number") or flat_lower.get("attorneybar"),
        "date": flat_lower.get("date") or flat_lower.get("prepared_date") or date.today().isoformat(),
        "applicant_a_number": flat_lower.get("applicant_a_number") or flat_lower.get("a_number") or flat_lower.get("anumbers"),
    }
    for k, v in aliases.items():
        if v is not None and str(v).strip():
            flat_lower[k] = v

    result = template_text or ""
    unfilled: list[str] = []
    for match in re.finditer(r"##([A-Z0-9_]+)##", template_text or ""):
        key = match.group(1).lower()
        val = flat_lower.get(key)
        if val is not None and str(val).strip():
            result = result.replace(match.group(0), str(val))
        else:
            unfilled.append(match.group(1))
    return result, unfilled


def get_fact(facts: dict[str, Any], key: str) -> str:
    flat = flatten_facts(facts.get("case_facts", facts) if isinstance(facts, dict) else {})
    flat_lower = {str(k).lower(): v for k, v in flat.items()}
    # camelCase field ids from practice-area facts
    camel = "".join(p.capitalize() if i else p for i, p in enumerate(key.split("_")))
    for candidate in (key, key.replace("_", ""), camel, key.lower()):
        val = flat_lower.get(candidate.lower())
        if val is not None and str(val).strip():
            return str(val).strip()
    # Direct fields map
    fields = facts.get("fields") if isinstance(facts, dict) else None
    if isinstance(fields, dict):
        for candidate in (key, camel, key.replace("_", "")):
            val = fields.get(candidate) or fields.get(camel)
            if val is not None and str(val).strip():
                return str(val).strip() if not isinstance(val, list) else "; ".join(str(x) for x in val)
        # snake → camel
        parts = key.split("_")
        camel_id = parts[0] + "".join(p.title() for p in parts[1:])
        val = fields.get(camel_id)
        if val is not None and str(val).strip():
            return str(val).strip() if not isinstance(val, list) else "; ".join(str(x) for x in val)
    return ""


def validate_required_inputs(facts: dict[str, Any], template: dict[str, Any]) -> list[str]:
    missing: list[str] = []
    for section in template.get("sections") or []:
        for slot in section.get("slots") or []:
            if not slot.get("required"):
                continue
            key = slot.get("replacement_key") or ""
            if not get_fact(facts, key):
                missing.append(key)
    return sorted(set(missing))


def assemble_preserve_section(section: dict[str, Any], facts: dict[str, Any]) -> str:
    text = section.get("preserved_text") or ""
    if not text:
        return ""
    text, _ = apply_simple_substitutions(text, facts)
    return text


def assemble_fill_section_no_api(section: dict[str, Any], facts: dict[str, Any]) -> str:
    if section.get("fill_template"):
        text, _ = apply_simple_substitutions(section["fill_template"], facts)
        return text
    if section.get("closing_template"):
        # Balancing with inventory + closing
        inventory = get_fact(facts, "balancing_inventory") or get_fact(facts, "positive_equities")
        body_bits = []
        if inventory:
            body_bits.append(f"On the positive side of the ledger: {inventory}")
        close, _ = apply_simple_substitutions(section["closing_template"], facts)
        body_bits.append(close)
        return "\n\n".join(body_bits)

    required_slots = [s for s in section.get("slots") or [] if s.get("required")]
    slot_lines = []
    for s in required_slots:
        key = s.get("replacement_key") or ""
        label = s.get("label") or key
        slot_lines.append(f"  - {label}: {get_fact(facts, key) or '[FACT NEEDED]'}")
    heading = section.get("heading") or section.get("section_id") or "Section"
    # Prefer attorney-authored headings from facts
    for heading_key in ("section_a_heading", "section_b_heading", "adverse_heading"):
        if heading_key in {s.get("replacement_key") for s in required_slots}:
            authored = get_fact(facts, heading_key)
            if authored:
                heading = authored
    cites = ", ".join(section.get("citations_to_include") or [])
    return (
        f"[SECTION REQUIRES API PROSE GENERATION]\n"
        f"Section: {heading}\n"
        f"Available facts:\n" + "\n".join(slot_lines) + "\n"
        f"Citations to include: {cites}\n"
        f"[END PLACEHOLDER]"
    )


def assemble_footnotes(template_footnotes: dict[str, Any], used_citations: list[str]) -> list[dict[str, Any]]:
    preserved = template_footnotes.get("preserved_citations") or []
    all_citations: dict[str, str] = {}
    for fn in preserved:
        if isinstance(fn, dict) and fn.get("key") and fn.get("text"):
            all_citations[str(fn["key"])] = str(fn["text"])
    for cite in used_citations:
        key = slugify(cite)
        if key and key not in all_citations:
            all_citations[key] = cite if cite.endswith(".") else f"{cite}."
    return [{"number": i, "key": k, "text": t} for i, (k, t) in enumerate(all_citations.items(), start=1)]


def validate_brief(
    sections_assembled: list[dict[str, Any]],
    facts: dict[str, Any],
    footnotes: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Part 9 quality validation — deterministic."""
    errors: list[str] = []
    warnings: list[str] = []

    case_theme = get_fact(facts, "case_theme")
    applicant_name = get_fact(facts, "applicant_full_name") or get_fact(facts, "applicantName")

    full_text = "\n\n".join(s.get("body", "") for s in sections_assembled)
    headings = [s.get("heading", "") for s in sections_assembled if s.get("heading")]

    balancing = next(
        (s for s in sections_assembled if "balancing" in (s.get("section_id") or "").lower()),
        None,
    )
    if balancing:
        if "This is not a case about" not in (balancing.get("body") or ""):
            errors.append("FAIL: Balancing section does not contain 'This is not a case about' closing.")
    else:
        errors.append("FAIL: Balancing section (III-E) not found in output.")

    conclusion = next(
        (s for s in sections_assembled if "conclusion" in (s.get("section_id") or "").lower()),
        None,
    )
    if conclusion and case_theme and case_theme[:30] not in (conclusion.get("body") or ""):
        warnings.append("WARN: Case theme may not appear in Conclusion section.")

    # Theme should appear ~4 times (cover/arg/balance/conclusion) — soft check
    if case_theme:
        theme_hits = full_text.count(case_theme[:40]) if len(case_theme) >= 40 else full_text.count(case_theme)
        if theme_hits < 2:
            warnings.append("WARN: Case theme appears fewer than twice in assembled body.")

    adverse = next(
        (
            s
            for s in sections_assembled
            if "adverse" in (s.get("section_id") or "").lower() or "section_d" in (s.get("section_id") or "").lower()
        ),
        None,
    )
    if adverse:
        h = (adverse.get("heading") or "").lower()
        for forbidden in ["immigration violation", "overstay", "unlawful presence"]:
            if forbidden in h:
                errors.append(f"FAIL: Adverse section heading contains forbidden word '{forbidden}'.")

    category_labels = [
        "family unity",
        "humanitarian concerns",
        "good moral character",
        "community ties",
        "employment history",
        "adverse factors",
        "immigration violations",
        "immigration history",
    ]
    for heading in headings:
        if (heading or "").lower().strip() in category_labels:
            errors.append(f"FAIL: Section heading '{heading}' is a category label, not an argument claim.")

    in_text_cite_pattern = r"\(\w+ of \w+,\s+\d+ I&N"
    for section in sections_assembled:
        body = section.get("body", "")
        if re.search(in_text_cite_pattern, body or ""):
            errors.append(
                f"FAIL: In-text citation found in section '{section.get('section_id')}'. "
                "Citations must be in footnotes only."
            )

    bracket_pattern = r"\[[^\]]{5,100}\]"
    for section in sections_assembled:
        for m in re.findall(bracket_pattern, section.get("body") or ""):
            if not any(x in m for x in ["INA", "8 U.S.C.", "§", "BIA", "I&N Dec.", "SECTION REQUIRES", "END PLACEHOLDER", "FACT NEEDED"]):
                warnings.append(f"WARN: Unresolved bracket in '{section.get('section_id')}': {m[:60]}...")

    if applicant_name and applicant_name not in full_text:
        errors.append(f"FAIL: Applicant name '{applicant_name}' not found in brief text.")

    for phrase, severity in [
        ("rebuttal", "ERROR"),
        ("in rebuttal", "ERROR"),
        ("unfortunately", "WARNING"),
        ("we regret", "WARNING"),
        ("while it is true that", "WARNING"),
        ("it should be noted that", "WARNING"),
        ("we wish to point out", "WARNING"),
    ]:
        if phrase in full_text.lower():
            if severity == "ERROR":
                errors.append(f"FAIL: Forbidden phrase '{phrase}' found in brief.")
            else:
                warnings.append(f"WARN: Weak phrasing '{phrase}' found — consider removing.")

    if footnotes is not None:
        fn_text = "\n".join(fn.get("text", "") for fn in footnotes)
        for required in ["Matter of Patel", "Matter of Marin", "Matter of Arai"]:
            if required not in fn_text and required not in full_text:
                warnings.append(f"WARN: Core citation '{required}' not found in footnotes.")

    return {
        "passed": len(errors) == 0,
        "error_count": len(errors),
        "warning_count": len(warnings),
        "errors": errors,
        "warnings": warnings,
    }


def build_output_docx(
    sections_assembled: list[dict[str, Any]],
    footnotes: list[dict[str, Any]],
    facts: dict[str, Any],
    output_path: str | Path,
) -> str:
    from docx import Document  # type: ignore[import-not-found]
    from docx.enum.text import WD_ALIGN_PARAGRAPH  # type: ignore[import-not-found]
    from docx.shared import Inches, Pt  # type: ignore[import-not-found]

    doc = Document()
    section = doc.sections[0]
    section.page_width = Inches(8.5)
    section.page_height = Inches(11)
    section.top_margin = Inches(1.0)
    section.bottom_margin = Inches(1.0)
    section.left_margin = Inches(1.25)
    section.right_margin = Inches(1.25)

    style = doc.styles["Normal"]
    style.font.name = "Times New Roman"
    style.font.size = Pt(12)

    applicant = get_fact(facts, "applicant_full_name") or "Applicant"
    theme = get_fact(facts, "case_theme")
    a_number = get_fact(facts, "applicant_a_number")
    attorney = get_fact(facts, "attorney_name") or "Counsel"
    firm = get_fact(facts, "firm_name") or ""
    prepared = get_fact(facts, "date") or date.today().isoformat()

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run("MEMORANDUM IN SUPPORT OF APPLICATION FOR ADJUSTMENT OF STATUS")
    run.bold = True
    run.font.size = Pt(14)

    doc.add_paragraph()
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.add_run(f"Applicant: {applicant}")

    if a_number:
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.add_run(f"File No. {a_number}")

    if theme:
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = p.add_run(theme)
        run.italic = True
        run.font.size = Pt(11)

    doc.add_paragraph()
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.add_run(f"Submitted: {prepared}")
    p.add_run(f"\nPrepared by: {attorney}")
    if firm:
        p.add_run(f"\n{firm}")

    doc.add_page_break()

    for section_content in sections_assembled:
        heading_text = section_content.get("heading")
        body_text = section_content.get("body", "")
        level = int(section_content.get("level") or 1)
        if heading_text and heading_text != "__COVER__":
            try:
                doc.add_heading(heading_text, level=min(max(level, 1), 3))
            except Exception:
                hp = doc.add_paragraph(heading_text)
                if hp.runs:
                    hp.runs[0].bold = True
        if body_text:
            for para_text in str(body_text).split("\n\n"):
                if para_text.strip():
                    bp = doc.add_paragraph(para_text.strip())
                    bp.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY

    doc.add_page_break()
    doc.add_heading("FOOTNOTES", level=1)
    for fn in footnotes:
        fp = doc.add_paragraph()
        run = fp.add_run(f"{fn['number']}. ")
        run.bold = True
        fp.add_run(fn["text"])
        fp.paragraph_format.left_indent = Inches(0.25)

    out = str(output_path)
    Path(out).parent.mkdir(parents=True, exist_ok=True)
    doc.save(out)
    return out


def _facts_from_drafting_fields(fields: dict[str, Any] | None, matter_id: str = "") -> dict[str, Any]:
    """Map practice-area fact field ids → generator case_facts shape."""
    f = fields or {}

    def g(*keys: str) -> str:
        for k in keys:
            v = f.get(k)
            if isinstance(v, list):
                if v:
                    return "; ".join(str(x) for x in v)
            elif v is not None and str(v).strip():
                return str(v).strip()
        return ""

    return {
        "case_facts": {
            "meta": {
                "matter_id": matter_id,
                "prepared_by": g("attorneyName", "attorney_name"),
                "prepared_date": date.today().isoformat(),
                "brief_type": BRIEF_TYPE,
            },
            "applicant": {
                "full_name": g("applicantName", "applicant_full_name"),
                "a_number": g("aNumber", "applicant_a_number"),
                "date_of_birth": g("applicantDob", "date_of_birth"),
                "country_of_birth": g("countryOfBirth"),
                "country_of_citizenship": g("countryOfCitizenship"),
            },
            "entry_and_immigration_history": {
                "last_entry_date": g("entryDate", "entry_date"),
                "last_entry_port": g("portOfEntry", "port_of_entry"),
                "last_entry_visa_type": g("entryVisaType", "entry_visa_type"),
                "authorized_stay_expiration": g("authorizedStayExpiration"),
            },
            "petition": {
                "petitioner_name": g("petitionerName", "qualifyingRelative", "petitioner_name"),
                "petitioner_relationship": g("petitionerRelationship", "petitioner_relationship"),
                "i130_approved_date": g("i130ApprovedDate", "i130_approved_date"),
                "i485_filed_date": g("i485FiledDate", "i485_filed_date"),
                "i130_filed_date": g("i130FiledDate"),
            },
            "attorney": {
                "attorney_name": g("attorneyName", "attorney_name"),
                "firm_name": g("firmName", "firm_name"),
                "bar_number": g("attorneyBar", "barNumber", "attorney_bar"),
            },
            "case_architecture": {
                "case_theme": g("caseTheme", "case_theme"),
                "case_theme_brief": g("caseThemeBrief", "case_theme_brief"),
                "adverse_factor_brief": g("adverseFactorBrief", "adverse_factor_brief"),
                "section_a_heading": g("sectionAHeading", "section_a_heading"),
                "section_a_facts": g("sectionAFacts", "section_a_facts", "positiveEquities"),
                "section_b_heading": g("sectionBHeading", "section_b_heading"),
                "section_b_facts": g("sectionBFacts", "section_b_facts"),
                "adverse_heading": g("adverseHeading", "adverse_heading"),
                "balancing_inventory": g("balancingInventory", "positiveEquities", "balancing_inventory"),
            },
            "adverse_factors": {
                "primary_adverse": {
                    "description": g("adverseFacts", "adverseFactors", "adverse_facts"),
                    "context": g("adverseFacts", "adverseFactors"),
                    "type": "other",
                    "is_fraud": False,
                }
            },
            "departure_harm": g("departureHarm", "departure_harm"),
            # Flat aliases for ##TOKEN## substitution
            "applicant_full_name": g("applicantName", "applicant_full_name"),
            "applicant_a_number": g("aNumber"),
            "entry_date": g("entryDate"),
            "port_of_entry": g("portOfEntry"),
            "entry_visa_type": g("entryVisaType"),
            "petitioner_name": g("petitionerName", "qualifyingRelative"),
            "petitioner_relationship": g("petitionerRelationship"),
            "i130_approved_date": g("i130ApprovedDate"),
            "i485_filed_date": g("i485FiledDate"),
            "case_theme": g("caseTheme"),
            "case_theme_brief": g("caseThemeBrief", "caseTheme"),
            "adverse_factor_brief": g("adverseFactorBrief"),
            "section_a_heading": g("sectionAHeading"),
            "section_a_facts": g("sectionAFacts", "positiveEquities"),
            "section_b_heading": g("sectionBHeading"),
            "section_b_facts": g("sectionBFacts"),
            "adverse_heading": g("adverseHeading"),
            "adverse_facts": g("adverseFacts", "adverseFactors"),
            "balancing_inventory": g("balancingInventory", "positiveEquities"),
            "departure_harm": g("departureHarm"),
            "attorney_name": g("attorneyName"),
            "firm_name": g("firmName"),
            "attorney_bar": g("attorneyBar", "barNumber"),
            "date": date.today().isoformat(),
        },
        "fields": f,
    }


def generate_aos_brief(
    template: dict[str, Any] | None,
    client_facts: dict[str, Any],
    output_path: str | Path,
    *,
    use_api: bool = False,
) -> dict[str, Any]:
    """
    Generate AOS discretionary brief.

    use_api: when True and ANTHROPIC_API_KEY set, FILL sections with api_assistance=required
    get prose. Otherwise template/placeholder mode.
    """
    tmpl = template or build_default_aos_template()
    # Accept drafting fields payload
    if "case_facts" not in client_facts and "fields" in client_facts:
        facts = _facts_from_drafting_fields(
            client_facts.get("fields"),  # type: ignore[arg-type]
            matter_id=str(client_facts.get("matter_id") or ""),
        )
        # Merge attorney from top-level if present
        for k in ("attorney_name", "firm_name", "attorney_bar"):
            if client_facts.get(k):
                facts["case_facts"][k] = client_facts[k]
                facts["case_facts"]["attorney"][k if k != "attorney_bar" else "bar_number"] = client_facts[k]
    else:
        facts = client_facts

    missing = validate_required_inputs(facts, tmpl)
    # Soft: do not hard-fail generation — placeholders remain for missing fields

    api_key = os.environ.get("ANTHROPIC_API_KEY") if use_api else None
    api_available = bool(api_key)

    assembled: list[dict[str, Any]] = []
    used_cites: list[str] = []

    for section in tmpl.get("sections") or []:
        classification = section.get("classification")
        body = ""
        heading = section.get("heading")

        # Attorney-authored headings override placeholders
        sid = section.get("section_id") or ""
        if sid == "section_a" and get_fact(facts, "section_a_heading"):
            heading = get_fact(facts, "section_a_heading")
        elif sid == "section_b" and get_fact(facts, "section_b_heading"):
            heading = get_fact(facts, "section_b_heading")
        elif sid == "section_d_adverse" and get_fact(facts, "adverse_heading"):
            heading = get_fact(facts, "adverse_heading")

        if classification == "PRESERVE":
            body = assemble_preserve_section(section, facts)
        elif classification in ("FILL", "BOILERPLATE", "CAPTION"):
            if classification == "BOILERPLATE" and section.get("preserved_text"):
                body, _ = apply_simple_substitutions(section["preserved_text"], facts)
            elif classification == "CAPTION":
                body, _ = apply_simple_substitutions(section.get("fill_template") or "", facts)
            elif (
                section.get("api_assistance") == "required"
                and api_available
            ):
                # API path — call Anthropic; fall back on failure
                try:
                    from anthropic import Anthropic  # type: ignore[import-not-found]

                    client = Anthropic(api_key=api_key)
                    user_prompt = _build_section_user_prompt(section, facts)
                    message = client.messages.create(
                        model=os.getenv("AOD_AOS_MODEL", "claude-sonnet-4-20250514"),
                        max_tokens=2048,
                        system=AOS_SYSTEM_PROMPT,
                        messages=[{"role": "user", "content": user_prompt}],
                    )
                    raw = message.content[0].text if message.content else ""
                    parsed = _parse_api_response(raw)
                    body = parsed.get("body") or assemble_fill_section_no_api(section, facts)
                    if parsed.get("heading"):
                        heading = parsed["heading"]
                    used_cites.extend(parsed.get("footnotes") or [])
                except Exception:
                    body = assemble_fill_section_no_api(section, facts)
            else:
                body = assemble_fill_section_no_api(section, facts)
        else:
            body = section.get("preserved_text") or ""

        for cite in section.get("citations_to_include") or []:
            used_cites.append(cite)
        for cite in section.get("citations_embedded") or []:
            used_cites.append(cite)

        assembled.append(
            {
                "section_id": sid,
                "heading": heading,
                "level": section.get("level", 1),
                "body": body,
                "classification": classification,
            }
        )

    footnotes = assemble_footnotes(tmpl.get("footnotes") or {}, used_cites)
    path = build_output_docx(assembled, footnotes, facts, output_path)
    validation = validate_brief(assembled, facts, footnotes)

    return {
        "output_path": path,
        "validation": validation,
        "api_used": api_available,
        "sections_generated": len(assembled),
        "footnotes_count": len(footnotes),
        "missing_fields": missing,
        "assembled_sections": assembled,
        "brief_type": BRIEF_TYPE,
    }


def _build_section_user_prompt(section: dict[str, Any], facts: dict[str, Any]) -> str:
    sid = section.get("section_id") or ""
    ca_theme = get_fact(facts, "case_theme")
    app = get_fact(facts, "applicant_full_name")
    if sid == "section_a":
        narrative = (
            f"PRIMARY EQUITY SECTION\nHeading (use exactly): {get_fact(facts, 'section_a_heading')}\n"
            f"Applicant: {app}\nCase theme: {ca_theme}\n"
            f"Facts:\n{get_fact(facts, 'section_a_facts')}\n"
            "Length: 2-4 paragraphs. Citations in footnotes only."
        )
    elif sid == "section_b":
        narrative = (
            f"SECONDARY EQUITY SECTION\nHeading (use exactly): {get_fact(facts, 'section_b_heading')}\n"
            f"Applicant: {app}\nFacts (bundle):\n{get_fact(facts, 'section_b_facts')}\n"
            "Length: 2-4 paragraphs."
        )
    elif sid == "section_d_adverse":
        narrative = (
            f"ADVERSE SECTION\nHeading (use exactly): {get_fact(facts, 'adverse_heading')}\n"
            f"Applicant: {app}\nAdverse facts:\n{get_fact(facts, 'adverse_facts')}\n"
            "1-2 paragraphs ONLY. Do NOT use Immigration Violations/Overstay/Unlawful Presence in heading."
        )
    elif sid == "section_e_balancing":
        narrative = (
            f"BALANCING\nApplicant: {app}\n"
            f"Adverse factor brief: {get_fact(facts, 'adverse_factor_brief')}\n"
            f"Inventory: {get_fact(facts, 'balancing_inventory')}\n"
            f"Theme brief: {get_fact(facts, 'case_theme_brief') or ca_theme}\n"
            "FINAL SENTENCE must be the 'This is not a case about…' template."
        )
    else:
        narrative = f"Draft section {sid} using available facts for {app}."
    return f"Draft the following section of the AOS Discretionary Memorandum:\n\n{narrative}"


def _parse_api_response(response_text: str) -> dict[str, Any]:
    result: dict[str, Any] = {"heading": None, "body": "", "footnotes": []}
    lines = (response_text or "").strip().split("\n")
    current = None
    buffer: list[str] = []
    for line in lines:
        if line.startswith("HEADING:"):
            current = "heading"
            result["heading"] = line[8:].strip()
        elif line.startswith("BODY:"):
            current = "body"
            remaining = line[5:].strip()
            buffer = [remaining] if remaining else []
        elif line.startswith("FOOTNOTES:"):
            if current == "body":
                result["body"] = "\n".join(buffer).strip()
                buffer = []
            current = "footnotes"
        else:
            if current in ("body", "footnotes"):
                buffer.append(line)
    if current == "body" and buffer:
        result["body"] = "\n".join(buffer).strip()
    elif current == "footnotes" and buffer:
        result["footnotes"] = [l.strip() for l in buffer if l.strip()]
    return result


def format_aos_writing_rules_for_prompt() -> str:
    """Inject into drafting agent for AOS SKU."""
    return (
        "## AOS Brief Writing Rules (System Guide — PRESERVE vs FILL)\n"
        "- PRESERVE: Legal Standard (Patel/Marin/Arai + 1 USCIS-PM E.8) — copy/adapt only for firm voice; do not invent new law.\n"
        "- FILL: Statutory eligibility, Argument equities A/B, adverse D, balancing E — use matter facts.\n"
        "- Case theme appears FOUR times: cover subtitle, Argument opening, balancing close, Conclusion.\n"
        "- Adverse heading MUST NOT contain 'Immigration Violations', 'Overstay', or 'Unlawful Presence'.\n"
        "- Citations in footnotes only — no in-text parentheticals.\n"
        "- Never use 'rebuttal' or apologetic phrasing.\n"
        "- Balancing MUST close: 'This is not a case about [adverse]. It is a case about [theme]. "
        "A favorable exercise of discretion is both legally supported and compelled by the facts of this record.'\n"
        f"\n{AOS_SYSTEM_PROMPT[:2500]}"
    )
