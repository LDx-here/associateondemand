"""Mass Auditor Agent — batch matter readiness review (BUILD_SPEC §4)."""

from __future__ import annotations

import json
from typing import Any

from app.agents._llm_skill import resolve_skill_path, run_skill_llm
from app.services import airtable as at

_SKILL = resolve_skill_path("06-Mass-Audit-SKILL.md", "AOD_MASS_AUDIT_SKILL_PATH")


def _audit_context(matter_id: str) -> str:
    if not at.is_configured():
        return "Airtable not configured — audit limited to instruction text only."

    matters = at.list_matters(limit=50)
    if matter_id and matter_id.lower() not in ("all", "firm", "batch"):
        matters = [m for m in matters if m.get("matter_id") == matter_id] or matters[:1]

    tasks = at.list_tasks(limit=100)
    elements = at.list_legal_elements(limit=200)

    by_matter_tasks: dict[str, list] = {}
    for t in tasks:
        mid = str(t.get("matter_id") or "")
        by_matter_tasks.setdefault(mid, []).append(t)

    by_matter_elements: dict[str, list] = {}
    for el in elements:
        mid = str(el.get("matter_id") or "")
        by_matter_elements.setdefault(mid, []).append(el)

    snapshot = []
    for m in matters[:20]:
        mid = str(m.get("matter_id") or "")
        snapshot.append(
            {
                "matter": m,
                "tasks": by_matter_tasks.get(mid, [])[:15],
                "legal_elements": by_matter_elements.get(mid, [])[:20],
            }
        )
    return json.dumps(snapshot, indent=2, default=str)[:12000]


def run_mass_audit(matter_id: str, instruction: str) -> Any:
    ctx = _audit_context(matter_id)
    return run_skill_llm(
        agent="mass_audit",
        matter_id=matter_id,
        instruction=instruction or f"Mass audit for {matter_id}",
        skill_path=_SKILL,
        role="the RMV Mass Auditor",
        extra_context=f"## Airtable snapshot (JSON)\n{ctx}",
        confidence=0.76,
    )


def mass_audit_from_payload(payload: dict) -> Any:
    return run_mass_audit(
        str(payload.get("matter_id") or ""),
        str(payload.get("instruction") or payload.get("query") or ""),
    )
