"""End-to-end document intake orchestration."""

from __future__ import annotations

import uuid
from pathlib import Path
from typing import Any

from sqlalchemy.orm import Session

from app.agents.categorizer_agent import categorizer_agent
from app.agents.fact_extraction_agent import fact_extraction_agent
from app.agents.obsidian_sync_agent import obsidian_sync_agent
from app.models.document import Document, ExtractedFact
from app.services.idi_pipeline import run_ocr_pipeline, text_quality_score


def process_uploaded_document(
    db: Session,
    *,
    external_id: str,
    filename: str,
    stored_path: Path,
    mime_type: str | None = None,
) -> dict[str, Any]:
    """Run OCR pipeline, agents, persist Document + ExtractedFact rows."""

    ocr = run_ocr_pipeline(stored_path)
    quality = text_quality_score(ocr.text)
    combined_confidence = round((ocr.confidence + quality) / 2, 3)

    cat = categorizer_agent.categorize(ocr.text, filename)
    fact_records = fact_extraction_agent.extract(ocr.text)
    facts_payload = [f.to_dict() for f in fact_records]

    doc_id = str(uuid.uuid4())
    document = Document(
        id=doc_id,
        external_id=external_id,
        filename=filename,
        stored_path=str(stored_path),
        mime_type=mime_type,
        ocr_method=ocr.method,
        processing_status=ocr.processing_status,
        confidence=combined_confidence,
        category=cat["category"],
        raw_text=ocr.text[:500_000] if ocr.text else None,
    )
    db.add(document)

    for fact in fact_records:
        db.add(
            ExtractedFact(
                document_id=doc_id,
                external_id=external_id,
                fact_type=fact.fact_type,
                value=fact.value,
                context=fact.context,
                confidence=fact.confidence,
                source_page=fact.source_page,
            )
        )

    db.commit()
    db.refresh(document)

    obsidian = obsidian_sync_agent.sync_document(
        external_id,
        filename,
        category=cat["category"],
        ocr_method=ocr.method,
        confidence=combined_confidence,
        processing_status=ocr.processing_status,
        facts=facts_payload,
        text_preview=ocr.text,
    )

    return {
        "document_id": doc_id,
        "external_id": external_id,
        "filename": filename,
        "stored_path": str(stored_path),
        "ocr_method": ocr.method,
        "processing_status": ocr.processing_status,
        "confidence": combined_confidence,
        "page_count": ocr.page_count,
        "category": cat["category"],
        "category_confidence": cat["confidence"],
        "facts_extracted": len(fact_records),
        "facts": facts_payload,
        "text_preview": ocr.text[:500],
        "obsidian_path": str(obsidian),
        "metadata": ocr.metadata,
    }
