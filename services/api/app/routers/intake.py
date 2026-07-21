"""Document intake — Strong Reader OCR pipeline."""

from __future__ import annotations

import uuid
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.db import get_db
from app.services.document_files import (
    find_document_by_title,
    get_document_for_matter,
    guess_media_type,
    resolve_document_path,
)
from app.services.intake_processor import process_uploaded_document
from app.services.presidio_gate import current_tier, presidio_reachable, require_strong_reader

router = APIRouter(prefix="/intake", tags=["intake"])


def _parse_manual_approval(
    header_value: str | None,
    form_value: str | bool | None,
) -> bool:
    if form_value is True or (isinstance(form_value, str) and form_value.lower() in {"true", "1", "yes", "on"}):
        return True
    if header_value and header_value.lower() in {"true", "1", "yes"}:
        return True
    return False


@router.get("/status")
def intake_status() -> dict[str, Any]:
    tier = current_tier()
    return {
        "pii_tier": tier,
        "strong_reader": tier >= 1 or True,
        "presidio_reachable": presidio_reachable(),
        "tier_0_requires_manual_approval": tier < 1,
        "pipeline": ["upload", "ocr", "categorize", "extract_facts", "obsidian_sync"],
        "ocr_providers": ["tesseract", "textract"],
    }


async def _process_single(
    *,
    matter_id: str,
    file: UploadFile,
    settings: Settings,
    db: Session,
    manual_review_approved: bool,
    document_category: str | None = None,
    extraction_context: str | None = None,
) -> dict[str, Any]:
    require_strong_reader(manual_review_approved=manual_review_approved)

    upload_dir = Path(settings.upload_dir) / matter_id.replace("/", "-")
    upload_dir.mkdir(parents=True, exist_ok=True)
    doc_id = str(uuid.uuid4())[:8]
    safe_name = (file.filename or "upload").replace("/", "-")
    dest = upload_dir / f"{doc_id}-{safe_name}"
    content = await file.read()
    dest.write_bytes(content)

    from app.services.intake_processor import _parse_extraction_context

    result = process_uploaded_document(
        db,
        external_id=matter_id,
        filename=safe_name,
        stored_path=dest,
        mime_type=file.content_type,
        document_category=document_category,
        extraction_context=_parse_extraction_context(extraction_context),
    )
    result["tier_gate"] = {"manual_review_approved": manual_review_approved}
    return result


@router.get("/documents/resolve")
def resolve_document_file(
    matter_id: str = Query(..., min_length=1),
    title: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> dict[str, Any]:
    """Map Airtable document title → Postgres document id + file availability."""

    doc = find_document_by_title(db, matter_id=matter_id, title=title)
    if not doc:
        return {"found": False, "file_available": False}
    file_available = False
    try:
        resolve_document_path(settings, doc.stored_path)
        file_available = True
    except HTTPException:
        file_available = False
    return {
        "found": True,
        "document_id": doc.id,
        "filename": doc.filename,
        "mime_type": guess_media_type(doc),
        "file_available": file_available,
    }


@router.get("/documents/{document_id}/file")
def download_document_file(
    document_id: str,
    matter_id: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> FileResponse:
    """Stream an uploaded document binary (PDF/image) from disk."""

    doc = get_document_for_matter(db, document_id=document_id, matter_id=matter_id)
    path = resolve_document_path(settings, doc.stored_path)
    return FileResponse(
        path,
        media_type=guess_media_type(doc),
        filename=doc.filename,
        content_disposition_type="inline",
    )


@router.post("/upload")
async def upload_document(
    matter_id: str = Form(...),
    file: UploadFile = File(...),
    manual_review_approved: str | None = Form(default=None),
    document_category: str | None = Form(default=None),
    extraction_context: str | None = Form(default=None),
    x_manual_review_approved: str | None = Header(default=None, alias="X-Manual-Review-Approved"),
    settings: Settings = Depends(get_settings),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    approved = _parse_manual_approval(x_manual_review_approved, manual_review_approved)
    return await _process_single(
        matter_id=matter_id,
        file=file,
        settings=settings,
        db=db,
        manual_review_approved=approved,
        document_category=document_category,
        extraction_context=extraction_context,
    )


@router.post("/batch")
async def batch_upload(
    matter_id: str = Form(...),
    files: list[UploadFile] = File(...),
    manual_review_approved: str | None = Form(default=None),
    document_category: str | None = Form(default=None),
    extraction_context: str | None = Form(default=None),
    x_manual_review_approved: str | None = Header(default=None, alias="X-Manual-Review-Approved"),
    settings: Settings = Depends(get_settings),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    approved = _parse_manual_approval(x_manual_review_approved, manual_review_approved)
    results: list[dict[str, Any]] = []
    errors: list[dict[str, str]] = []

    for idx, f in enumerate(files):
        try:
            results.append(
                await _process_single(
                    matter_id=matter_id,
                    file=f,
                    settings=settings,
                    db=db,
                    manual_review_approved=approved,
                    document_category=document_category,
                    extraction_context=extraction_context,
                )
            )
        except Exception as exc:
            errors.append({"index": str(idx), "filename": f.filename or "unknown", "error": str(exc)})

    return {
        "matter_id": matter_id,
        "count": len(results),
        "failed": len(errors),
        "documents": results,
        "errors": errors,
    }
