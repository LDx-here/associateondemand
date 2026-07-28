"""Documents data_store dual-write flag logic (offline)."""

from __future__ import annotations

import app.services.data_store as ds
import app.services.google_sheets as gs


def test_dual_write_flag_defaults_off(monkeypatch) -> None:
    monkeypatch.delenv("AOD_DOCUMENTS_DUAL_WRITE", raising=False)
    assert gs.dual_write_enabled() is False


def test_dual_write_flag_on(monkeypatch) -> None:
    monkeypatch.setenv("AOD_DOCUMENTS_DUAL_WRITE", "1")
    assert gs.dual_write_enabled() is True


def test_data_store_kind_sheets(monkeypatch) -> None:
    monkeypatch.setenv("DATA_STORE", "google_sheets")
    assert ds.data_store_kind() == "google_sheets"


def test_data_store_kind_default_airtable(monkeypatch) -> None:
    monkeypatch.delenv("DATA_STORE", raising=False)
    assert ds.data_store_kind() == "airtable"


def test_create_document_dual_write_calls_sheets(monkeypatch) -> None:
    calls: dict[str, int] = {"at": 0, "gs": 0}

    def fake_at(**_kwargs):
        calls["at"] += 1
        return {"id": "recTEST123"}

    def fake_gs(**_kwargs):
        calls["gs"] += 1
        return {"id": "recTEST123"}

    monkeypatch.setenv("AOD_DOCUMENTS_DUAL_WRITE", "1")
    monkeypatch.setenv("DATA_STORE", "airtable")
    monkeypatch.setenv("AIRTABLE_PAT", "pat_test")
    monkeypatch.setattr(ds.at, "create_document", fake_at)
    monkeypatch.setattr(ds.gs, "sheets_configured", lambda: True)
    monkeypatch.setattr(ds.gs, "create_document", fake_gs)

    result = ds.create_document(matter_code="AOD-1001", title="scan.pdf", category="case_assessment")
    assert result == {"id": "recTEST123"}
    assert calls["at"] == 1
    assert calls["gs"] == 1


def test_create_document_sheets_only_without_airtable_pat(monkeypatch) -> None:
    calls: dict[str, int] = {"at": 0, "gs": 0}

    def fake_at(**_kwargs):
        calls["at"] += 1
        return {"id": "recX"}

    def fake_gs(**_kwargs):
        calls["gs"] += 1
        return {"id": "gs-doc-1"}

    monkeypatch.setenv("DATA_STORE", "google_sheets")
    monkeypatch.delenv("AIRTABLE_PAT", raising=False)
    monkeypatch.delenv("AOD_DOCUMENTS_DUAL_WRITE", raising=False)
    monkeypatch.setattr(ds.at, "create_document", fake_at)
    monkeypatch.setattr(ds.gs, "sheets_configured", lambda: True)
    monkeypatch.setattr(ds.gs, "create_document", fake_gs)

    result = ds.create_document(matter_code="AOD-1001", title="scan.pdf")
    assert result == {"id": "gs-doc-1"}
    assert calls["at"] == 0
    assert calls["gs"] == 1
