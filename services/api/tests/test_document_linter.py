"""Document linter tests (BUILD_SPEC §11)."""

from __future__ import annotations

from app.services.document_linter import lint_document


def test_lint_passes_clean_memo() -> None:
    assert lint_document("Short memo with hyphenated phrases.") == []


def test_lint_flags_em_dash() -> None:
    issues = lint_document("Bad — dash")
    assert any("dash" in i.lower() for i in issues)


def test_lint_flags_empty() -> None:
    assert lint_document("   ") == ["Document is empty."]
