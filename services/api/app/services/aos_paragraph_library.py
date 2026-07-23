"""AOS paragraph library — FILL section builders (no API required).

Loads AOS_Paragraph_Library.json at import time. Selection logic + novel-combination
alerts follow library.selection_logic. Attorney may override variants via
facts['paragraph_selections'] (e.g. {"section_a": "caregiver_autistic_dependent.v3"}).
"""

from __future__ import annotations

import json
import logging
import re
from functools import lru_cache
from pathlib import Path
from typing import Any

LOGGER = logging.getLogger(__name__)

_LIBRARY_PATH = Path(__file__).with_name("aos_paragraph_library.json")

CERTIFICATE_OF_SERVICE_TEMPLATE = """CERTIFICATE OF SERVICE

I hereby certify that on ##DATE##, a true and correct copy of the foregoing Memorandum
in Support of Application for Adjustment of Status was served upon:

##PARTIES_SERVED##

by ##SERVICE_METHOD##.

                                   ##ATTORNEY_NAME##
                                   ##FIRM_NAME##
                                   Bar No. ##BAR_NUMBER##
"""


@lru_cache(maxsize=1)
def load_paragraph_library() -> dict[str, Any]:
    """Load paragraph library JSON once (startup / first use)."""
    try:
        data = json.loads(_LIBRARY_PATH.read_text(encoding="utf-8"))
        if not isinstance(data, dict):
            raise ValueError("library root must be object")
        LOGGER.info(
            "AOS paragraph library loaded v%s (%s equity keys)",
            data.get("version"),
            len((data.get("equity") or {})),
        )
        return data
    except Exception as exc:
        LOGGER.error("Failed to load AOS paragraph library: %s", exc)
        return {"version": "missing", "equity": {}, "adverse": {}, "balancing": {}, "selection_logic": {}}


def library_loaded() -> bool:
    lib = load_paragraph_library()
    return bool(lib.get("equity")) and lib.get("version") != "missing"


def flatten_facts_for_slots(facts: dict[str, Any]) -> dict[str, str]:
    """Flatten nested case_facts into snake_case keys for ##SLOT## substitution."""
    root = facts.get("case_facts", facts) if isinstance(facts, dict) else {}
    if not isinstance(root, dict):
        root = {}
    result: dict[str, str] = {}

    def put(key: str, value: Any) -> None:
        if value is None:
            return
        if isinstance(value, list):
            text = "; ".join(str(x) for x in value if x not in (None, ""))
        else:
            text = str(value).strip()
        if text:
            result[key.lower()] = text

    app = root.get("applicant") if isinstance(root.get("applicant"), dict) else {}
    put("applicant_full_name", app.get("full_name") or root.get("applicant_full_name"))
    put("applicant_a_number", app.get("a_number") or root.get("applicant_a_number"))
    put("applicant_dob", app.get("date_of_birth"))
    put("applicant_pronoun_subject", app.get("pronoun_subject") or "the applicant")
    put("applicant_pronoun_object", app.get("pronoun_object") or "the applicant")
    put("applicant_pronoun_possessive", app.get("pronoun_possessive") or "the applicant's")
    subj = str(app.get("pronoun_subject") or "The applicant")
    put("applicant_pronoun_subject_cap", subj[:1].upper() + subj[1:] if subj else "The applicant")

    # Extra applicant-level slots injected by builders
    for extra_key in (
        "dependent_name",
        "dependent_relationship",
        "dependent_condition",
        "dependent_dependence",
        "dependent_age",
        "dependent_pronoun_object",
        "dependent_pronoun_possessive",
        "care_description",
        "care_specifics",
        "care_years",
        "credential",
        "credential_summary",
        "employment_summary",
        "professional_care_specifics",
        "service_summary",
        "religious_community",
        "applicant_age",
        "age",
        "adverse_description",
        "adverse_context",
        "adverse_date",
        "balancing_inventory",
        "parties_served",
        "service_method",
        "departure_bar_type",
        "no_alternative_reason",
        "parent_relationship",
        "dependent_medical_status",
        "spouse_name",
        "marriage_date",
        "marriage_years",
        "shared_life_details",
        "spouse_specific_need",
    ):
        put(extra_key, app.get(extra_key) or root.get(extra_key))

    entry = root.get("entry_and_immigration_history") if isinstance(root.get("entry_and_immigration_history"), dict) else {}
    put("entry_date", entry.get("last_entry_date") or root.get("entry_date"))
    put("port_of_entry", entry.get("last_entry_port") or root.get("port_of_entry"))
    put("entry_visa_type", entry.get("last_entry_visa_type") or root.get("entry_visa_type"))
    put("authorized_stay", entry.get("authorized_stay_expiration"))

    petition = root.get("petition") if isinstance(root.get("petition"), dict) else {}
    put("petitioner_name", petition.get("petitioner_name") or root.get("petitioner_name"))
    put("petitioner_relationship", petition.get("petitioner_relationship") or root.get("petitioner_relationship"))
    put("i130_filed_date", petition.get("i130_filed_date"))
    put("i130_approved_date", petition.get("i130_approved_date") or root.get("i130_approved_date"))
    put("i485_filed_date", petition.get("i485_filed_date") or root.get("i485_filed_date"))

    ca = root.get("case_architecture") if isinstance(root.get("case_architecture"), dict) else {}
    put("case_theme", ca.get("case_theme") or root.get("case_theme"))
    put("case_theme_brief", ca.get("case_theme_brief") or root.get("case_theme_brief"))
    put("adverse_factor_brief", ca.get("adverse_factor_brief") or root.get("adverse_factor_brief"))
    put("section_a_heading", ca.get("section_a_heading") or root.get("section_a_heading"))
    put("section_b_heading", ca.get("section_b_heading") or root.get("section_b_heading"))
    put("adverse_heading", ca.get("adverse_heading") or root.get("adverse_heading"))
    put("balancing_inventory", ca.get("balancing_inventory") or root.get("balancing_inventory"))
    put("departure_harm", root.get("departure_harm") or ca.get("departure_harm"))

    atty = root.get("attorney") if isinstance(root.get("attorney"), dict) else {}
    put("attorney_name", atty.get("attorney_name") or root.get("attorney_name"))
    put("firm_name", atty.get("firm_name") or root.get("firm_name"))
    put("bar_number", atty.get("bar_number") or root.get("attorney_bar") or root.get("bar_number"))
    put("attorney_bar", atty.get("bar_number") or root.get("attorney_bar"))

    meta = root.get("meta") if isinstance(root.get("meta"), dict) else {}
    put("date", meta.get("prepared_date") or root.get("date"))

    service = root.get("service") if isinstance(root.get("service"), dict) else {}
    put("parties_served", service.get("parties") or root.get("parties_served") or "USCIS")
    put("service_method", service.get("method") or root.get("service_method") or "electronic submission")

    # Flat aliases already on root
    for k, v in root.items():
        if isinstance(v, (str, int, float)) and k.lower() not in result:
            put(k, v)

    return result


def substitute_slots(template_text: str, facts: dict[str, Any]) -> str:
    """Replace ##SLOT## markers with values from facts."""
    flat = flatten_facts_for_slots(facts)
    result = template_text or ""
    for match in re.finditer(r"##([A-Z0-9_]+)##", template_text or ""):
        key = match.group(1).lower()
        value = flat.get(key)
        if value is None or not str(value).strip():
            # Also try without applicant_ prefix for builder-injected keys
            value = flat.get(key.replace("applicant_", ""))
        if value is not None and str(value).strip():
            result = result.replace(match.group(0), str(value))
        else:
            result = result.replace(match.group(0), f"[{match.group(1)} — required]")
    return result


def _case_root(facts: dict[str, Any]) -> dict[str, Any]:
    root = facts.get("case_facts", facts) if isinstance(facts, dict) else {}
    return root if isinstance(root, dict) else {}


def _get_variant_paragraph(
    library: dict[str, Any],
    category: str,
    key: str,
    *,
    variant_id: str | None = None,
) -> str:
    entry = (library.get(category) or {}).get(key) or {}
    if not isinstance(entry, dict):
        return ""
    # Legacy flat paragraph (Output_Fix sample shape)
    if entry.get("paragraph") and not entry.get("variants"):
        return str(entry["paragraph"])
    variants = entry.get("variants") or []
    if not isinstance(variants, list) or not variants:
        return ""
    if variant_id:
        for v in variants:
            if isinstance(v, dict) and str(v.get("variant_id") or "") == variant_id:
                return str(v.get("paragraph") or "")
        # Allow full ids like caregiver_autistic_dependent.v3
        for v in variants:
            if not isinstance(v, dict):
                continue
            full = f"{key}.{v.get('variant_id')}"
            if full == variant_id or str(v.get("variant_id")) == variant_id.split(".")[-1]:
                return str(v.get("paragraph") or "")
    return str(variants[0].get("paragraph") or "")


def _parse_selection(sel: str | None) -> tuple[str | None, str | None]:
    """Parse 'caregiver_autistic_dependent.v3' → (key, variant_id)."""
    if not sel or not str(sel).strip():
        return None, None
    text = str(sel).strip()
    if "." in text:
        key, vid = text.rsplit(".", 1)
        return key, vid
    return text, None


def _selections(facts: dict[str, Any]) -> dict[str, str]:
    root = _case_root(facts)
    raw = (
        facts.get("paragraph_selections")
        or root.get("paragraph_selections")
        or (facts.get("fields") or {}).get("paragraphSelections")
        or {}
    )
    if not isinstance(raw, dict):
        return {}
    return {str(k): str(v) for k, v in raw.items() if v}


def detect_fact_flags(facts: dict[str, Any]) -> dict[str, Any]:
    """Boolean/numeric flags used by selection_logic and builders."""
    root = _case_root(facts)
    pf = root.get("positive_factors") if isinstance(root.get("positive_factors"), dict) else {}
    af = root.get("adverse_factors") if isinstance(root.get("adverse_factors"), dict) else {}
    family = pf.get("family_ties") if isinstance(pf.get("family_ties"), dict) else {}
    members = family.get("members") if isinstance(family.get("members"), list) else []
    hum = pf.get("humanitarian") if isinstance(pf.get("humanitarian"), dict) else {}
    emp = pf.get("employment_and_economic") if isinstance(pf.get("employment_and_economic"), dict) else {}
    comm = pf.get("community_and_moral_character") if isinstance(pf.get("community_and_moral_character"), dict) else {}
    primary = af.get("primary_adverse") if isinstance(af.get("primary_adverse"), dict) else {}

    def _blob(m: dict[str, Any]) -> str:
        return " ".join(
            str(m.get(k) or "")
            for k in ("quality_description", "dependence", "relationship", "name", "status")
        ).lower()

    has_autistic = any(
        "autism" in _blob(m) or "autistic" in _blob(m) for m in members if isinstance(m, dict)
    )
    # Also scan narrative fields
    narratives = " ".join(
        str(x or "")
        for x in (
            family.get("quality_notes"),
            root.get("section_a_facts"),
            root.get("case_theme"),
            (root.get("case_architecture") or {}).get("case_theme") if isinstance(root.get("case_architecture"), dict) else "",
            (root.get("case_architecture") or {}).get("section_a_facts") if isinstance(root.get("case_architecture"), dict) else "",
        )
    ).lower()
    if "autism" in narratives or "autistic" in narratives:
        has_autistic = True

    has_disabled = any(
        isinstance(m, dict) and m.get("dependence") and "citizen" in str(m.get("status") or "").lower()
        for m in members
    ) or has_autistic

    has_minor_usc = any(
        isinstance(m, dict)
        and str(m.get("relationship") or "").lower() in {"son", "daughter", "child", "grandson", "granddaughter"}
        and "citizen" in str(m.get("status") or "").lower()
        for m in members
    )

    creds = emp.get("professional_credentials") or []
    has_creds = bool(creds) or bool(emp.get("us_employment_history"))
    if "nurse" in narratives or "credential" in narratives or "licensed" in narratives:
        has_creds = True

    age = hum.get("age")
    try:
        age_n = int(age) if age is not None else None
    except (TypeError, ValueError):
        age_n = None
    if age_n is None and "retired" in narratives:
        age_n = 65

    adverse_type = str(primary.get("type") or "overstay").lower()
    if not primary.get("type"):
        desc = str(primary.get("description") or root.get("adverse_facts") or "").lower()
        if "ewi" in desc or "without inspection" in desc:
            adverse_type = "ewi"
        elif "remov" in desc or "deport" in desc:
            adverse_type = "prior_removal"
        elif "overstay" in desc or "unlawful presence" in desc:
            adverse_type = "overstay"

    return {
        "has_autistic_dependent": has_autistic,
        "has_disabled_dependent": has_disabled,
        "has_minor_usc_children": has_minor_usc,
        "has_professional_credentials": has_creds,
        "has_own_medical_condition": bool(hum.get("health_conditions") or hum.get("hardship_if_denied")),
        "has_community_leadership": bool(comm.get("service_activities") or comm.get("religious_community")),
        "applicant_age": age_n or 0,
        "years_in_us": 0,
        "adverse_type": adverse_type,
        "has_caregiver_role": any(isinstance(m, dict) and m.get("dependence") for m in members) or has_autistic,
        "members": members,
        "family": family,
        "pf": pf,
        "af": af,
        "hum": hum,
        "emp": emp,
        "comm": comm,
        "primary_adverse": primary,
    }


def evaluate_selection_logic(facts: dict[str, Any], library: dict[str, Any] | None = None) -> dict[str, Any]:
    """Run library.selection_logic rules; return suggestions + novel_combination_alerts."""
    lib = library or load_paragraph_library()
    flags = detect_fact_flags(facts)
    logic = lib.get("selection_logic") or {}
    alerts: list[str] = []
    suggestions: dict[str, list[str]] = {}

    def _cond(expr: str) -> bool:
        e = (expr or "").strip()
        # Simple AND splits
        parts = [p.strip() for p in re.split(r"\s+AND\s+", e, flags=re.I) if p.strip()]
        for part in parts:
            m = re.match(
                r"(has_\w+|applicant_age|years_in_us|adverse_type)\s*(==|>=|<=|>|<)\s*(.+)$",
                part,
            )
            if not m:
                continue
            key, op, raw_val = m.group(1), m.group(2), m.group(3).strip()
            left = flags.get(key)
            if raw_val.lower() in {"true", "false"}:
                right: Any = raw_val.lower() == "true"
            elif raw_val.startswith("'") or raw_val.startswith('"'):
                right = raw_val.strip("'\"")
            else:
                try:
                    right = int(raw_val)
                except ValueError:
                    right = raw_val
            if op == "==":
                if left != right:
                    return False
            elif op == ">=":
                if not (isinstance(left, (int, float)) and left >= right):
                    return False
            elif op == "<=":
                if not (isinstance(left, (int, float)) and left <= right):
                    return False
            elif op == ">":
                if not (isinstance(left, (int, float)) and left > right):
                    return False
            elif op == "<":
                if not (isinstance(left, (int, float)) and left < right):
                    return False
        return bool(parts)

    for rule in logic.get("primary_equity_rules") or []:
        if isinstance(rule, dict) and _cond(str(rule.get("condition") or "")):
            suggestions.setdefault("primary_equity", []).extend(list(rule.get("suggest") or []))
            break

    for rule in logic.get("novel_combination_alerts") or []:
        if isinstance(rule, dict) and _cond(str(rule.get("condition") or "")):
            alerts.append(str(rule.get("alert") or ""))

    # Always surface autistic-caregiver alert when flag present (fixture / pilot)
    if flags["has_autistic_dependent"] and not any("autistic" in a.lower() or "caregiver" in a.lower() for a in alerts):
        for rule in logic.get("novel_combination_alerts") or []:
            if isinstance(rule, dict) and "autistic" in str(rule.get("condition") or "").lower():
                if _cond(str(rule.get("condition") or "")):
                    alerts.append(str(rule.get("alert") or ""))
        # Soft alert from primary rules when autistic dependent present
        if flags["has_autistic_dependent"]:
            alerts.append(
                "Autistic dependent detected — prefer caregiver_autistic_dependent library variants for Section A."
            )

    return {
        "flags": {k: v for k, v in flags.items() if not isinstance(v, (dict, list))},
        "suggestions": suggestions,
        "novel_combination_alerts": alerts,
    }


def build_argument_intro(facts: dict[str, Any], library: dict[str, Any] | None = None) -> str:
    lib = library or load_paragraph_library()
    # Library v2 has no argument.intro — use firm-standard intro with slots
    arg = (lib.get("argument") or {}) if isinstance(lib.get("argument"), dict) else {}
    template = arg.get("intro_template")
    if not template:
        template = (
            "##APPLICANT_FULL_NAME## satisfies the statutory eligibility requirements set forth "
            "in INA §245(a), as established above. The question before this officer is whether a "
            "favorable exercise of discretion is warranted. As established in Matter of Patel, "
            "the applicant bears the burden of demonstrating that discretion should be exercised "
            "in ##APPLICANT_PRONOUN_POSSESSIVE## favor. ##CASE_THEME## The record compiles that "
            "demonstration in full."
        )
    return substitute_slots(str(template), facts)


def build_primary_equity(facts: dict[str, Any], library: dict[str, Any] | None = None) -> str:
    lib = library or load_paragraph_library()
    root = _case_root(facts)
    flags = detect_fact_flags(facts)
    ca = root.get("case_architecture") if isinstance(root.get("case_architecture"), dict) else {}
    sels = _selections(facts)

    sel_key, sel_vid = _parse_selection(sels.get("section_a") or sels.get("primary_equity"))
    if sel_key and sel_key in (lib.get("equity") or {}):
        template_key = sel_key
        variant_id = sel_vid
    elif flags["has_autistic_dependent"]:
        template_key = "caregiver_autistic_dependent"
        variant_id = "v3" if flags["has_professional_credentials"] else "v1"
    elif flags["has_disabled_dependent"]:
        template_key = "caregiver_disabled_dependent_general"
        variant_id = "v1"
    elif flags["has_minor_usc_children"]:
        template_key = "parent_usc_minor_children"
        variant_id = "v1"
    else:
        # Prefer spouse / residence / community if present; else autistic path if narrative
        equity = lib.get("equity") or {}
        if "usc_spouse_marriage" in equity and any(
            isinstance(m, dict) and "spouse" in str(m.get("relationship") or "").lower()
            for m in flags["members"]
        ):
            template_key = "usc_spouse_marriage"
        elif "long_us_residence" in equity:
            template_key = "long_us_residence"
        else:
            template_key = "parent_usc_minor_children"
        variant_id = "v1"

    para = _get_variant_paragraph(lib, "equity", template_key, variant_id=variant_id)
    if not para:
        # Fallback aliases from Output_Fix naming
        for alt in ("caregiver_disabled_dependent", "family_ties_general"):
            para = _get_variant_paragraph(lib, "equity", alt, variant_id=variant_id)
            if para:
                break

    members = flags["members"]
    primary_member = members[0] if members else {}
    if not isinstance(primary_member, dict):
        primary_member = {}
    family = flags["family"] if isinstance(flags["family"], dict) else {}

    extra = dict(facts)
    extra_cf = dict(root)
    extra_app = dict(root.get("applicant") if isinstance(root.get("applicant"), dict) else {})
    extra_app["dependent_name"] = primary_member.get("name") or "[Dependent Name]"
    extra_app["dependent_relationship"] = primary_member.get("relationship") or "family member"
    extra_app["dependent_condition"] = primary_member.get("quality_description") or "a documented condition"
    extra_app["dependent_dependence"] = primary_member.get("dependence") or "documented daily dependence"
    extra_app["care_description"] = family.get("quality_notes") or root.get("section_a_facts") or "[daily care description]"
    extra_app["care_specifics"] = root.get("section_a_facts") or family.get("quality_notes") or ""
    extra_app["care_years"] = extra_app.get("care_years") or "several"
    extra_app["dependent_pronoun_object"] = "them"
    extra_app["dependent_pronoun_possessive"] = "their"
    extra_app["credential"] = extra_app.get("credential") or "licensed professional"
    extra_app["professional_care_specifics"] = root.get("section_a_facts") or ""
    extra_cf["applicant"] = extra_app
    extra["case_facts"] = extra_cf

    body = substitute_slots(para, extra) if para else (
        f"{root.get('section_a_facts') or '[Primary equity facts needed]'}"
    )
    return body


def build_secondary_equities(facts: dict[str, Any], library: dict[str, Any] | None = None) -> str:
    lib = library or load_paragraph_library()
    root = _case_root(facts)
    flags = detect_fact_flags(facts)
    ca = root.get("case_architecture") if isinstance(root.get("case_architecture"), dict) else {}
    app = root.get("applicant") if isinstance(root.get("applicant"), dict) else {}
    paragraphs: list[str] = []

    hum = flags["hum"] if isinstance(flags["hum"], dict) else {}
    emp = flags["emp"] if isinstance(flags["emp"], dict) else {}
    comm = flags["comm"] if isinstance(flags["comm"], dict) else {}

    if flags["applicant_age"] and flags["applicant_age"] >= 60:
        para = _get_variant_paragraph(lib, "equity", "age_elderly", variant_id="v1")
        extra = dict(facts)
        extra_cf = dict(root)
        extra_app = dict(app)
        extra_app["applicant_age"] = str(flags["applicant_age"])
        extra_app["age"] = str(flags["applicant_age"])
        extra_cf["applicant"] = extra_app
        extra["case_facts"] = extra_cf
        if para:
            paragraphs.append(substitute_slots(para, extra))

    if flags["has_professional_credentials"] or emp.get("professional_credentials") or emp.get("us_employment_history"):
        cred_list = emp.get("professional_credentials") or []
        emp_list = emp.get("us_employment_history") or []
        cred_str = ""
        if isinstance(cred_list, list) and cred_list and isinstance(cred_list[0], dict):
            cred_str = "; ".join(
                f"{c.get('credential', '')} ({c.get('issuing_body', '')})".strip()
                for c in cred_list
                if isinstance(c, dict)
            )
        elif isinstance(cred_list, list):
            cred_str = "; ".join(str(c) for c in cred_list if c)
        emp_str = ""
        if isinstance(emp_list, list) and emp_list and isinstance(emp_list[0], dict):
            emp_str = "; ".join(
                f"{e.get('role', '')} at {e.get('employer', '')}".strip()
                for e in emp_list
                if isinstance(e, dict)
            )
        elif isinstance(emp_list, list):
            emp_str = "; ".join(str(e) for e in emp_list if e)
        # Prefer employment_licensed_professional; alias employment_credentials
        para = _get_variant_paragraph(lib, "equity", "employment_licensed_professional", variant_id="v1")
        if not para:
            para = _get_variant_paragraph(lib, "equity", "employment_credentials", variant_id="v1")
        extra = dict(facts)
        extra_cf = dict(root)
        extra_app = dict(app)
        extra_app["credential_summary"] = cred_str or emp_str or root.get("section_b_facts") or "[credentials]"
        extra_app["employment_summary"] = emp_str or root.get("section_b_facts") or "[employment history]"
        extra_app["credential"] = cred_str or "professional credentials"
        extra_cf["applicant"] = extra_app
        extra["case_facts"] = extra_cf
        if para:
            paragraphs.append(substitute_slots(para, extra))

    if comm.get("service_activities") or comm.get("religious_community") or root.get("section_b_facts"):
        svc = comm.get("service_activities") or []
        rel = comm.get("religious_community") or ""
        if isinstance(svc, list) and svc and isinstance(svc[0], dict):
            svc_str = "; ".join(
                f"{s.get('role', '')} with {s.get('organization', '')}".strip()
                for s in svc
                if isinstance(s, dict)
            )
        elif isinstance(svc, list):
            svc_str = "; ".join(str(s) for s in svc if s)
        else:
            svc_str = str(svc or "")
        para = _get_variant_paragraph(lib, "equity", "community_service", variant_id="v1")
        extra = dict(facts)
        extra_cf = dict(root)
        extra_app = dict(app)
        extra_app["service_summary"] = svc_str or root.get("section_b_facts") or "[community service activities]"
        extra_app["religious_community"] = str(rel or "")
        extra_cf["applicant"] = extra_app
        extra["case_facts"] = extra_cf
        if para:
            paragraphs.append(substitute_slots(para, extra))

    if not comm.get("criminal_record"):
        para = _get_variant_paragraph(lib, "equity", "clean_criminal_record", variant_id="v1")
        if para:
            paragraphs.append(substitute_slots(para, facts))

    if not paragraphs and root.get("section_b_facts"):
        paragraphs.append(str(root["section_b_facts"]))

    return "\n\n".join(paragraphs)


def build_adverse_section(facts: dict[str, Any], library: dict[str, Any] | None = None) -> str:
    lib = library or load_paragraph_library()
    root = _case_root(facts)
    flags = detect_fact_flags(facts)
    ca = root.get("case_architecture") if isinstance(root.get("case_architecture"), dict) else {}
    primary = flags["primary_adverse"] if isinstance(flags["primary_adverse"], dict) else {}
    sels = _selections(facts)

    sel_key, sel_vid = _parse_selection(sels.get("section_d_adverse") or sels.get("adverse"))
    if sel_key and sel_key in (lib.get("adverse") or {}):
        template_key = sel_key
        variant_id = sel_vid or "v1"
    else:
        adverse_type = flags["adverse_type"]
        if adverse_type == "overstay":
            context_lower = str(primary.get("context") or primary.get("description") or "").lower()
            if any(kw in context_lower for kw in ("medical", "illness", "surgery", "hospitalization", "emergency")):
                template_key = "overstay_compelling_reason"
            else:
                template_key = "simple_overstay"
        elif adverse_type == "prior_removal":
            template_key = "prior_removal_old"
        elif adverse_type == "ewi":
            template_key = "entry_without_inspection"
        else:
            template_key = "simple_overstay"
        variant_id = "v1"

    para = _get_variant_paragraph(lib, "adverse", template_key, variant_id=variant_id)
    extra = dict(facts)
    extra_cf = dict(root)
    extra_app = dict(root.get("applicant") if isinstance(root.get("applicant"), dict) else {})
    extra_app["adverse_description"] = primary.get("description") or root.get("adverse_facts") or "[adverse fact]"
    extra_app["adverse_context"] = primary.get("context") or root.get("adverse_facts") or "[context]"
    extra_app["adverse_date"] = primary.get("date_arose") or "[date]"
    extra_cf["applicant"] = extra_app
    extra["case_facts"] = extra_cf

    return substitute_slots(para, extra) if para else str(root.get("adverse_facts") or "")


def build_balancing(facts: dict[str, Any], library: dict[str, Any] | None = None) -> str:
    lib = library or load_paragraph_library()
    root = _case_root(facts)
    flags = detect_fact_flags(facts)
    ca = root.get("case_architecture") if isinstance(root.get("case_architecture"), dict) else {}
    sels = _selections(facts)

    sel_key, sel_vid = _parse_selection(sels.get("section_e_balancing") or sels.get("balancing"))
    if sel_key and sel_key in (lib.get("balancing") or {}):
        template_key = sel_key
        variant_id = sel_vid or "v1"
    elif flags["has_caregiver_role"] and flags["adverse_type"] == "overstay":
        template_key = "balancing_caregiver_vs_overstay"
        variant_id = "v1"
    else:
        template_key = "balancing_standard"
        variant_id = "v1"

    inventory_para = _get_variant_paragraph(lib, "balancing", template_key, variant_id=variant_id)
    closing_para = _get_variant_paragraph(lib, "balancing", "closing_template", variant_id="v1")
    if not closing_para:
        closing_para = (
            "This is not a case about ##ADVERSE_FACTOR_BRIEF##. It is a case about "
            "##CASE_THEME_BRIEF##. A favorable exercise of discretion is both legally "
            "supported and compelled by the facts of this record."
        )

    extra = dict(facts)
    extra_cf = dict(root)
    extra_app = dict(root.get("applicant") if isinstance(root.get("applicant"), dict) else {})
    extra_app["balancing_inventory"] = (
        ca.get("balancing_inventory")
        or root.get("balancing_inventory")
        or "[positive equities from Sections A and B]"
    )
    extra_cf["applicant"] = extra_app
    extra["case_facts"] = extra_cf

    body = substitute_slots(inventory_para, extra) if inventory_para else ""
    body = (body + "\n\n" if body else "") + substitute_slots(closing_para, extra)

    return body


def build_certificate_of_service(facts: dict[str, Any]) -> str:
    root = _case_root(facts)
    extra = dict(facts)
    extra_cf = dict(root)
    extra_app = dict(root.get("applicant") if isinstance(root.get("applicant"), dict) else {})
    service = root.get("service") if isinstance(root.get("service"), dict) else {}
    extra_app["parties_served"] = service.get("parties") or root.get("parties_served") or "USCIS"
    extra_app["service_method"] = service.get("method") or root.get("service_method") or "electronic submission"
    # Firm profile fields may arrive flat
    if not (root.get("attorney") or {}).get("attorney_name") if isinstance(root.get("attorney"), dict) else True:
        pass
    extra_cf["applicant"] = extra_app
    # Ensure attorney/firm from root
    if "attorney" not in extra_cf or not isinstance(extra_cf.get("attorney"), dict):
        extra_cf["attorney"] = {
            "attorney_name": root.get("attorney_name") or "",
            "firm_name": root.get("firm_name") or "",
            "bar_number": root.get("attorney_bar") or root.get("bar_number") or "",
        }
    extra["case_facts"] = extra_cf
    return substitute_slots(CERTIFICATE_OF_SERVICE_TEMPLATE, extra)


def fill_section(section_id: str, facts: dict[str, Any], library: dict[str, Any] | None = None) -> str:
    """Replace FILL output with paragraph library lookup."""
    lib = library or load_paragraph_library()
    sid = (section_id or "").strip()

    if sid == "argument_intro":
        return build_argument_intro(facts, lib)
    if sid == "section_a":
        return build_primary_equity(facts, lib)
    if sid == "section_b":
        return build_secondary_equities(facts, lib)
    if sid == "section_d_adverse":
        return build_adverse_section(facts, lib)
    if sid == "section_e_balancing":
        return build_balancing(facts, lib)
    if sid in {"certificate_of_service", "certificate", "service"}:
        return build_certificate_of_service(facts)

    # statutory_eligibility and others: caller may use fill_template
    return f"[SECTION {sid} — no library handler defined]"
