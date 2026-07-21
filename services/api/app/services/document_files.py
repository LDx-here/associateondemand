"""Serve uploaded document binaries from disk (Strong Reader intake)."""

from __future__ import annotations

import mimetypes
from pathlib import Path

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.config import Settings
from app.models.document import Document


def resolve_document_path(settings: Settings, stored_path: str) -> Path:
    """Return an absolute path under upload_dir, or raise 404/403."""

    path = Path(stored_path).resolve()
    root = Path(settings.upload_dir).resolve()
    try:
        path.relative_to(root)
    except ValueError as exc:
        raise HTTPException(status_code=403, detail="Invalid file path") from exc
    if not path.is_file():
        raise HTTPException(status_code=404, detail="File not found on server")
    return path


def get_document_for_matter(db: Session, *, document_id: str, matter_id: str) -> Document:
    doc = db.get(Document, document_id)
    if not doc or doc.external_id != matter_id:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


def find_document_by_title(db: Session, *, matter_id: str, title: str) -> Document | None:
    return (
        db.query(Document)
        .filter(Document.external_id == matter_id, Document.filename == title)
        .order_by(Document.created_at.desc())
        .first()
    )


def guess_media_type(doc: Document) -> str:
    if doc.mime_type:
        return doc.mime_type
    guessed, _ = mimetypes.guess_type(doc.filename)
    return guessed or "application/octet-stream"
