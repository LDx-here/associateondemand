"""Correction Pipeline — firm-rules, strategy patterns, categorizer examples."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.agents.firm_context import (
    append_categorizer_example,
    append_firm_rule,
    append_strategy_pattern,
    load_categorizer_examples,
    load_firm_rules,
    load_strategy_patterns,
)
from app.db import get_db
from app.models.db_models import AuditLog
from app.services import airtable as airtable_client

router = APIRouter(prefix="/agents/corrections", tags=["corrections"])

CorrectionCategory = Literal[
    "factual_error",
    "classification_error",
    "formatting_convention",
    "analytical_error",
    "false_positive",
    "false_negative",
]


class CorrectionRequest(BaseModel):
    matter_id: str
    agent: str
    original_output: str
    attorney_correction: str
    category: CorrectionCategory = "analytical_error"
    accepted: bool = False
    reason: str = ""


class CorrectionResponse(BaseModel):
    status: str
    message: str
    category: CorrectionCategory
    persisted_to: list[str] = Field(default_factory=list)


@router.post("", response_model=CorrectionResponse)
def submit_correction(body: CorrectionRequest, db: Session = Depends(get_db)) -> CorrectionResponse:
    """Route attorney corrections to durable training stores."""

    persisted: list[str] = []
    cat = body.category

    if cat == "formatting_convention":
        rule = body.attorney_correction.strip()
        if rule:
            append_firm_rule(rule)
            persisted.append("brain/03_Firm_Knowledge/firm-rules.md")

    elif cat in ("analytical_error", "false_positive", "false_negative"):
        append_strategy_pattern(
            {
                "pattern_id": f"{body.matter_id}-{body.agent}",
                "matter_id": body.matter_id,
                "category": cat,
                "fact_pattern": body.original_output[:500],
                "strategy_used": body.agent,
                "outcome": body.attorney_correction,
                "reason": body.reason,
            }
        )
        persisted.append("brain/03_Firm_Knowledge/strategy-patterns.md")

    elif cat == "classification_error":
        append_categorizer_example(
            {
                "matter_id": body.matter_id,
                "agent": body.agent,
                "original": body.original_output[:500],
                "correct_label": body.attorney_correction,
                "reason": body.reason,
                "accepted": body.accepted,
            }
        )
        persisted.append("brain/03_Firm_Knowledge/categorizer-examples.jsonl")

    else:
        append_strategy_pattern(
            {
                "pattern_id": f"{body.matter_id}-factual",
                "matter_id": body.matter_id,
                "category": cat,
                "fact_pattern": body.original_output[:500],
                "outcome": body.attorney_correction,
            }
        )
        persisted.append("brain/03_Firm_Knowledge/strategy-patterns.md")

    status = "accepted_to_training" if body.accepted else "logged_for_review"

    # BUILD_SPEC §10 — every correction is also persisted as a durable
    # Airtable Corrections row so the training loop survives without
    # depending on the brain markdown files alone.
    applied_to_label = _APPLIED_TO_LABEL.get(cat, "Notes only")
    airtable_record = airtable_client.create_correction(
        agent=body.agent,
        original_output=body.original_output,
        attorney_edit=body.attorney_correction,
        category=cat,
        reason=body.reason,
        applied_to=applied_to_label,
        matter_code=body.matter_id,
    )
    if airtable_record and airtable_record.get("id"):
        persisted.append(f"airtable:Corrections/{airtable_record['id']}")

    db.add(
        AuditLog(
            matter_id=body.matter_id,
            actor="attorney",
            agent=body.agent,
            action="correction",
            summary=f"{cat}: {body.attorney_correction[:120]}",
            metadata_json={
                "category": cat,
                "accepted": body.accepted,
                "persisted_to": persisted,
            },
        )
    )
    db.commit()

    return CorrectionResponse(
        status=status,
        message="Correction stored in training loop.",
        category=cat,
        persisted_to=persisted,
    )


_APPLIED_TO_LABEL: dict[str, str] = {
    "formatting_convention": "firm-rules.md",
    "analytical_error": "Strategy Patterns",
    "false_positive": "Strategy Patterns",
    "false_negative": "Strategy Patterns",
    "classification_error": "categorizer-examples.jsonl",
    "factual_error": "Notes only",
}


@router.get("/firm-rules")
def get_firm_rules() -> dict[str, str]:
    return {"content": load_firm_rules()}


@router.get("/strategy-patterns")
def get_strategy_patterns() -> dict[str, str]:
    return {"content": load_strategy_patterns()}


@router.get("/categorizer-examples")
def get_categorizer_examples(limit: int = 20) -> dict[str, list]:
    return {"examples": load_categorizer_examples(limit=limit)}
