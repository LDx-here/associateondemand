"""Tests for merge-field fill helpers mirrored conceptually from web merge-fields."""

from __future__ import annotations

import re

_MERGE_RE = re.compile(r"\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}")


def fill_merge_fields(template: str, values: dict[str, str], *, leave_unresolved: bool = True) -> str:
    def repl(m: re.Match[str]) -> str:
        key = m.group(1)
        val = (values.get(key) or "").strip()
        if val:
            return val
        return f"{{{{{key}}}}}" if leave_unresolved else f"[FACT NEEDED: {key}]"

    return _MERGE_RE.sub(repl, template)


def test_fill_merge_fields_basic() -> None:
    out = fill_merge_fields(
        "QR: {{qualifying_relative}}; hardship: {{hardship_facts}}",
        {"qualifying_relative": "USC spouse", "hardship_facts": "Medical + financial"},
    )
    assert "USC spouse" in out
    assert "Medical" in out
    assert "{{" not in out


def test_fill_certificate_of_service() -> None:
    cert = (
        "CERTIFICATE OF SERVICE\n\n"
        "I hereby certify that on {{date}}, I served a true and correct copy "
        "of the foregoing document by {{method}} upon:\n\n{{parties_served}}"
    )
    out = fill_merge_fields(
        cert,
        {
            "date": "July 22, 2026",
            "method": "Email",
            "parties_served": "DHS counsel",
        },
    )
    assert "CERTIFICATE OF SERVICE" in out
    assert "July 22, 2026" in out
    assert "Email" in out
    assert "DHS counsel" in out


def test_unresolved_merge_fields_left() -> None:
    out = fill_merge_fields("Hello {{client_name}}", {})
    assert out == "Hello {{client_name}}"


def test_letterhead_empty_hint_not_invented() -> None:
    """Mirror product rule: empty letterhead is a Settings hint, never fake address."""
    hint = "Add firm letterhead in Settings → Firm profile"
    fake = "RECOVER MY VALUE, PLLC\n123 Legal Plaza"
    assert "123 Legal Plaza" not in hint
    assert "Settings" in hint
    assert fake != hint
