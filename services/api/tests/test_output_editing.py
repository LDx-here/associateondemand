"""API routes for attorney-edited output and skill creation."""

from __future__ import annotations

from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_update_note_requires_content() -> None:
    resp = client.patch("/agents/notes/rec123", json={"content": "   "})
    assert resp.status_code == 422


def test_update_note_success() -> None:
    with patch(
        "app.routers.notes_router.airtable_client.update_matter_note",
        return_value={"id": "recNOTE123", "fields": {"content": "Edited memo"}},
    ):
        resp = client.patch(
            "/agents/notes/recNOTE123",
            json={"content": "Edited memo body", "author": "Attorney"},
        )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "updated"
    assert data["note_id"] == "recNOTE123"


def test_create_skill_requires_name_and_body() -> None:
    resp = client.post("/agents/skills", json={"name": "", "body": "x"})
    assert resp.status_code == 422


def test_create_skill_success() -> None:
    with patch(
        "app.routers.notes_router.airtable_client.create_strategy_pattern",
        return_value={"id": "recPAT1"},
    ), patch(
        "app.routers.notes_router.airtable_client.create_correction",
        return_value={"id": "recCOR1"},
    ):
        resp = client.post(
            "/agents/skills",
            json={
                "name": "AOS tone fix",
                "body": "Use formal brief voice, no chatbot filler.",
                "trigger": "Drafting AOS discretionary briefs",
                "matter_id": "AOD-1001",
                "agent": "drafting",
            },
        )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "created"
    assert data["pattern_id"] == "recPAT1"
    assert data["correction_id"] == "recCOR1"
