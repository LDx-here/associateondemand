"""Multi-agent endpoints — PM orchestrator, research, pattern, strategy, jobs."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.agents._context import load_constitution
from app.agents.pattern_agent import build_knowledge_graph, run_pattern, seed_from_dev_data
from app.agents.pm_orchestrator import dispatch, get_job_result, list_inbox, process_next_job
from app.agents.research_agent import run_research
from app.agents.strategy_agent import run_strategy
from app.db import get_db
from app.models.agent_result import AgentResult
from app.services.redis_queue import get_job, queue_depth

router = APIRouter(prefix="/agents", tags=["agents"])


class PmDispatchRequest(BaseModel):
    matter_id: str
    instruction: str
    priority: str = "normal"
    async_mode: bool = False


class ResearchRequest(BaseModel):
    matter_id: str
    query: str
    sources: list[str] = Field(default_factory=lambda: ["constitution", "obsidian", "airtable"])


@router.get("/constitution/preview")
def constitution_preview(max_chars: int = 2000) -> dict[str, str]:
    text = load_constitution(max_chars_per_file=max_chars)
    return {"preview": text[:max_chars], "truncated": len(text) > max_chars}


@router.post("/pm/dispatch", response_model=AgentResult)
def pm_dispatch(body: PmDispatchRequest, db: Session = Depends(get_db)) -> AgentResult:
    return dispatch(
        db,
        matter_id=body.matter_id,
        instruction=body.instruction,
        priority=body.priority,
        run_sync=not body.async_mode,
    )


@router.get("/pm/inbox")
def pm_inbox(db: Session = Depends(get_db)) -> dict[str, Any]:
    return {"items": list_inbox(db), "queue_depth": queue_depth()}


@router.post("/jobs/process", response_model=AgentResult | None)
def process_job(db: Session = Depends(get_db)) -> AgentResult | None:
    return process_next_job(db)


@router.get("/jobs/{job_id}")
def job_status(job_id: str, db: Session = Depends(get_db)) -> dict[str, Any]:
    redis_job = get_job(job_id)
    if not redis_job:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"redis": redis_job, "result": get_job_result(job_id)}


@router.post("/research/run", response_model=AgentResult)
def research_run(body: ResearchRequest) -> AgentResult:
    return run_research(body.matter_id, body.query, body.sources)


@router.post("/pattern/analyze", response_model=AgentResult)
def pattern_analyze(matter_id: str, facts: str = "") -> AgentResult:
    return run_pattern(matter_id, facts=facts or None)


@router.post("/pattern/seed")
def pattern_seed() -> dict[str, int]:
    return {"indexed": seed_from_dev_data()}


@router.post("/strategy/recommend", response_model=AgentResult)
def strategy_recommend(matter_id: str, posture: str = "", selected_strategy: str = "") -> AgentResult:
    return run_strategy(matter_id, posture=posture, selected_strategy=selected_strategy or None)


@router.get("/knowledge-map/graph")
def knowledge_map_graph() -> dict[str, Any]:
    return build_knowledge_graph()
