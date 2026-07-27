"""AOS discretionary brief — extract structured drafting facts from attorney paste summary."""

from __future__ import annotations

import json
import re
from typing import Any

from app.services.llm import generate_text, is_configured

AOS_FIELD_IDS = (
    "applicantName",
    "aNumber",
    "clientStatus",
    "entryDate",
    "portOfEntry",
    "entryVisaType",
    "petitionerName",
    "petitionerRelationship",
    "qualifyingRelative",
    "i130ApprovedDate",
    "i485FiledDate",
    "reliefSought",
    "caseTheme",
    "caseThemeBrief",
    "sectionAHeading",
    "sectionAFacts",
    "sectionBHeading",
    "sectionBFacts",
    "adverseHeading",
    "adverseFactorBrief",
    "positiveEquities",
    "balancingInventory",
    "adverseFacts",
    "adverseFactors",
    "departureHarm",
    "extremeHardshipFactors",
    "inadmissibilityGrounds",
    "priorFilings",
)

EXTRACT_SYSTEM = """You are an immigration associate extracting facts for an AOS discretionary brief (I-485).
Given an attorney's client fact summary, return ONLY valid JSON mapping to structured fields.
Rules:
- Extract only what is stated or clearly implied — do not invent facts.
- Dates: ISO YYYY-MM-DD when possible, else preserve attorney's phrasing.
- caseTheme: one factual sentence with stakes (attorney will edit).
- sectionAHeading / sectionBHeading / adverseHeading: argument claims, not category labels.
- paragraphSelections: suggest library keys only when confident (section_a, section_d_adverse, section_e_balancing).
- Leave unknown fields as empty strings.
- additionalNotes: capture nuance not mapped to a field."""

EXTRACT_USER = """Attorney fact summary:
{summary}

Return JSON:
{{
  "fields": {{ "<field_id>": "<value or empty string>", ... }},
  "paragraphSelections": {{ "section_a": "<key.variant or empty>", ... }},
  "additionalNotes": "<optional string>",
  "confidence": "high|medium|low",
  "extraction_mode": "llm"
}}"""

DATE_PATTERNS = (
    re.compile(
        r"\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|"
        r"Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+\d{1,2},?\s+\d{4}\b",
        re.I,
    ),
    re.compile(r"\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b"),
    re.compile(r"\b\d{4}-\d{2}-\d{2}\b"),
)


def _parse_llm_json(raw: str) -> dict[str, Any] | None:
    text = raw.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    try:
        data = json.loads(text)
        return data if isinstance(data, dict) else None
    except json.JSONDecodeError:
        match = re.search(r"\{[\s\S]*\}", text)
        if not match:
            return None
        try:
            data = json.loads(match.group())
            return data if isinstance(data, dict) else None
        except json.JSONDecodeError:
            return None


def _first_date_near(text: str, keywords: tuple[str, ...]) -> str:
    lower = text.lower()
    for kw in keywords:
        idx = lower.find(kw)
        if idx < 0:
            continue
        window = text[max(0, idx - 80) : idx + len(kw) + 120]
        for pattern in DATE_PATTERNS:
            match = pattern.search(window)
            if match:
                return match.group().strip()
    return ""


def _match_group(pattern: str, text: str, flags: int = re.I) -> str:
    match = re.search(pattern, text, flags)
    return match.group(1).strip() if match else ""


def heuristic_extract_aos_facts(summary: str) -> dict[str, Any]:
    """Deterministic bucket extract when LLM unavailable."""
    text = summary.strip()
    fields: dict[str, str] = {fid: "" for fid in AOS_FIELD_IDS}
    if not text:
        return {
            "fields": fields,
            "paragraphSelections": {},
            "additionalNotes": "",
            "confidence": "low",
            "extraction_mode": "heuristic",
        }

    a_num = re.search(r"\bA-?\d{8,9}\b", text, re.I)
    if a_num:
        fields["aNumber"] = a_num.group().upper().replace("A", "A-") if "A-" not in a_num.group() else a_num.group()

    fields["entryDate"] = _first_date_near(text, ("entry", "entered", "arrival", "i-94", "port of entry"))
    fields["i130ApprovedDate"] = _first_date_near(text, ("i-130", "i130", "petition approved", "approved petition"))
    fields["i485FiledDate"] = _first_date_near(text, ("i-485", "i485", "filed adjustment", "adjustment application"))

    fields["portOfEntry"] = _match_group(
        r"(?:port of entry|POE|entered (?:at|through))\s*[:\-]?\s*([A-Za-z\s,]+?)(?:\.|,|\n|$)",
        text,
    )
    fields["entryVisaType"] = _match_group(
        r"(?:visa type|entered on|admitted as)\s*[:\-]?\s*((?:B-?\d|F-?\d|H-?\d|[A-Z]-?\d)[^\n,.]{0,40})",
        text,
    )

    fields["applicantName"] = _match_group(
        r"(?:applicant|client|beneficiary|respondent)(?:'s)?\s*(?:name)?\s*[:\-]?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})",
        text,
    )
    fields["petitionerName"] = _match_group(
        r"(?:petitioner|sponsor|usc\s+citizen)\s*[:\-]?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})",
        text,
    )
    fields["petitionerRelationship"] = _match_group(
        r"(?:relationship|petitioner is (?:her|his|their)?)\s*[:\-]?\s*(daughter|son|spouse|parent|mother|father|sibling|brother|sister)",
        text,
    )
    if not fields["petitionerRelationship"]:
        for rel in ("daughter", "son", "spouse", "parent", "mother", "father"):
            if re.search(rf"\b{rel}\b", text, re.I):
                fields["petitionerRelationship"] = rel
                break

    fields["qualifyingRelative"] = _match_group(
        r"(?:qualifying relative|hardship to)\s*[:\-]?\s*([^\n,.]{5,80})",
        text,
    )

    if re.search(r"\bout of status\b|\boverstay\b|\bvisa overstay\b|\bunlawful presence\b", text, re.I):
        fields["clientStatus"] = "Out of status / overstay"
    elif re.search(r"\btps\b", text, re.I):
        fields["clientStatus"] = "TPS"
    elif re.search(r"\blpr\b|\bpermanent resident\b", text, re.I):
        fields["clientStatus"] = "Lawful permanent resident"
    elif re.search(r"\bpending i-485\b|\bpending adjustment\b", text, re.I):
        fields["clientStatus"] = "Pending I-485"

    if re.search(r"\bhardship\b|\bextreme hardship\b", text, re.I):
        m = re.search(r"(?:extreme hardship|hardship)[^.]{0,400}\.", text, re.I)
        fields["extremeHardshipFactors"] = (m.group(0) if m else "Hardship factors referenced in summary").strip()

    if re.search(r"212\s*\(\s*a\s*\)|inadmissib", text, re.I):
        m = re.search(r"(?:INA\s*)?§?\s*212\s*\([^)]+\)[^.]{0,160}", text, re.I)
        fields["inadmissibilityGrounds"] = (m.group(0) if m else "INA §212(a) grounds referenced").strip()

    if re.search(r"\bpositive\b|\bequit|\bfamily ties\b|\bcommunity\b|\btax compliance\b", text, re.I):
        m = re.search(r"(?:positive|equit|family ties|community)[^.]{0,300}\.", text, re.I)
        fields["positiveEquities"] = (m.group(0) if m else "Positive equities referenced in summary").strip()

    if re.search(r"\boverstay\b|\bcriminal\b|\bdenial\b|\bviolation\b|\badverse\b", text, re.I):
        m = re.search(r"(?:overstay|adverse|criminal|denial|violation)[^.]{0,300}\.", text, re.I)
        fields["adverseFacts"] = (m.group(0) if m else "Adverse factors referenced in summary").strip()
        fields["adverseFactorBrief"] = "an overstay" if re.search(r"\boverstay\b", text, re.I) else ""

    if re.search(r"\bdepart|\bconsular processing\b|\b3.?year\b|\b10.?year\b|\bbar\b", text, re.I):
        m = re.search(r"(?:depart|consular|bar|separat)[^.]{0,300}\.", text, re.I)
        fields["departureHarm"] = (m.group(0) if m else "Departure/consular harm referenced").strip()

    if re.search(r"\bautism\b|\biep\b|\bdisabilit|\bspecial needs\b", text, re.I):
        m = re.search(r"(?:autism|IEP|disabilit|special needs)[^.]{0,400}\.", text, re.I)
        fields["sectionAFacts"] = (m.group(0) if m else "").strip()

    if re.search(r"\bprior (?:filing|application|petition)\b|\bprevious (?:a|i)-\d", text, re.I):
        m = re.search(r"(?:prior|previous)[^.]{0,300}\.", text, re.I)
        fields["priorFilings"] = (m.group(0) if m else "Prior immigration history referenced").strip()

    fields["reliefSought"] = "Favorable exercise of discretion and approval of Form I-485"

    filled = sum(1 for v in fields.values() if v.strip())
    confidence = "medium" if filled >= 6 else "low" if filled >= 2 else "low"

    return {
        "fields": fields,
        "paragraphSelections": {},
        "additionalNotes": "",
        "confidence": confidence,
        "extraction_mode": "heuristic",
    }


def extract_aos_facts(summary: str, *, force_heuristic: bool = False) -> dict[str, Any]:
    """LLM extract when Anthropic configured; else heuristic."""
    trimmed = summary.strip()
    if not trimmed:
        return heuristic_extract_aos_facts("")

    if force_heuristic or not is_configured():
        return heuristic_extract_aos_facts(trimmed)

    raw = generate_text(
        system=EXTRACT_SYSTEM,
        user=EXTRACT_USER.format(summary=trimmed[:12000]),
        max_tokens=4096,
        temperature=0.1,
    )
    if not raw:
        result = heuristic_extract_aos_facts(trimmed)
        result["llm_fallback"] = True
        return result

    parsed = _parse_llm_json(raw)
    if not parsed:
        result = heuristic_extract_aos_facts(trimmed)
        result["llm_fallback"] = True
        return result

    fields_in = parsed.get("fields") if isinstance(parsed.get("fields"), dict) else {}
    fields: dict[str, str] = {fid: "" for fid in AOS_FIELD_IDS}
    for key, val in fields_in.items():
        if key in fields and val is not None:
            fields[key] = str(val).strip()

    selections_raw = parsed.get("paragraphSelections")
    selections: dict[str, str] = {}
    if isinstance(selections_raw, dict):
        for k, v in selections_raw.items():
            if v and isinstance(v, str):
                selections[str(k)] = v.strip()

    return {
        "fields": fields,
        "paragraphSelections": selections,
        "additionalNotes": str(parsed.get("additionalNotes") or "").strip(),
        "confidence": str(parsed.get("confidence") or "medium"),
        "extraction_mode": "llm",
    }
