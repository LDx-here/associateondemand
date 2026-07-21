"""Drafting prompt assembly — ported from legal-os/shared/types.ts + drafting router."""

from __future__ import annotations

import json
import os
import re
from typing import Any

from app.services import airtable as at
from app.services.matter_context import (
    fetch_drafting_facts,
    fetch_latest_assessment_document,
    fetch_matter_context,
    format_assessment_data,
    format_assessment_document,
    format_drafting_facts,
)

DEFAULT_DRAFTING_PROMPT = (
    "You are an experienced litigation associate attorney drafting a motion for a law firm client. "
    "You write with precision, cite relevant case law with proper Bluebook formatting, and structure "
    "arguments persuasively. Your writing is concise but thorough — every sentence advances the argument. "
    "You follow the firm's established style exactly as specified in the FIRM STYLE REQUIREMENTS section."
)

ANTI_GENERIC_RULES = (
    "Voice and quality rules (mandatory):\n"
    "- Write like a careful senior associate — no chatbot filler ('Certainly', 'I'd be happy to', "
    "'In conclusion', 'It is important to note').\n"
    "- No AI meta-commentary or references to being an assistant.\n"
    "- Lead with substance; match RMV immigration brief tone, not generic assistant prose.\n"
    "- Never fabricate case quotes, page pinpoints, or client facts.\n"
    "- Use bracketed [FACT NEEDED] placeholders when facts are missing.\n"
    "- The output must read as if written by the firm's own associate attorney."
)

# Per deliverable defaults (override via env: AOD_DRAFTING_MODEL_AOS, etc.)
TASK_MODEL_DEFAULTS: dict[str, dict[str, Any]] = {
    "aos_discretionary_brief": {"model": "claude-sonnet-4-6", "max_tokens": 12000, "temperature": 0.2},
    "cover_letter": {"model": "claude-sonnet-4-6", "max_tokens": 8192, "temperature": 0.25},
    "brief_section": {"model": "claude-sonnet-4-6", "max_tokens": 8192, "temperature": 0.2},
    "research_memo": {"model": "claude-sonnet-4-6", "max_tokens": 8192, "temperature": 0.2},
    "general": {"model": "claude-sonnet-4-6", "max_tokens": 8192, "temperature": 0.2},
}

_DELIVERABLE_ALIASES: dict[str, str] = {
    "aos-discretionary-brief": "aos_discretionary_brief",
    "aos_discretionary_brief": "aos_discretionary_brief",
    "cover-letter": "cover_letter",
    "research-memo": "research_memo",
    "hearing-packet": "brief_section",
    "custom-motion": "brief_section",
}


def _normalize_task_type(doc_type: str, deliverable_hint: str = "") -> str:
    for key in (deliverable_hint, doc_type):
        if not key:
            continue
        slug = re.sub(r"[^a-z0-9]+", "_", key.lower()).strip("_")
        if slug in TASK_MODEL_DEFAULTS:
            return slug
        if key.lower() in _DELIVERABLE_ALIASES:
            return _DELIVERABLE_ALIASES[key.lower()]
    return doc_type if doc_type in TASK_MODEL_DEFAULTS else "general"


def resolve_task_config(doc_type: str, deliverable_hint: str = "") -> dict[str, Any]:
    """Return model/max_tokens/temperature for a deliverable type."""

    task = _normalize_task_type(doc_type, deliverable_hint)
    defaults = dict(TASK_MODEL_DEFAULTS.get(task, TASK_MODEL_DEFAULTS["general"]))
    env_key = f"AOD_DRAFTING_MODEL_{task.upper()}"
    if model := os.getenv(env_key, "").strip():
        defaults["model"] = model
    if max_t := os.getenv(f"AOD_DRAFTING_MAX_TOKENS_{task.upper()}", "").strip():
        try:
            defaults["max_tokens"] = int(max_t)
        except ValueError:
            pass
    return defaults


def fetch_firm_memory_profile(*, max_patterns: int = 8) -> dict[str, Any] | None:
    """Load Firm Memory style preferences from Airtable Strategy Patterns."""

    patterns = at.list_firm_memory_patterns(max_records=max_patterns)
    if not patterns:
        return None

    tones: list[str] = []
    citations: list[str] = []
    headers: list[str] = []
    notes: list[str] = []

    for row in patterns:
        body = str(row.get("outcome") or row.get("fact_pattern_detail") or "").strip()
        trigger = str(row.get("strategy_used") or row.get("fact_pattern") or "").strip()
        if not body:
            continue
        for line in body.splitlines():
            lower = line.lower()
            if lower.startswith("tone:"):
                tones.append(line.split(":", 1)[-1].strip())
            elif lower.startswith("citations:"):
                citations.append(line.split(":", 1)[-1].strip())
            elif lower.startswith("headers:"):
                headers.append(line.split(":", 1)[-1].strip())
            else:
                notes.append(line.strip())
        if trigger and trigger not in {"firm_memory", "Firm Memory"}:
            notes.append(f"Applies to: {trigger}")

    if not any([tones, citations, headers, notes]):
        combined = "\n".join(
            str(row.get("outcome") or row.get("fact_pattern_detail") or "")[:800]
            for row in patterns[:max_patterns]
        ).strip()
        if not combined:
            return None
        return {"additional_notes": combined[:4000]}

    profile: dict[str, Any] = {}
    if tones:
        profile["writing_tone"] = "; ".join(dict.fromkeys(tones))
    if citations:
        profile["citation_style"] = "; ".join(dict.fromkeys(citations))
    if headers:
        profile["caption_format"] = "; ".join(dict.fromkeys(headers))
    if notes:
        profile["additional_notes"] = "\n".join(dict.fromkeys(n for n in notes if n))[:4000]
    return profile or None


def build_drafting_system_prompt(
    *,
    matter_ctx: dict[str, Any] | None,
    firm_profile: dict[str, Any] | None = None,
    base_prompt: str | None = None,
) -> str:
    """Port of legal-os buildDraftingPrompt — system prompt with matter + Firm Memory."""

    prompt = (base_prompt or os.getenv("AOD_DRAFTING_SYSTEM_PROMPT") or DEFAULT_DRAFTING_PROMPT).strip()

    ctx = matter_ctx or {}
    prompt += "\n\nMATTER CONTEXT:\n"
    prompt += f"- Matter ID: {ctx.get('matter_id', 'Not specified')}\n"
    prompt += f"- Type: {ctx.get('case_type') or ctx.get('matterType') or 'Not specified'}\n"
    prompt += f"- Jurisdiction: {ctx.get('country') or ctx.get('jurisdiction') or 'Not specified'}\n"
    prompt += f"- Caption / title: {ctx.get('title') or ctx.get('caption') or 'Not specified'}\n"
    prompt += f"- Posture: {ctx.get('posture') or 'Not specified'}\n"
    prompt += f"- Opposing party: {ctx.get('opposing_party') or ctx.get('opposingParty') or 'Not specified'}\n"

    if firm_profile:
        prompt += "\n\nFIRM STYLE REQUIREMENTS (MUST FOLLOW):\n"
        if tone := firm_profile.get("writing_tone"):
            prompt += f"- Writing Tone: {tone}\n"
        if cite := firm_profile.get("citation_style"):
            prompt += f"- Citation Style: {cite}\n"
        if cap := firm_profile.get("caption_format"):
            prompt += f"- Caption Format: {cap}\n"
        if fmt := firm_profile.get("formatting_preferences"):
            prompt += f"- Formatting: {json.dumps(fmt) if not isinstance(fmt, str) else fmt}\n"
        if args := firm_profile.get("preferred_arguments"):
            prompt += f"- Preferred Argument Patterns: {json.dumps(args) if not isinstance(args, str) else args}\n"
        if notes := firm_profile.get("additional_notes"):
            prompt += f"- Additional Style Notes: {notes}\n"
        prompt += (
            "\nYou MUST match the firm's established writing style. "
            "The output should read as if it were written by the firm's own associate attorney."
        )

    prompt += f"\n\n{ANTI_GENERIC_RULES}"
    return prompt


def build_drafting_context_block(matter_code: str, matter_ctx: dict[str, Any] | None = None) -> str:
    """Always inject structured facts + assessment OCR + case assessment for drafting."""

    ctx = matter_ctx if matter_ctx is not None else fetch_matter_context(matter_code)
    parts: list[str] = []

    if ctx:
        assessment_block = format_assessment_data(ctx.get("assessment_data"))
        if assessment_block:
            parts.append(assessment_block)

    drafting = fetch_drafting_facts(matter_code)
    drafting_block = format_drafting_facts(drafting)
    if drafting_block:
        parts.append(drafting_block)

    assessment_doc = fetch_latest_assessment_document(matter_code)
    assessment_doc_block = format_assessment_document(assessment_doc)
    if assessment_doc_block:
        parts.append(assessment_doc_block)

    firm = fetch_firm_memory_profile()
    if firm:
        style_lines = ["## Firm Memory (Strategy Patterns)"]
        for key, label in (
            ("writing_tone", "Tone"),
            ("citation_style", "Citations"),
            ("caption_format", "Headers"),
            ("additional_notes", "Style notes"),
        ):
            val = firm.get(key)
            if val:
                style_lines.append(f"- {label}: {val}")
        parts.append("\n".join(style_lines))

    return "\n\n".join(parts)
