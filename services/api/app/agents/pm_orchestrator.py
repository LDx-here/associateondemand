"""PM Orchestrator — routes instructions, enqueues jobs, enforces Five-Anchors."""

from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.agents.firm_context import load_firm_rules
from app.agents.drafting_agent import run_drafting
from app.agents.legal_mapping_agent import run_legal_mapping
from app.agents.mass_auditor_agent import run_mass_audit
from app.agents.pattern_agent import run_pattern
from app.agents.research_agent import run_research
from app.agents.strategy_agent import run_strategy
from app.models.agent_result import AgentResult, Uncertainty
from app.models.db_models import AgentJob, AuditLog
from app.services.pm_queue import enqueue_inbox_review
from app.services.redis_queue import enqueue_job, get_job

_ROUTE_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("research", re.compile(r"\b(research|memo|country conditions|precedent|cite|standard|pm:research)\b", re.I)),
    ("pattern", re.compile(r"\b(pattern|similar|prior matter|like case|compare)\b", re.I)),
    ("strategy", re.compile(r"\b(strategy|approach|posture|relief|plan|motion)\b", re.I)),
    ("drafting", re.compile(r"\b(draft|petition|brief|cover letter)\b", re.I)),
    ("mass_audit", re.compile(r"\b(mass audit|auditor|batch audit)\b", re.I)),
    ("legal_mapping", re.compile(r"\b(legal mapping|map elements|element map)\b", re.I)),
]


def classify_instruction(instruction: str) -> str:
    for agent, pattern in _ROUTE_PATTERNS:
        if pattern.search(instruction):
            return agent
    return "research"


def _log_audit(db: Session, *, matter_id: str | None, agent: str, action: str, summary: str, meta: dict | None = None) -> None:
    db.add(
        AuditLog(
            matter_id=matter_id,
            actor="pm_orchestrator",
            agent=agent,
            action=action,
            summary=summary,
            metadata_json=meta or {},
        )
    )
    db.commit()


def _persist_job(db: Session, job_id: str, agent: str, matter_id: str, priority: str, payload: dict) -> None:
    db.add(
        AgentJob(
            id=job_id,
            matter_id=matter_id,
            agent=agent,
            status="queued",
            priority=priority,
            payload=payload,
        )
    )
    db.commit()


def dispatch(
    db: Session,
    *,
    matter_id: str,
    instruction: str,
    priority: str = "normal",
    run_sync: bool = True,
) -> AgentResult:
    """Route instruction to specialist agent; optionally execute synchronously."""

    firm_rules = load_firm_rules(max_chars=1500)
    target = classify_instruction(instruction)
    payload: dict[str, Any] = {"matter_id": matter_id, "instruction": instruction, "query": instruction}

    job_id = enqueue_job(target, matter_id, payload, priority=priority)
    _persist_job(db, job_id, target, matter_id, priority, payload)
    _log_audit(
        db,
        matter_id=matter_id,
        agent=target,
        action="job_enqueued",
        summary=f"PM routed to {target}: {instruction[:120]}",
        meta={"job_id": job_id, "priority": priority},
    )

    if not run_sync:
        return AgentResult(
            agent="pm_orchestrator",
            matter_id=matter_id,
            anchor_facts=[f"Instruction queued for {target} agent."],
            anchor_law=["Firm rules loaded at job start." if firm_rules else "No firm-rules.md yet — add via corrections."],
            anchor_strategy=[f"Route: {target} based on instruction keywords."],
            anchor_risk=["Async job — poll /agents/jobs/{id} for result."],
            anchor_next=[f"Poll job {job_id}", "Review inbox when complete"],
            uncertain=[
                Uncertainty(
                    item=f"Async job {job_id} outcome",
                    confidence=0.5,
                    reason="Job is queued; final result not yet known.",
                )
            ],
            summary=f"Job {job_id} enqueued ({target}, {priority}).",
            citations=[f"job_id={job_id}"],
            confidence=0.6,
            metadata={"routed_to": target, "job_id": job_id},
            job_id=job_id,
        )

    result = execute_agent(target, payload)
    result.job_id = job_id
    result.metadata = {**(result.metadata or {}), "routed_to": target}
    _validate_and_route(db, result, payload, target)
    _update_job_record(db, job_id, result)
    return result


def _stub_agent(agent: str, matter_id: str, instruction: str) -> AgentResult:
    """Phase 4+ agents: inbox-safe placeholder until full LLM wrappers ship."""

    label = agent.replace("_", " ").title()
    return AgentResult(
        agent=agent,
        matter_id=matter_id,
        anchor_facts=[f"Instruction received for {label}."],
        anchor_law=["Firm rules apply; no automated legal conclusion."],
        anchor_strategy=[instruction[:200] or "(empty instruction)"],
        anchor_risk=[f"{label} is not fully automated in Phase 4."],
        anchor_next=["Attorney review required", "Check PM Inbox for follow-up"],
        gaps=[
            f"Phase 4+: {label} agent is not wired yet. Request logged for attorney triage.",
        ],
        summary=f"{label} stub: escalate via PM Inbox.",
        confidence=0.4,
        complete=False,
    )


def execute_agent(agent: str, payload: dict[str, Any]) -> AgentResult:
    matter_id = str(payload.get("matter_id") or "")
    instruction = str(payload.get("instruction") or payload.get("query") or "")

    if agent == "drafting":
        return run_drafting(matter_id, instruction)
    if agent == "mass_audit":
        return run_mass_audit(matter_id, instruction)
    if agent == "legal_mapping":
        return run_legal_mapping(matter_id, instruction)
    if agent == "pattern":
        return run_pattern(matter_id, facts=payload.get("facts"))
    if agent == "strategy":
        return run_strategy(matter_id, posture=str(payload.get("posture") or ""), selected_strategy=payload.get("selected_strategy"))
    return run_research(matter_id, instruction, sources=payload.get("sources"))


def _validate_and_route(
    db: Session,
    result: AgentResult,
    payload: dict[str, Any],
    target: str,
) -> None:
    """BUILD_SPEC §8: PM calls ``result.is_valid()``; on failure, file an inbox card.

    Two failure modes are routed to the inbox:
    1. ``is_valid()`` returns False → agent claimed full certainty with no
       gaps and no uncertainties. Always suspicious — attorney must confirm.
    2. ``result.complete`` is False AND blocking gaps were surfaced → the
       agent paused work and needs guidance.
    """

    matter_id = result.matter_id or str(payload.get("matter_id") or "") or None
    valid = result.is_valid()
    if valid and result.complete:
        return

    if not valid:
        what_tried = result.summary or f"{target} agent completed without disclosing any gaps or uncertainties."
        what_needed = (
            "Agent returned a result claiming full certainty. This is "
            "unusual — confirm the output is sound before promoting it."
        )
        reason = "is_valid_false"
    else:
        gap_lines = [g for g in result.gaps[:3]] or [
            q.question for q in result.gap_questions[:3]
        ]
        what_tried = result.summary or f"{target} agent paused with gaps."
        what_needed = (
            "Agent paused. Provide guidance on:\n- "
            + "\n- ".join(gap_lines or ["(no gap text)"])
        )
        reason = "incomplete_with_gaps"

    enqueue_inbox_review(
        matter_id,
        target,
        what_tried=what_tried,
        what_needed=what_needed,
        options=["Approve", "Reject", "Modify", "Defer"],
        reason=reason,
    )
    _log_audit(
        db,
        matter_id=matter_id,
        agent=target,
        action="inbox_review",
        summary=f"PM created inbox card ({reason}) for {target}.",
        meta={"job_id": result.job_id, "reason": reason},
    )


def _update_job_record(db: Session, job_id: str, result: AgentResult) -> None:
    row = db.get(AgentJob, job_id)
    if not row:
        return
    row.status = "completed" if result.complete else "blocked"
    row.result = result.model_dump()
    row.completed_at = datetime.now(timezone.utc)
    db.commit()


def process_next_job(db: Session) -> AgentResult | None:
    """Dequeue one Redis job and execute (worker entry point)."""

    from app.services.redis_queue import complete_job, dequeue_job

    record = dequeue_job(timeout=1)
    if not record:
        return None

    job_id = record["id"]
    agent = record["agent"]
    payload = record.get("payload") or {}

    row = db.get(AgentJob, job_id)
    if row:
        row.status = "running"
        row.started_at = datetime.now(timezone.utc)
        db.commit()

    try:
        result = execute_agent(agent, payload)
        result.job_id = job_id
        _validate_and_route(db, result, payload, agent)
        complete_job(job_id, result=result.model_dump())
        _update_job_record(db, job_id, result)
        _log_audit(
            db,
            matter_id=payload.get("matter_id"),
            agent=agent,
            action="job_completed",
            summary=result.summary[:200],
            meta={"job_id": job_id, "complete": result.complete},
        )
        return result
    except Exception as exc:
        complete_job(job_id, error=str(exc))
        if row:
            row.status = "failed"
            row.error = str(exc)
            row.completed_at = datetime.now(timezone.utc)
            db.commit()
        raise


def list_inbox(db: Session, limit: int = 20) -> list[dict[str, Any]]:
    """Return recent jobs awaiting or after review."""

    rows = (
        db.query(AgentJob)
        .filter(AgentJob.status.in_(["queued", "running", "completed", "blocked"]))
        .order_by(AgentJob.created_at.desc())
        .limit(limit)
        .all()
    )
    items = []
    for row in rows:
        preview = ""
        if row.result and isinstance(row.result, dict):
            preview = str(row.result.get("summary") or "")[:120]
        items.append(
            {
                "id": row.id,
                "matter_id": row.matter_id,
                "agent": row.agent,
                "status": row.status,
                "priority": row.priority,
                "preview": preview or f"{row.agent} job ({row.status})",
                "created_at": row.created_at.isoformat() if row.created_at else None,
            }
        )
    return items


def get_job_result(job_id: str) -> dict[str, Any] | None:
    return get_job(job_id)
