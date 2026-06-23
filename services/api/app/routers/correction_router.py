"""Correction Pipeline — firm-rules, strategy patterns, categorizer examples."""

from __future__ import annotations

import os
from datetime import datetime, timezone
from pathlib import Path
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


def _activity_log_path() -> Path | None:
    if env := os.getenv("AOD_ACTIVITY_LOG_PATH"):
        return Path(env)
    here = Path(__file__).resolve()
    for parent in here.parents:
        if (parent / "CHECKPOINT.md").is_file():
            return parent / "activity_log.md"
    brain = Path(os.getenv("AOD_BRAIN_ROOT", "/app/brain"))
    return brain / "05_Admin" / "activity_log.md"


def _append_activity_log(line: str) -> None:
    """BUILD_SPEC §10 — log every correction to activity_log.md."""

    path = _activity_log_path()
    if not path:
        return
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        stamp = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        entry = f"### [{stamp}] CORRECTION: {line}\n"
        if path.exists():
            path.write_text(entry + "\n" + path.read_text(encoding="utf-8"), encoding="utf-8")
        else:
            path.write_text(entry, encoding="utf-8")
    except OSError:
        pass

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

    if cat == "factual_error" and body.matter_id:
        note = airtable_client.create_matter_note(
            matter_code=body.matter_id,
            content=f"Correction: {body.attorney_correction[:3500]}",
            note_type="Correction",
        )
        if note and note.get("id"):
            persisted.append(f"airtable:Notes/{note['id']}")

    if cat in ("analytical_error", "false_positive", "false_negative"):
        pattern = airtable_client.create_strategy_pattern(
            fact_pattern=body.original_output[:240] or body.matter_id,
            strategy_used=body.agent,
            outcome=body.attorney_correction[:4000],
            detail=body.reason[:2000],
            correction_note=body.attorney_correction[:2000],
            matter_code=body.matter_id,
        )
        if pattern and pattern.get("id"):
            persisted.append(f"airtable:Strategy Patterns/{pattern['id']}")

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

    _append_activity_log(
        f"{body.matter_id} · {body.agent} · {cat}: {body.attorney_correction[:120]}"
    )

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
