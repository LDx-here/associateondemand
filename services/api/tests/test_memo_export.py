"""Research memo export endpoint tests."""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_memo_export_rejects_empty() -> None:
    resp = client.post("/agents/research/memo-export", json={"memo_text": "   "})
    assert resp.status_code == 400


def test_memo_export_linter_422_on_em_dash() -> None:
    resp = client.post(
        "/agents/research/memo-export",
        json={"matter_id": "AOD-1001", "memo_text": "Bad — dash", "format": "docx"},
    )
    assert resp.status_code == 422
    detail = resp.json()["detail"]
    assert detail["issues"]


def test_memo_export_txt_when_clean() -> None:
    resp = client.post(
        "/agents/research/memo-export",
        json={"matter_id": "AOD-1001", "memo_text": "Clean memo text.", "format": "txt"},
    )
    assert resp.status_code == 200
    assert resp.text == "Clean memo text."
