"""Multi-agent endpoints — PM orchestrator, research, pattern, strategy, jobs."""

from __future__ import annotations

from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.agents._context import load_constitution
from app.agents.pattern_agent import build_knowledge_graph, run_pattern, seed_all, seed_from_dev_data
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
def pattern_seed(source: str = "all") -> dict[str, int]:
    if source == "dev":
        return {"indexed": seed_from_dev_data(), "source": "dev"}
    result = seed_all()
    result["source"] = "all"
    return result


class MemoExportBody(BaseModel):
    matter_id: str = ""
    memo_text: str = ""
    format: Literal["docx", "txt"] = "docx"


def _memo_docx_blob(text: str) -> bytes:
    """Build a minimal .docx from plain memo lines (requires python-docx)."""

    from io import BytesIO

    try:
        from docx import Document  # type: ignore[import-not-found]
    except ImportError:
        raise RuntimeError("python-docx unavailable") from None

    doc = Document()
    for line in text.replace("\r\n", "\n").split("\n"):
        doc.add_paragraph(line)
    buf = BytesIO()
    doc.save(buf)
    return buf.getvalue()


@router.post("/research/memo-export")
def research_memo_export(body: MemoExportBody) -> Response:
    """Optional Word export for BUILD_SPEC §11 (falls back caller may use TXT)."""

    fname = (body.matter_id or "memo").replace("/", "_").replace(" ", "") + "_research_memo"

    memo = body.memo_text.strip()
    if not memo:
        raise HTTPException(status_code=400, detail="memo_text is required")

    if body.format == "txt":
        return Response(
            content=memo.encode("utf-8"),
            media_type="text/plain; charset=utf-8",
            headers={"Content-Disposition": f'attachment; filename="{fname}.txt"'},
        )

    try:
        blob = _memo_docx_blob(memo)
    except RuntimeError:
        return Response(
            content=memo.encode("utf-8"),
            media_type="text/plain; charset=utf-8",
            headers={"Content-Disposition": f'attachment; filename="{fname}.txt"'},
        )

    try:
        return Response(
            content=blob,
            media_type=(
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            ),
            headers={"Content-Disposition": f'attachment; filename="{fname}.docx"'},
        )
    except Exception:
        return Response(
            content=memo.encode("utf-8"),
            media_type="text/plain; charset=utf-8",
            headers={"Content-Disposition": f'attachment; filename="{fname}.txt"'},
        )


@router.post("/strategy/recommend", response_model=AgentResult)
def strategy_recommend(matter_id: str, posture: str = "", selected_strategy: str = "") -> AgentResult:
    return run_strategy(matter_id, posture=posture, selected_strategy=selected_strategy or None)


@router.post("/strong-reader/run", response_model=AgentResult)
def strong_reader_run(
    matter_id: str,
    document_id: str,
    text: str,
    filename: str = "",
) -> AgentResult:
    from app.agents.strong_reader_agent import run_strong_reader

    return run_strong_reader(
        matter_id=matter_id,
        document_id=document_id,
        text=text,
        filename=filename,
    )


@router.get("/knowledge-map/graph")
def knowledge_map_graph() -> dict[str, Any]:
    return build_knowledge_graph()
