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


def format_matter_context(ctx: dict[str, Any] | None) -> str:
    if not ctx:
        return "No live matter row found in Airtable for this matter_id."
    lines = [f"- {k}: {v}" for k, v in ctx.items() if k != "assessment_data"]
    assessment_block = format_assessment_data(ctx.get("assessment_data"))
    if assessment_block:
        lines.append(assessment_block)
    return "\n".join(lines)
