"""Drafting Agent — memos, brief sections, letters, motions (BUILD_SPEC §4)."""

from __future__ import annotations

from typing import Any

from app.agents._llm_skill import resolve_skill_path, run_skill_llm

_SKILL = resolve_skill_path("05-Drafting-SKILL.md", "AOD_DRAFTING_SKILL_PATH")


def run_drafting(matter_id: str, instruction: str) -> Any:
    return run_skill_llm(
        agent="drafting",
        matter_id=matter_id,
        instruction=instruction,
        skill_path=_SKILL,
        role="the RMV Drafting Agent",
        extra_rules="Identify document type from the instruction and format accordingly.",
        confidence=0.8,
    )


def drafting_from_payload(payload: dict) -> Any:
    return run_drafting(
        str(payload.get("matter_id") or ""),
        str(payload.get("instruction") or payload.get("query") or ""),
    )
