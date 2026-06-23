"""Classify drafting instructions into document types."""

from __future__ import annotations

import re

_AOS_PATTERNS = re.compile(
    r"\b(aos|i-485|adjustment of status|discretionary factors?|pm-602-0199|"
    r"administrative grace|consular processing|totality of the circumstances)\b",
    re.I,
)
_COVER_PATTERNS = re.compile(r"\b(cover letter|filing cover|transmittal)\b", re.I)
_MOTION_PATTERNS = re.compile(r"\b(motion to|motion for|bond motion|continuance)\b", re.I)
_BRIEF_PATTERNS = re.compile(r"\b(brief|argument section|memorandum in support)\b", re.I)


def classify_draft_type(instruction: str) -> str:
    text = (instruction or "").strip()
    if not text:
        return "general"
    if _AOS_PATTERNS.search(text):
        return "aos_discretionary_brief"
    if _COVER_PATTERNS.search(text):
        return "cover_letter"
    if _MOTION_PATTERNS.search(text):
        return "motion"
    if _BRIEF_PATTERNS.search(text):
        return "brief_section"
    return "general"
