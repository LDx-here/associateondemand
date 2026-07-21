"""Tests for document file serving helpers."""

from __future__ import annotations

from pathlib import Path

import pytest
from fastapi import HTTPException

from app.config import Settings
from app.services.document_files import resolve_document_path


def test_resolve_document_path_rejects_outside_upload_root(tmp_path: Path) -> None:
    upload_root = tmp_path / "uploads"
    upload_root.mkdir()
    outside = tmp_path / "secret.pdf"
    outside.write_bytes(b"%PDF-1.4")

    settings = Settings(upload_dir=str(upload_root))
    with pytest.raises(HTTPException) as exc:
        resolve_document_path(settings, str(outside))
    assert exc.value.status_code == 403


def test_resolve_document_path_missing_file(tmp_path: Path) -> None:
    upload_root = tmp_path / "uploads"
    upload_root.mkdir()
    missing = upload_root / "AOD-1001" / "missing.pdf"

    settings = Settings(upload_dir=str(upload_root))
    with pytest.raises(HTTPException) as exc:
        resolve_document_path(settings, str(missing))
    assert exc.value.status_code == 404


def test_resolve_document_path_returns_file(tmp_path: Path) -> None:
    upload_root = tmp_path / "uploads"
    matter_dir = upload_root / "AOD-1001"
    matter_dir.mkdir(parents=True)
    pdf = matter_dir / "abc-test.pdf"
    pdf.write_bytes(b"%PDF-1.4 test")

    settings = Settings(upload_dir=str(upload_root))
    resolved = resolve_document_path(settings, str(pdf))
    assert resolved == pdf.resolve()
