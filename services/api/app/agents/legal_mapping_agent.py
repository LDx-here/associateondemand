"""Legal Mapping Agent — facts to legal elements (BUILD_SPEC §4)."""

from __future__ import annotations

import json
from typing import Any

from app.agents._llm_skill import resolve_skill_path, run_skill_llm
from app.services import airtable as at

_SKILL = resolve_skill_path("07-Legal-Mapping-SKILL.md", "AOD_LEGAL_MAPPING_SKILL_PATH")


def _mapping_context(matter_id: str) -> str:
    if not at.is_configured() or not matter_id:
        return ""
    elements = [e for e in at.list_legal_elements(limit=100) if e.get("matter_id") == matter_id]
    return json.dumps({"legal_elements": elements}, indent=2, default=str)[:8000]


def run_legal_mapping(matter_id: str, instruction: str) -> Any:
    ctx = _mapping_context(matter_id)
    return run_skill_llm(
        agent="legal_mapping",
        matter_id=matter_id,
        instruction=instruction or f"Map legal elements for {matter_id}",
        skill_path=_SKILL,
        role="the RMV Legal Mapping Agent",
        extra_context=f"## Existing legal elements (Airtable)\n{ctx}" if ctx else "",
        confidence=0.77,
    )


def legal_mapping_from_payload(payload: dict) -> Any:
    return run_legal_mapping(
        str(payload.get("matter_id") or ""),
        str(payload.get("instruction") or payload.get("query") or ""),
    )
