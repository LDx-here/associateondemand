"""Notes and skill creation endpoints for attorney-edited agent output."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services import airtable as airtable_client

router = APIRouter(prefix="/agents", tags=["notes-skills"])


class NoteUpdateRequest(BaseModel):
    content: str
    author: str | None = None


class NoteUpdateResponse(BaseModel):
    status: str
    note_id: str


class SkillCreateRequest(BaseModel):
    name: str = Field(min_length=1)
    body: str = Field(min_length=1)
    description: str = ""
    trigger: str = ""
    original_output: str = ""
    matter_id: str = ""
    agent: str = "attorney-skill"


class SkillCreateResponse(BaseModel):
    status: str
    pattern_id: str | None = None
    correction_id: str | None = None


@router.patch("/notes/{note_id}", response_model=NoteUpdateResponse)
def update_note(note_id: str, body: NoteUpdateRequest) -> NoteUpdateResponse:
    """Persist attorney edits to an existing Notes row."""

    content = body.content.strip()
    if not content:
        raise HTTPException(status_code=422, detail="content required")
    rec = airtable_client.update_matter_note(
        note_id=note_id,
        content=content,
        author=body.author or "Attorney (edited)",
    )
    if not rec or not rec.get("id"):
        raise HTTPException(status_code=502, detail="Airtable note update failed or not configured.")
    return NoteUpdateResponse(status="updated", note_id=rec["id"])


@router.post("/skills", response_model=SkillCreateResponse)
def create_skill(body: SkillCreateRequest) -> SkillCreateResponse:
    """Save refined output as a Strategy Pattern (+ Corrections audit row)."""

    original = body.original_output.strip() or body.body
    detail = "\n\n".join(part for part in (body.description.strip(), body.trigger.strip()) if part)
    pattern = airtable_client.create_strategy_pattern(
        fact_pattern=body.name[:240],
        strategy_used=body.agent[:240],
        outcome=body.body[:4000],
        detail=detail[:4000] or body.body[:4000],
        correction_note=(body.trigger or body.description)[:2000],
        matter_code=body.matter_id or None,
    )
    correction = airtable_client.create_correction(
        agent=body.agent,
        original_output=original[:4000],
        attorney_edit=body.body[:4000],
        category="analytical_error",
        reason=body.trigger or body.description or f"Saved as skill: {body.name}",
        applied_to="Strategy Patterns",
        matter_code=body.matter_id or None,
    )
    if not pattern and not correction:
        raise HTTPException(status_code=502, detail="Skill persistence failed or Airtable not configured.")
    return SkillCreateResponse(
        status="created",
        pattern_id=pattern.get("id") if pattern else None,
        correction_id=correction.get("id") if correction else None,
    )
