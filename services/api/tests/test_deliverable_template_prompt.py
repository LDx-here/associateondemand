"""Deliverable template excerpt injection for drafting prompts."""

from __future__ import annotations

from app.services.drafting_prompt import (
    _resolve_catalog_deliverable_id,
    fetch_deliverable_template_excerpt,
)


def test_resolve_catalog_deliverable_id() -> None:
    assert _resolve_catalog_deliverable_id("aos_discretionary_brief") == "aos-discretionary-brief"
    assert _resolve_catalog_deliverable_id("aos-discretionary-brief") == "aos-discretionary-brief"
    assert _resolve_catalog_deliverable_id("draft an aos discretionary brief") == "aos-discretionary-brief"
    assert _resolve_catalog_deliverable_id("") is None


def test_fetch_deliverable_template_excerpt_missing_is_none(monkeypatch) -> None:
    from app.services import drafting_prompt as mod

    monkeypatch.setattr(mod.at, "list_matter_notes", lambda *_a, **_k: [])
    assert fetch_deliverable_template_excerpt("aos-discretionary-brief") is None


def test_fetch_deliverable_template_excerpt_parses_note(monkeypatch) -> None:
    from app.services import drafting_prompt as mod
    import json

    payload = {
        "v": 1,
        "deliverableId": "aos-discretionary-brief",
        "role": "deliverable_template",
        "source": "firm_uploaded",
        "version": 2,
        "title": "aos-sample.docx",
        "filename": "aos-sample.docx",
        "textPreview": "IN THE MATTER OF\nRespondent respectfully submits…",
        "tweakNotes": "Prefer shorter introduction.",
    }

    monkeypatch.setattr(
        mod.at,
        "list_matter_notes",
        lambda *_a, **_k: [
            {
                mod.at.FIELDS_NOTES["type"]: "Deliverable Template Meta",
                mod.at.FIELDS_NOTES["content"]: json.dumps(payload),
            }
        ],
    )
    text = fetch_deliverable_template_excerpt("aos-discretionary-brief")
    assert text is not None
    assert "Firm deliverable template" in text
    assert "aos-sample.docx" in text
    assert "Prefer shorter introduction" in text
    assert "IN THE MATTER OF" in text
