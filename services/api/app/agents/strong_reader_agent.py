"""Strong Reader orchestrator — OCR → categorize → extract → Obsidian (BUILD_SPEC §4)."""

from __future__ import annotations

from typing import Any

from app.agents.categorizer_agent import categorizer_agent
from app.agents.fact_extraction_agent import fact_extraction_agent
from app.agents.obsidian_sync_agent import obsidian_sync_agent
from app.models.agent_result import AgentResult, Uncertainty


def run_strong_reader(
    *,
    matter_id: str,
    document_id: str,
    text: str,
    filename: str = "",
) -> AgentResult:
    """Run the Strong Reader pipeline on extracted OCR text."""

    category = categorizer_agent.categorize(text, filename=filename or document_id)
    facts = fact_extraction_agent.extract(text)
    fact_dicts = [f.to_dict() for f in facts]
    obsidian_path = obsidian_sync_agent.sync_document(
        matter_id=matter_id,
        filename=filename or document_id,
        category=str(category.get("category") or "uncategorized"),
        ocr_method="tesseract",
        confidence=float(category.get("confidence") or 0.6),
        processing_status="processed",
        facts=fact_dicts,
        text_preview=text[:2000],
    )

    return AgentResult(
        agent="strong_reader",
        matter_id=matter_id,
        anchor_facts=[
            f"Processed document {document_id}",
            f"Category: {category.get('category')}",
            f"Facts extracted: {len(facts)}",
        ],
        anchor_law=["Facts extracted for attorney review — not legal conclusions."],
        anchor_strategy=[f"Obsidian note: {obsidian_path}"],
        anchor_risk=["Tier 0: manual review required before external LLM on PII-bearing docs."],
        anchor_next=["Review extracted facts", "Run legal mapping when facts are confirmed"],
        uncertain=[
            Uncertainty(
                item="Document categorization",
                confidence=float(category.get("confidence") or 0.6),
                reason="Heuristic categorizer; attorney may reclassify.",
            )
        ],
        summary=f"Strong Reader: {category.get('category')} — {len(facts)} facts extracted.",
        citations=[str(obsidian_path)],
        confidence=float(category.get("confidence") or 0.65),
        metadata={
            "document_id": document_id,
            "category": category,
            "facts": fact_dicts,
            "obsidian_path": str(obsidian_path),
        },
        complete=True,
    )


def strong_reader_from_payload(payload: dict[str, Any]) -> AgentResult:
    return run_strong_reader(
        matter_id=str(payload.get("matter_id") or ""),
        document_id=str(payload.get("document_id") or "unknown"),
        text=str(payload.get("text") or ""),
        filename=str(payload.get("filename") or ""),
    )
