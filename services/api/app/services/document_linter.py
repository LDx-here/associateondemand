"""BUILD_SPEC §11 document output linter — em dash, emoji, endnote patterns."""

from __future__ import annotations

import re


def lint_document(text: str) -> list[str]:
    """Return human-readable issues; empty list means pass."""

    issues: list[str] = []
    if not text.strip():
        issues.append("Document is empty.")
        return issues
    if "—" in text or "–" in text:
        issues.append("Contains em dash or en dash (use hyphen or rephrase).")
    if re.search(r"[\U0001F300-\U0001FAFF]", text):
        issues.append("Contains emoji characters.")
    if re.search(r"\[\d+\]\s*$", text, re.M):
        issues.append("Possible endnote-style bracket references detected.")
    if re.search(r"\bENDNOTES\b", text, re.I):
        issues.append("Endnotes section detected (prefer footnotes on page).")
    return issues
