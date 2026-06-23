"""Redis-backed agent job queue (Phase 4)."""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Any

import redis

from app.config import get_settings

QUEUE_KEY = "aod:agent:jobs"
JOB_KEY_PREFIX = "aod:agent:job:"


def _client() -> redis.Redis:
    return redis.Redis.from_url(get_settings().redis_url, decode_responses=True)


def enqueue_job(
    agent: str,
    matter_id: str | None,
    payload: dict[str, Any] | None = None,
    *,
    priority: str = "normal",
    job_id: str | None = None,
) -> str:
    """Push a job onto the Redis queue and store its metadata hash."""

    jid = job_id or str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    record = {
        "id": jid,
        "agent": agent,
        "matter_id": matter_id or "",
        "status": "queued",
        "priority": priority,
        "payload": payload or {},
        "created_at": now,
    }
    r = _client()
    r.hset(f"{JOB_KEY_PREFIX}{jid}", mapping={"json": json.dumps(record)})
    # High priority jobs go to the head of the queue.
    if priority == "high":
        r.lpush(QUEUE_KEY, jid)
    else:
        r.rpush(QUEUE_KEY, jid)
    return jid


def dequeue_job(timeout: int = 1) -> dict[str, Any] | None:
    """Blocking pop from queue; returns job record or None on timeout."""

    r = _client()
    item = r.blpop(QUEUE_KEY, timeout=timeout)
    if not item:
        return None
    _, jid = item
    raw = r.hget(f"{JOB_KEY_PREFIX}{jid}", "json")
    if not raw:
        return None
    record = json.loads(raw)
    record["status"] = "running"
    record["started_at"] = datetime.now(timezone.utc).isoformat()
    r.hset(f"{JOB_KEY_PREFIX}{jid}", mapping={"json": json.dumps(record)})
    return record


def get_job(job_id: str) -> dict[str, Any] | None:
    raw = _client().hget(f"{JOB_KEY_PREFIX}{job_id}", "json")
    return json.loads(raw) if raw else None


def update_job(job_id: str, **fields: Any) -> dict[str, Any] | None:
    record = get_job(job_id)
    if not record:
        return None
    record.update(fields)
    _client().hset(f"{JOB_KEY_PREFIX}{job_id}", mapping={"json": json.dumps(record)})
    return record


def complete_job(job_id: str, result: dict[str, Any] | None = None, error: str | None = None) -> dict[str, Any] | None:
    status = "failed" if error else "completed"
    return update_job(
        job_id,
        status=status,
        result=result,
        error=error,
        completed_at=datetime.now(timezone.utc).isoformat(),
    )


def queue_depth() -> int:
    return int(_client().llen(QUEUE_KEY))
