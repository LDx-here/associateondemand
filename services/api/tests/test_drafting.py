"""Drafting toolkit tests."""

from __future__ import annotations

from app.drafting.classify import classify_draft_type
from app.drafting.citation_extractor import extract_citation_strings, resolve_sources_for_draft
from app.drafting.aos_framework import aos_drafting_context


def test_classify_aos_brief() -> None:
    assert classify_draft_type("draft aos discretionary brief for AOD-1001") == "aos_discretionary_brief"
    assert classify_draft_type("prepare cover letter for filing") == "cover_letter"


def test_extract_citations() -> None:
    text = "See Matter of Arai, 13 I&N Dec. 494 (BIA 1970) and INA §245(a)."
    cites = extract_citation_strings(text)
    assert any("Arai" in c for c in cites)
    assert any("245" in c for c in cites)


def test_resolve_sources_includes_arai() -> None:
    text = "Under Matter of Arai, 13 I&N Dec. 494, adjustment is discretionary."
    sources = resolve_sources_for_draft(text)
    assert any("Arai" in s.get("title", "") for s in sources)


def test_aos_framework_context_nonempty() -> None:
    ctx = aos_drafting_context()
    assert "PM-602-0199" in ctx
    assert "Matter of Patel" in ctx
