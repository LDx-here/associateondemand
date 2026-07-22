"""Load live matter context from Airtable for agent prompts."""

from __future__ import annotations

import json
import logging
from typing import Any

from app.services import airtable as at

LOGGER = logging.getLogger(__name__)

_MATTER_FIELDS = (
    "matter_id",
    "title",
    "case_type",
    "country",
    "posture",
    "status",
    "court",
    "judge",
    "summary",
    "assessment_data",
)

_IMMIGRATION_FIELD_LABELS = (
    ("clientStatus", "Current immigration status"),
    ("reliefSought", "Relief sought"),
    ("entryDate", "Date of entry"),
    ("priorityDate", "Priority date"),
    ("adverseFactors", "Adverse factors"),
    ("supportingDocs", "Supporting documents"),
)

_PI_FIELD_LABELS = (
    ("incidentDate", "Date of incident"),
    ("liabilityTheory", "Liability theory"),
    ("injuries", "Injuries"),
    ("treatmentSummary", "Treatment"),
    ("damagesSketch", "Damages overview"),
)


def fetch_matter_context(matter_code: str) -> dict[str, Any] | None:
    """Return a compact matter dict for LLM context, or None if not found."""

    if not at.is_configured() or not matter_code:
        return None

    safe = matter_code.replace("'", "\\'")
    formula = f"{{matter_id}} = '{safe}'"
    try:
        with at._client() as client:
            resp = client.get(
                at._base_url(at.TABLE_MATTERS),
                params={"filterByFormula": formula, "maxRecords": "1"},
            )
            if resp.status_code >= 400:
                LOGGER.warning("matter lookup failed: %s", resp.status_code)
                return None
            records = resp.json().get("records") or []
            if not records:
                return None
            fields = records[0].get("fields") or {}
            ctx: dict[str, Any] = {"matter_id": matter_code}
            for key in _MATTER_FIELDS:
                val = fields.get(key)
                if val is not None and val != "":
                    ctx[key] = val
            return ctx
    except Exception:
        LOGGER.exception("matter context fetch failed")
        return None


def format_assessment_data(raw: Any) -> str:
    """Render structured case assessment for agent prompts (Case Assessment tab)."""

    if not raw:
        return ""
    data: Any = raw
    if isinstance(raw, str):
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            return f"- Case assessment (text): {raw[:1500]}"
    if not isinstance(data, dict):
        return f"- Case assessment: {str(data)[:1500]}"

    field_labels = (
        ("courtAgency", "Court/Agency"),
        ("judgeOfficer", "Judge/Officer"),
        ("currentStage", "Current stage"),
        ("filingHistory", "Filing history"),
        ("claimType", "Claim type"),
        ("legalStandard", "Legal standard"),
        ("deadlineRisk", "Deadline risk"),
        ("overallAssessment", "Overall assessment"),
        ("areasToStrengthen", "Areas to strengthen"),
        ("claimElementsNotes", "Claim elements"),
        ("documentsInFile", "Documents on file"),
        ("vulnerability", "Vulnerability flags"),
        ("attorneyReviewNeeded", "Attorney review needed"),
        ("strategyQuestions", "Strategy questions"),
    )
    lines = ["## Case assessment (structured)"]
    for key, label in field_labels:
        val = data.get(key)
        if val:
            lines.append(f"- {label}: {val}")
    actions = data.get("immediateActions")
    if isinstance(actions, list):
        acts = [str(a).strip() for a in actions if str(a).strip()]
        if acts:
            lines.append("- Immediate actions: " + "; ".join(acts))
    return "\n".join(lines) if len(lines) > 1 else ""


def format_assessment_document(raw: Any) -> str:
    """Render uploaded case assessment scan OCR + extracted fields for agent prompts."""

    if not raw:
        return ""
    data: Any = raw
    if isinstance(raw, str):
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            return f"## Case assessment document (uploaded scan)\n- OCR text:\n{raw[:3000]}"
    if not isinstance(data, dict) or data.get("v") != 1:
        return ""

    lines = ["## Case assessment document (uploaded scan)"]
    title = data.get("title")
    if title:
        lines.append(f"- Document: {title}")
    ocr = data.get("ocrText")
    if ocr and str(ocr).strip():
        lines.append(f"- OCR text:\n{str(ocr).strip()[:3000]}")
    facts = data.get("facts")
    if isinstance(facts, list) and facts:
        lines.append("- Extracted fields (attorney-verified values preferred):")
        for fact in facts[:24]:
            if not isinstance(fact, dict):
                continue
            edited = str(fact.get("editedValue") or "").strip()
            val = edited or str(fact.get("value") or "").strip()
            if val:
                tag = " [verified]" if fact.get("verified") else " [needs review]"
                label = str(fact.get("label") or fact.get("fact_type") or "fact").strip()
                element = str(fact.get("legalElement") or "").strip()
                element_suffix = f" → {element}" if element else ""
                fit = str(fact.get("elementFit") or "").strip()
                fit_suffix = f" ({fit})" if fit else ""
                lines.append(f"  - {label}: {val}{element_suffix}{fit_suffix}{tag}")
    return "\n".join(lines) if len(lines) > 1 else ""


def format_drafting_facts(raw: Any) -> str:
    """Render structured drafting facts from Notes (type Facts) for agent prompts."""

    if not raw:
        return ""
    data: Any = raw
    if isinstance(raw, str):
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            return ""
    if not isinstance(data, dict) or data.get("v") != 1:
        return ""

    area = str(data.get("practiceArea") or "")
    fields = data.get("fields") if isinstance(data.get("fields"), dict) else {}
    labels = _IMMIGRATION_FIELD_LABELS if area == "immigration" else _PI_FIELD_LABELS
    lines = ["## Structured facts for drafting"]
    case_type = data.get("caseType")
    if case_type:
        lines.append(f"- Practice area: {case_type}")
    for key, label in labels:
        val = fields.get(key)
        if not val:
            continue
        if isinstance(val, list):
            joined = "; ".join(str(v).strip() for v in val if str(v).strip())
            if joined:
                lines.append(f"- {label}: {joined}")
        elif str(val).strip():
            lines.append(f"- {label}: {str(val).strip()}")
    extra = data.get("additionalNotes")
    if extra and str(extra).strip():
        lines.append(f"- Additional notes: {str(extra).strip()}")
    return "\n".join(lines) if len(lines) > 1 else ""


def fetch_drafting_facts(matter_code: str) -> dict[str, Any] | None:
    """Load structured drafting facts note for a matter."""

    if not at.is_configured() or not matter_code:
        return None
    try:
        return at.fetch_latest_drafting_facts(matter_code)
    except Exception:
        LOGGER.exception("drafting facts fetch failed")
        return None


def fetch_latest_assessment_document(matter_code: str) -> dict[str, Any] | None:
    """Parse the newest Assessment Document note JSON for agent prompts."""

    if not at.is_configured() or not matter_code:
        return None
    try:
        notes = at.list_matter_notes(matter_code, max_records=100)
        matches = [
            n
            for n in notes
            if str(n.get(at.FIELDS_NOTES["type"]) or "") == "Assessment Document"
        ]
        if not matches:
            return None
        matches.sort(key=lambda n: str(n.get(at.FIELDS_NOTES["created_at"]) or ""), reverse=True)
        raw = matches[0].get(at.FIELDS_NOTES["content"])
        if not raw or not isinstance(raw, str):
            return None
        data = json.loads(raw.strip())
        if isinstance(data, dict) and data.get("v") == 1:
            return data
    except Exception:
        LOGGER.exception("assessment document fetch failed")
    return None


def format_research_notes(notes: list[dict[str, Any]]) -> str:
    """Render attorney-pasted Westlaw / research notes for agent prompts."""

    if not notes:
        return ""
    lines = ["## Research inputs (attorney-provided)"]
    for note in notes[:6]:
        content = str(note.get(at.FIELDS_NOTES["content"]) or "").strip()
        if not content:
            continue
        author = str(note.get(at.FIELDS_NOTES["author"]) or "Attorney").strip()
        lines.append(f"### {author}")
        lines.append(content[:4000])
    return "\n".join(lines) if len(lines) > 1 else ""


def format_attorney_instructions(notes: list[dict[str, Any]]) -> str:
    """Render persistent matter-level attorney instructions."""

    if not notes:
        return ""
    latest = notes[0]
    content = str(latest.get(at.FIELDS_NOTES["content"]) or "").strip()
    if not content:
        return ""
    return "## Attorney instructions (persistent)\n" + content[:3000]


def _notes_by_type(matter_code: str, note_type: str, *, max_records: int = 20) -> list[dict[str, Any]]:
    if not at.is_configured() or not matter_code:
        return []
    try:
        notes = at.list_matter_notes(matter_code, max_records=max_records)
        matches = [n for n in notes if str(n.get(at.FIELDS_NOTES["type"]) or "") == note_type]
        matches.sort(key=lambda n: str(n.get(at.FIELDS_NOTES["created_at"]) or ""), reverse=True)
        return matches
    except Exception:
        LOGGER.exception("notes by type fetch failed")
        return []


def fetch_research_notes(matter_code: str) -> list[dict[str, Any]]:
    return _notes_by_type(matter_code, "Research")


def fetch_attorney_instructions(matter_code: str) -> list[dict[str, Any]]:
    return _notes_by_type(matter_code, "Instructions", max_records=5)


def format_firm_memory_block(*, max_patterns: int = 8) -> str:
    """Render Airtable Firm Memory (Strategy Patterns) for agent prompts."""

    if not at.is_configured():
        return ""
    try:
        patterns = at.list_firm_memory_patterns(max_records=max_patterns)
    except Exception:
        LOGGER.exception("firm memory fetch failed")
        return ""
    if not patterns:
        return ""

    lines = ["## Firm Memory (style + reference snippets)"]
    for row in patterns[:max_patterns]:
        trigger = str(row.get("strategy_used") or row.get("fact_pattern") or "").strip()
        body = str(row.get("outcome") or row.get("fact_pattern_detail") or "").strip()
        if not body:
            continue
        label = trigger if trigger and trigger.lower() not in {"firm_memory", "firm memory"} else "Style"
        lines.append(f"### {label}")
        lines.append(body[:1200])
    return "\n".join(lines) if len(lines) > 1 else ""


def format_matter_context(ctx: dict[str, Any] | None, *, matter_code: str | None = None) -> str:
    if not ctx:
        base = "No live matter row found in Airtable for this matter_id."
        extras: list[str] = [base]
        firm = format_firm_memory_block()
        if firm:
            extras.append(firm)
        try:
            from app.agents.firm_context import load_firm_knowledge_excerpts

            knowledge = load_firm_knowledge_excerpts(max_chars=4000)
            if knowledge:
                extras.append(knowledge)
        except Exception:
            LOGGER.exception("firm knowledge excerpts load failed")
        return "\n\n".join(extras)

    lines = [f"- {k}: {v}" for k, v in ctx.items() if k != "assessment_data"]
    assessment_block = format_assessment_data(ctx.get("assessment_data"))
    if assessment_block:
        lines.append(assessment_block)
    code = matter_code or str(ctx.get("matter_id") or "")
    drafting = fetch_drafting_facts(code) if code else None
    drafting_block = format_drafting_facts(drafting)
    if drafting_block:
        lines.append(drafting_block)
    assessment_doc = fetch_latest_assessment_document(code) if code else None
    assessment_doc_block = format_assessment_document(assessment_doc)
    if assessment_doc_block:
        lines.append(assessment_doc_block)
    if code:
        instructions_block = format_attorney_instructions(fetch_attorney_instructions(code))
        if instructions_block:
            lines.append(instructions_block)
        research_block = format_research_notes(fetch_research_notes(code))
        if research_block:
            lines.append(research_block)

    firm = format_firm_memory_block()
    if firm:
        lines.append(firm)
    try:
        from app.agents.firm_context import load_firm_knowledge_excerpts

        knowledge = load_firm_knowledge_excerpts(max_chars=4000)
        if knowledge:
            lines.append(knowledge)
    except Exception:
        LOGGER.exception("firm knowledge excerpts load failed")

    return "\n".join(lines)
