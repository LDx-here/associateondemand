"""End-to-end document intake orchestration."""

from __future__ import annotations

import json
import uuid
from pathlib import Path
from typing import Any

from sqlalchemy.orm import Session

from app.agents.categorizer_agent import categorizer_agent
from app.agents.fact_extraction_agent import fact_extraction_agent
from app.agents.obsidian_sync_agent import obsidian_sync_agent
from app.models.document import Document, ExtractedFact
from app.pipelines.ocr_pipeline import run_ocr_pipeline, text_quality_score
from app.pipelines.pii_pipeline import anonymize_text
from app.services import airtable as at
from app.services.fact_enrichment import (
    enrich_facts_with_llm,
    heuristic_facts_need_enrichment,
    merge_enrichment_into_payload,
)
from app.services.presidio_gate import current_tier


def _assessment_ocr_note_payload(
    filename: str,
    ocr_text: str,
    facts: list[dict[str, Any]],
    *,
    enrichment_meta: dict[str, Any] | None = None,
) -> str:
    import json

    payload: dict[str, Any] = {
        "v": 1,
        "documentId": filename,
        "title": filename,
        "ocrText": ocr_text[:3000],
        "facts": facts[:24],
        "uploadedAt": None,
    }
    if enrichment_meta:
        for key in ("enrichmentStatus", "enrichmentWarning", "enrichmentSummary"):
            val = enrichment_meta.get(key)
            if val:
                payload[key] = val
    return json.dumps(payload)


def enrich_document_facts(
    *,
    ocr_text: str,
    heuristic_facts: list[dict[str, Any]],
    extraction_context: dict[str, Any] | None = None,
    force: bool = False,
) -> dict[str, Any]:
    """Run LLM enrichment when configured and heuristic facts need mapping."""

    ctx = extraction_context or {}
    should_enrich = force or (
        ctx.get("document_category") == "case_assessment"
        and heuristic_facts_need_enrichment(heuristic_facts)
    )
    if not should_enrich and not force:
        return {
            "facts": heuristic_facts,
            "enrichmentStatus": "heuristic_only",
            "enriched": False,
        }

    enrichment = enrich_facts_with_llm(
        ocr_text=ocr_text,
        heuristic_facts=heuristic_facts,
        context=ctx,
    )
    facts = merge_enrichment_into_payload(heuristic_facts, enrichment)
    return {
        "facts": facts,
        "enrichmentStatus": enrichment.get("enrichment_status", "heuristic_only"),
        "enrichmentWarning": enrichment.get("enrichment_warning"),
        "enrichmentSummary": enrichment.get("enrichment_summary"),
        "enriched": bool(enrichment.get("enriched")),
    }


def _parse_extraction_context(raw: str | None) -> dict[str, Any] | None:
    if not raw or not str(raw).strip():
        return None
    try:
        data = json.loads(str(raw))
    except json.JSONDecodeError:
        return None
    return data if isinstance(data, dict) else None


def process_uploaded_document(
    db: Session,
    *,
    external_id: str,
    filename: str,
    stored_path: Path,
    mime_type: str | None = None,
    document_category: str | None = None,
    extraction_context: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Run OCR pipeline, agents, persist Document + ExtractedFact rows."""

    ocr = run_ocr_pipeline(stored_path)
    ocr_text, _anon = anonymize_text(ocr.text, tier=current_tier())
    quality = text_quality_score(ocr_text)
    combined_confidence = round((ocr.confidence + quality) / 2, 3)
    ocr_failure_reason = ""
    if ocr.processing_status == "failed":
        ocr_failure_reason = str(
            (ocr.metadata or {}).get("reason")
            or f"Could not extract text from {filename}. Try PDF or DOCX."
        )

    cat = categorizer_agent.categorize(ocr_text, filename)
    ctx = extraction_context or {}
    if document_category == "case_assessment" and not ctx.get("document_category"):
        ctx = {**ctx, "document_category": "case_assessment"}
    fact_records = fact_extraction_agent.extract(ocr_text, context=ctx or None)
    facts_payload = [f.to_dict() for f in fact_records]

    enrichment_result = enrich_document_facts(
        ocr_text=ocr_text,
        heuristic_facts=facts_payload,
        extraction_context=ctx or None,
    )
    facts_payload = enrichment_result["facts"]

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
        raw_text=ocr_text[:500_000] if ocr_text else None,
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
        text_preview=ocr_text,
    )

    airtable_doc = at.create_document(
        matter_code=external_id,
        title=filename,
        category=str(document_category or cat.get("category") or "uncategorized"),
        ocr_status=ocr.processing_status,
        pii_tier=str(current_tier()),
        file_type=(mime_type or Path(filename).suffix or "")[:80],
        file_path=str(stored_path),
    )

    if document_category == "case_assessment" and ocr_text:
        at.create_matter_note(
            matter_code=external_id,
            content=_assessment_ocr_note_payload(
                filename,
                ocr_text,
                facts_payload,
                enrichment_meta=enrichment_result,
            ),
            author="Strong Reader",
            note_type="Assessment Document",
        )

    result: dict[str, Any] = {
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
        "enrichment_status": enrichment_result.get("enrichmentStatus"),
        "enrichment_warning": enrichment_result.get("enrichmentWarning"),
        "enrichment_summary": enrichment_result.get("enrichmentSummary"),
        "text_preview": ocr_text[:500],
        "obsidian_path": str(obsidian),
        "airtable_document_id": (airtable_doc or {}).get("id"),
        "metadata": ocr.metadata,
        "extraction_context_applied": bool(ctx),
    }
    if ocr_failure_reason:
        result["error"] = ocr_failure_reason
        result["ocr_error"] = ocr_failure_reason
    return result
