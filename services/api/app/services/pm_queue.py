"""Redis-backed PM work queue (Phase 4)."""

from __future__ import annotations

import json
import os
import uuid
from datetime import datetime, timezone
from typing import Any

import redis

QUEUE_KEY = "aod:pm:inbox"
AUDIT_KEY = "aod:audit:log"


def _redis() -> redis.Redis:
    url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    return redis.Redis.from_url(url, decode_responses=True)


def enqueue_pm_job(matter_id: str, instruction: str, priority: str = "normal") -> dict[str, Any]:
    job = {
        "id": f"pm-{uuid.uuid4().hex[:8]}",
        "matter_id": matter_id,
        "instruction": instruction,
        "priority": priority,
        "status": "queued",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    _redis().lpush(QUEUE_KEY, json.dumps(job))
    append_audit(matter_id, "pm_orchestrator", f"Queued: {instruction[:120]}")
    return job


def enqueue_inbox_review(
    matter_id: str | None,
    agent: str,
    *,
    what_tried: str,
    what_needed: str,
    options: list[str] | None = None,
    reason: str = "",
) -> dict[str, Any]:
    """Surface an item that needs attorney review (BUILD_SPEC §8 inbox card)."""

    item = {
        "id": f"inbox-{uuid.uuid4().hex[:8]}",
        "matter_id": matter_id or "",
        "agent": agent,
        "what_tried": what_tried[:1000],
        "what_needed": what_needed[:1000],
        "options": options or ["Approve", "Reject", "Modify", "Defer"],
        "status": "Unread",
        "reason": reason[:500],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    try:
        _redis().lpush(QUEUE_KEY, json.dumps(item))
    except Exception:
        # Redis offline — log audit only so orchestrator never crashes.
        pass
    append_audit(
        matter_id or "",
        agent,
        f"PM inbox review created: {what_needed[:120]}",
    )
    return item


def list_pm_inbox(limit: int = 20) -> list[dict[str, Any]]:
    raw = _redis().lrange(QUEUE_KEY, 0, limit - 1)
    items: list[dict[str, Any]] = []
    for entry in raw:
        try:
            items.append(json.loads(entry))
        except json.JSONDecodeError:
            continue
    return items


def append_audit(matter_id: str, agent: str, summary: str) -> dict[str, Any]:
    entry = {
        "id": f"audit-{uuid.uuid4().hex[:8]}",
        "matter_id": matter_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "actor": agent,
        "agent": agent,
        "summary": summary,
    }
    _redis().lpush(AUDIT_KEY, json.dumps(entry))
    return entry


def list_audit_for_matter(matter_id: str, limit: int = 50) -> list[dict[str, Any]]:
    raw = _redis().lrange(AUDIT_KEY, 0, 200)
    out: list[dict[str, Any]] = []
    for entry in raw:
        try:
            row = json.loads(entry)
        except json.JSONDecodeError:
            continue
        if row.get("matter_id") == matter_id:
            out.append(row)
        if len(out) >= limit:
            break
    return out
