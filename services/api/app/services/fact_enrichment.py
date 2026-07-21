"""LLM enrichment pass — map heuristic facts to legal elements with human labels."""

from __future__ import annotations

import json
import logging
import re
import uuid
from typing import Any

from app.services.llm import generate_text, is_configured

LOGGER = logging.getLogger(__name__)

GENERIC_FACT_TYPES = frozenset({"name", "date", "event", "reference_number", "a_number"})

ENRICHMENT_SYSTEM = """You are an immigration and litigation fact analyst for a law firm operating system.
Given OCR text and heuristic extracted facts, produce structured JSON mapping each distinct fact to legal elements.
Rules:
- Assign human-readable labels (never generic "name" alone — e.g. "Qualifying relative — spouse", "Hearing date").
- Map each fact to one primary legal element from the provided list.
- Deduplicate near-duplicates (same person/date mentioned twice).
- Provide a one-line element_fit explaining how the fact supports that element.
- Prefer attorney-verifiable values; quote source excerpts from OCR when possible.
- Return ONLY valid JSON — no markdown fences or commentary."""

ENRICHMENT_USER_TEMPLATE = """Case type: {case_type}
Practice area: {practice_area}
Deliverable: {deliverable_id}

Legal elements (map facts to these):
{legal_elements_block}

Practice-area assessment fields:
{field_hints_block}

OCR excerpt (may be truncated):
{ocr_text}

Heuristic facts (from regex — may include duplicates or generic labels):
{heuristic_facts}

Return JSON object:
{{
  "facts": [
    {{
      "label": "Human-readable label",
      "fact_type": "slug_snake_case",
      "value": "extracted value",
      "legal_element": "Element name from list",
      "legal_element_id": "element id slug",
      "field_id": "practice-area field id if applicable",
      "element_fit": "One sentence on how this meets the element",
      "context": "Source excerpt from OCR",
      "confidence": 0.0-1.0
    }}
  ],
  "summary": "One sentence on extraction quality"
}}"""


def _slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", value.lower()).strip("_") or "fact"


def heuristic_facts_need_enrichment(facts: list[dict[str, Any]]) -> bool:
    """True when facts are mostly generic heuristics without element mapping."""

    if not facts:
        return False
    unmapped = sum(
        1
        for f in facts
        if not f.get("fieldId")
        and not f.get("field_id")
        and not f.get("legal_element")
        and not f.get("legalElement")
        and (f.get("fact_type") or f.get("factType") or "") in GENERIC_FACT_TYPES
    )
    if unmapped >= 2:
        return True
    types = [str(f.get("fact_type") or f.get("factType") or "") for f in facts]
    if types and len(set(types)) == 1 and types[0] in GENERIC_FACT_TYPES:
        return True
    return False


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


def _format_legal_elements(context: dict[str, Any]) -> str:
    lines: list[str] = []
    for element in context.get("legal_elements") or []:
        if isinstance(element, str) and element.strip():
            lines.append(f"- {element.strip()} (id: {_slug(element)})")
        elif isinstance(element, dict):
            name = str(element.get("name") or element.get("label") or "").strip()
            eid = str(element.get("id") or _slug(name)).strip()
            desc = str(element.get("description") or "").strip()
            if name:
                lines.append(f"- {name} (id: {eid})" + (f" — {desc}" if desc else ""))
    hints = context.get("fact_field_hints") or []
    for hint in hints:
        if not isinstance(hint, dict):
            continue
        label = str(hint.get("label") or hint.get("id") or "").strip()
        fid = str(hint.get("id") or "").strip()
        section = str(hint.get("feedsSection") or hint.get("feeds_section") or "").strip()
        if label:
            lines.append(
                f"- {label} (field_id: {fid})"
                + (f" → draft section: {section}" if section else "")
            )
    return "\n".join(lines) if lines else "- (none provided — infer from case type)"


def _format_field_hints(context: dict[str, Any]) -> str:
    hints = context.get("fact_field_hints") or []
    lines: list[str] = []
    for hint in hints:
        if not isinstance(hint, dict):
            continue
        label = str(hint.get("label") or "").strip()
        fid = str(hint.get("id") or "").strip()
        if label:
            lines.append(f"- {label} (id: {fid})")
    return "\n".join(lines) if lines else "- (none)"


def _format_heuristic_facts(facts: list[dict[str, Any]]) -> str:
    lines: list[str] = []
    for i, fact in enumerate(facts[:30], start=1):
        ftype = fact.get("fact_type") or fact.get("factType") or "unknown"
        val = fact.get("editedValue") or fact.get("edited_value") or fact.get("value") or ""
        ctx = fact.get("context") or ""
        lines.append(f"{i}. [{ftype}] {val}" + (f" | context: {ctx[:120]}" if ctx else ""))
    return "\n".join(lines) if lines else "(none)"


def _normalize_enriched_fact(raw: dict[str, Any], index: int) -> dict[str, Any]:
    label = str(raw.get("label") or raw.get("fact_type") or "Fact").strip()
    fact_type = str(raw.get("fact_type") or _slug(label)).strip()
    value = str(raw.get("value") or "").strip()
    context = str(raw.get("context") or raw.get("source_excerpt") or "").strip()
    return {
        "id": str(raw.get("id") or f"enriched-{index}"),
        "label": label,
        "fact_type": fact_type,
        "value": value,
        "legalElement": str(raw.get("legal_element") or raw.get("legalElement") or "").strip(),
        "legalElementId": str(raw.get("legal_element_id") or raw.get("legalElementId") or "").strip(),
        "fieldId": str(raw.get("field_id") or raw.get("fieldId") or "").strip() or None,
        "elementFit": str(raw.get("element_fit") or raw.get("elementFit") or "").strip(),
        "context": context[:300] if context else None,
        "confidence": float(raw.get("confidence") or 0.75),
        "enriched": True,
        "verified": bool(raw.get("verified")),
    }


def enrich_facts_with_llm(
    *,
    ocr_text: str,
    heuristic_facts: list[dict[str, Any]],
    context: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Run Claude enrichment pass. Returns enriched payload metadata."""

    ctx = context or {}
    if not is_configured():
        return {
            "facts": heuristic_facts,
            "enrichment_status": "heuristic_only",
            "enrichment_warning": "Enable ANTHROPIC_API_KEY for element mapping",
            "enriched": False,
        }

    if not ocr_text.strip() and not heuristic_facts:
        return {
            "facts": [],
            "enrichment_status": "heuristic_only",
            "enriched": False,
        }

    user_prompt = ENRICHMENT_USER_TEMPLATE.format(
        case_type=ctx.get("case_type") or ctx.get("caseType") or "unknown",
        practice_area=ctx.get("practice_area") or ctx.get("practiceArea") or "general",
        deliverable_id=ctx.get("deliverable_id") or ctx.get("deliverableId") or "unknown",
        legal_elements_block=_format_legal_elements(ctx),
        field_hints_block=_format_field_hints(ctx),
        ocr_text=(ocr_text or "")[:6000],
        heuristic_facts=_format_heuristic_facts(heuristic_facts),
    )

    raw = generate_text(system=ENRICHMENT_SYSTEM, user=user_prompt, max_tokens=4096, temperature=0.1)
    if not raw:
        return {
            "facts": heuristic_facts,
            "enrichment_status": "failed",
            "enrichment_warning": "LLM enrichment unavailable — showing heuristic facts",
            "enriched": False,
        }

    parsed = _parse_llm_json(raw)
    if not parsed or not isinstance(parsed.get("facts"), list):
        LOGGER.warning("fact enrichment: invalid JSON from LLM")
        return {
            "facts": heuristic_facts,
            "enrichment_status": "failed",
            "enrichment_warning": "LLM returned invalid JSON — showing heuristic facts",
            "enriched": False,
        }

    enriched: list[dict[str, Any]] = []
    for idx, item in enumerate(parsed["facts"]):
        if not isinstance(item, dict):
            continue
        fact = _normalize_enriched_fact(item, idx)
        if fact["value"]:
            enriched.append(fact)

    if not enriched:
        return {
            "facts": heuristic_facts,
            "enrichment_status": "failed",
            "enrichment_warning": "LLM produced no facts — showing heuristic extraction",
            "enriched": False,
        }

    return {
        "facts": enriched[:24],
        "enrichment_status": "enriched",
        "enrichment_summary": str(parsed.get("summary") or "").strip(),
        "enriched": True,
    }


def merge_enrichment_into_payload(
    heuristic_facts: list[dict[str, Any]],
    enrichment: dict[str, Any],
) -> list[dict[str, Any]]:
    """Prefer enriched facts; attach ids if missing."""

    facts = enrichment.get("facts") or heuristic_facts
    out: list[dict[str, Any]] = []
    for i, fact in enumerate(facts):
        row = dict(fact)
        row.setdefault("id", str(uuid.uuid4())[:8])
        out.append(row)
    return out
