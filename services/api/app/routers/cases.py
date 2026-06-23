"""Case-scoped document upload — Strong Reader pipeline."""

from __future__ import annotations

import uuid
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, File, Form, Header, UploadFile
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.db import get_db
from app.services.intake_processor import process_uploaded_document
from app.services.presidio_gate import require_strong_reader

router = APIRouter(prefix="/api/cases", tags=["cases"])


def _parse_manual_approval(
    header_value: str | None,
    form_value: str | bool | None,
) -> bool:
    if form_value is True or (isinstance(form_value, str) and form_value.lower() in {"true", "1", "yes", "on"}):
        return True
    if header_value and header_value.lower() in {"true", "1", "yes"}:
        return True
    return False


@router.post("/{external_id}/documents/upload")
async def upload_case_document(
    external_id: str,
    file: UploadFile = File(...),
    manual_review_approved: str | None = Form(default=None),
    x_manual_review_approved: str | None = Header(default=None, alias="X-Manual-Review-Approved"),
    settings: Settings = Depends(get_settings),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    approved = _parse_manual_approval(x_manual_review_approved, manual_review_approved)
    require_strong_reader(manual_review_approved=approved)

    upload_dir = Path(settings.upload_dir) / external_id.replace("/", "-")
    upload_dir.mkdir(parents=True, exist_ok=True)
    doc_id = str(uuid.uuid4())[:8]
    safe_name = (file.filename or "upload").replace("/", "-")
    dest = upload_dir / f"{doc_id}-{safe_name}"
    content = await file.read()
    dest.write_bytes(content)

    result = process_uploaded_document(
        db,
        external_id=external_id,
        filename=safe_name,
        stored_path=dest,
        mime_type=file.content_type,
    )
    result["tier_gate"] = {"manual_review_approved": approved}
    return result


@router.get("/{external_id}/documents")
def list_case_documents(
    external_id: str,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    from app.models.document import Document

    docs = (
        db.query(Document)
        .filter(Document.external_id == external_id)
        .order_by(Document.created_at.desc())
        .all()
    )
    return {
        "external_id": external_id,
        "count": len(docs),
        "documents": [
            {
                "document_id": d.id,
                "filename": d.filename,
                "category": d.category,
                "ocr_method": d.ocr_method,
                "processing_status": d.processing_status,
                "confidence": d.confidence,
                "facts_count": len(d.facts),
                "created_at": d.created_at.isoformat() if d.created_at else None,
            }
            for d in docs
        ],
    }
