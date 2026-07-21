"""Drafting prompt assembly tests — Legal OS port verification."""

from __future__ import annotations

import json

from app.services.drafting_prompt import (
    ANTI_GENERIC_RULES,
    DEFAULT_DRAFTING_PROMPT,
    build_drafting_context_block,
    build_drafting_system_prompt,
    resolve_task_config,
)


def test_build_drafting_system_prompt_includes_matter_context() -> None:
    prompt = build_drafting_system_prompt(
        matter_ctx={
            "matter_id": "AOD-1001",
            "case_type": "Immigration - Family",
            "country": "USA",
            "title": "AOS waiver matter",
            "posture": "Pending",
        },
        firm_profile=None,
    )
    assert "MATTER CONTEXT" in prompt
    assert "AOD-1001" in prompt
    assert "Immigration - Family" in prompt
    assert "FIRM STYLE REQUIREMENTS (MUST FOLLOW)" not in prompt
    assert "chatbot filler" in prompt


def test_build_drafting_system_prompt_injects_firm_memory() -> None:
    prompt = build_drafting_system_prompt(
        matter_ctx={"matter_id": "AOD-1001", "case_type": "Immigration"},
        firm_profile={
            "writing_tone": "Formal and concise",
            "citation_style": "Bluebook",
            "caption_format": "All caps parties",
            "additional_notes": "Always cite BIA precedent.",
        },
    )
    assert "FIRM STYLE REQUIREMENTS" in prompt
    assert "Formal and concise" in prompt
    assert "Bluebook" in prompt
    assert "firm's own associate attorney" in prompt
    assert "BIA precedent" in prompt


def test_build_drafting_system_prompt_uses_custom_base() -> None:
    prompt = build_drafting_system_prompt(
        matter_ctx={"matter_id": "AOD-1001"},
        base_prompt="Custom motion drafter prompt.",
    )
    assert prompt.startswith("Custom motion drafter prompt.")


def test_anti_generic_rules_present() -> None:
    assert "Certainly" in ANTI_GENERIC_RULES
    assert DEFAULT_DRAFTING_PROMPT.startswith("You are an experienced")


def test_resolve_task_config_aos_brief() -> None:
    cfg = resolve_task_config("aos_discretionary_brief", "aos-discretionary-brief")
    assert cfg["max_tokens"] == 12000
    assert "claude" in cfg["model"]


def test_build_drafting_context_block_includes_structured_facts(monkeypatch) -> None:
    facts = {
        "v": 1,
        "practiceArea": "immigration",
        "caseType": "Immigration - Asylum",
        "fields": {"clientStatus": "Pending", "reliefSought": "AOS"},
    }

    def fake_fetch_drafting_facts(_matter: str):
        return facts

    def fake_fetch_assessment_doc(_matter: str):
        return None

    def fake_fetch_matter(_matter: str):
        return {"matter_id": "AOD-1001", "assessment_data": json.dumps({"claimType": "AOS waiver"})}

    def fake_firm_memory():
        return {"writing_tone": "Professional", "additional_notes": "Use RMV headers."}

    monkeypatch.setattr(
        "app.services.drafting_prompt.fetch_drafting_facts",
        fake_fetch_drafting_facts,
    )
    monkeypatch.setattr(
        "app.services.drafting_prompt.fetch_latest_assessment_document",
        fake_fetch_assessment_doc,
    )
    monkeypatch.setattr(
        "app.services.drafting_prompt.fetch_matter_context",
        fake_fetch_matter,
    )
    monkeypatch.setattr(
        "app.services.drafting_prompt.fetch_firm_memory_profile",
        fake_firm_memory,
    )

    block = build_drafting_context_block("AOD-1001")
    assert "Structured facts for drafting" in block
    assert "Current immigration status: Pending" in block
    assert "Case assessment (structured)" in block
    assert "Firm Memory" in block
    assert "Professional" in block
