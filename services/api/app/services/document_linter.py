"""BUILD_SPEC §11 document output linter — style, chatbot, endnote patterns."""

from __future__ import annotations

import re

# Chatbot / AI-meta phrases that should never appear in attorney-facing drafts.
_CHATBOT_PATTERNS: tuple[tuple[re.Pattern[str], str], ...] = (
    (re.compile(r"\bCertainly[,!]?\b"), "Contains chatbot filler ('Certainly')."),
    (re.compile(r"\bI'd be happy to\b", re.I), "Contains chatbot filler ('I'd be happy to')."),
    (re.compile(r"\bAs an AI\b", re.I), "Contains AI meta-commentary ('As an AI')."),
    (re.compile(r"\bAs a language model\b", re.I), "Contains AI meta-commentary."),
    (
        re.compile(r"\bIt is important to note that\b", re.I),
        "Contains generic AI filler ('It is important to note that').",
    ),
    (
        re.compile(r"\bIn conclusion,\s+it is (?:clear|important)\b", re.I),
        "Contains generic AI closing filler.",
    ),
)


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
    for pattern, message in _CHATBOT_PATTERNS:
        if pattern.search(text):
            issues.append(message)
    # Soft signal: many unresolved placeholders — still allow export, but flag.
    fact_needed = len(re.findall(r"\[FACT NEEDED\]", text, re.I))
    cite_needed = len(re.findall(r"\[CITE NEEDED\]", text, re.I))
    if fact_needed + cite_needed >= 5:
        issues.append(
            f"Many unresolved placeholders ({fact_needed} FACT NEEDED, {cite_needed} CITE NEEDED) — "
            "fill or remove before client delivery."
        )
    return issues
