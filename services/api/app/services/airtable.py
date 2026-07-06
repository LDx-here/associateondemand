"""Minimal Airtable HTTP client for FastAPI workers.

The Next.js app is the primary Airtable reader (BUILD_SPEC §3 lib/airtable/).
This module is the narrow exception: PM Inbox and Corrections writers in
the agent layer must persist durable rows so the attorney inbox and
training corpus survive Redis restarts.

The PAT never leaves the API container. If `AIRTABLE_PAT` or
`AIRTABLE_BASE_ID` are unset (local dev without Airtable), every helper
returns ``None`` and the caller is expected to keep its Redis / file
fallback. No exception is raised, so agent code can call these helpers
unconditionally.
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any, Mapping

import httpx

LOGGER = logging.getLogger(__name__)

TABLE_MATTERS = "Matters"
TABLE_TASKS = "Tasks"
TABLE_LEGAL_ELEMENTS = "Legal Elements"
TABLE_DOCUMENTS = "Documents"
TABLE_NOTES = "Notes"
TABLE_STRATEGY_PATTERNS = "Strategy Patterns"
TABLE_PM_INBOX = "PM Inbox"
TABLE_CORRECTIONS = "Corrections"

# BUILD_SPEC §2 — snake_case column names (post-rename, 2026-05-26).
FIELDS_PM_INBOX = {
    "title": "title",
    "matter_id": "matter_id",
    "agent": "agent",
    "what_tried": "what_tried",
    "what_needed": "what_needed",
    "options": "options",
    "status": "status",
    "resolution": "resolution",
    "created_at": "created_at",
    "resolved_at": "resolved_at",
}

FIELDS_CORRECTIONS = {
    "agent": "agent",
    "matter_id": "matter_id",
    "original_output": "original_output",
    "attorney_edit": "attorney_edit",
    "correction_type": "correction_type",
    "reason": "reason",
    "applied_to": "applied_to",
    "created_at": "created_at",
}

FIELDS_DOCUMENTS = {
    "title": "title",
    "matter_id": "matter_id",
    "category": "category",
    "created_at": "created_at",
    "uploaded_by": "uploaded_by",
    "ocr_status": "ocr_status",
    "pii_tier": "pii_tier",
    "file_type": "file_type",
    "file_path": "file_path",
}

FIELDS_MATTERS = {
    "matter_id": "matter_id",
    "title": "title",
    "case_type": "case_type",
    "country": "country",
    "posture": "posture",
    "court": "court",
    "judge": "judge",
    "status": "status",
    "next_deadline": "next_deadline",
    "next_hearing": "next_hearing",
    "summary": "summary",
    "created_at": "created_at",
    "updated_at": "updated_at",
}

FIELDS_TASKS = {
    "description": "description",
    "matter_id": "matter_id",
    "status": "status",
    "priority": "priority",
    "due_date": "due_date",
    "created_from_agent": "created_from_agent",
}

FIELDS_NOTES = {
    "content": "content",
    "matter_id": "matter_id",
    "author": "author",
    "created_at": "created_at",
    "type": "type",
}

FIELDS_STRATEGY_PATTERNS = {
    "fact_pattern": "fact_pattern",
    "fact_pattern_detail": "fact_pattern_detail",
    "strategy_used": "strategy_used",
    "outcome": "outcome",
    "correction_note": "correction_note",
    "created_at": "created_at",
}

_CATEGORY_TO_TYPE = {
    "factual_error": "Factual",
    "classification_error": "Classification",
    "formatting_convention": "Convention",
    "analytical_error": "Analytical",
    "false_positive": "False Positive",
    "false_negative": "False Negative",
}


def is_configured() -> bool:
    return bool(os.getenv("AIRTABLE_PAT") and os.getenv("AIRTABLE_BASE_ID"))


def _client() -> httpx.Client:
    pat = os.environ["AIRTABLE_PAT"]
    return httpx.Client(
        timeout=httpx.Timeout(10.0, connect=5.0),
        headers={
            "Authorization": f"Bearer {pat}",
            "Content-Type": "application/json",
        },
    )


def _base_url(table: str) -> str:
    base = os.environ["AIRTABLE_BASE_ID"]
    safe_table = table.replace(" ", "%20")
    return f"https://api.airtable.com/v0/{base}/{safe_table}"


def _create_record(table: str, fields: Mapping[str, Any]) -> dict[str, Any] | None:
    if not is_configured():
        return None
    try:
        with _client() as client:
            # ``typecast`` lets us pass new singleSelect values (e.g. an
            # agent name not yet on the dropdown) and have Airtable add
            # them rather than 422.
            resp = client.post(
                _base_url(table),
                json={"fields": dict(fields), "typecast": True},
            )
            if resp.status_code >= 400:
                LOGGER.warning(
                    "airtable create %s failed: %s %s",
                    table,
                    resp.status_code,
                    resp.text[:300],
                )
                return None
            return resp.json()
    except httpx.HTTPError:
        LOGGER.exception("airtable create %s network error", table)
        return None


def _patch_record(table: str, record_id: str, fields: Mapping[str, Any]) -> dict[str, Any] | None:
    if not is_configured():
        return None
    try:
        with _client() as client:
            resp = client.patch(
                f"{_base_url(table)}/{record_id}",
                json={"fields": dict(fields), "typecast": True},
            )
            if resp.status_code >= 400:
                LOGGER.warning("airtable patch %s/%s failed: %s", table, record_id, resp.text[:300])
                return None
            return resp.json()
    except httpx.HTTPError:
        LOGGER.exception("airtable patch network error")
        return None


def _list_matter_codes() -> list[str]:
    if not is_configured():
        return []
    try:
        with _client() as client:
            resp = client.get(_base_url(TABLE_MATTERS), params={"pageSize": "100"})
            if resp.status_code >= 400:
                return []
            codes: list[str] = []
            for rec in resp.json().get("records", []):
                code = rec.get("fields", {}).get(FIELDS_MATTERS["matter_id"])
                if code:
                    codes.append(str(code))
            return codes
    except httpx.HTTPError:
        return []


def _next_matter_code() -> str:
    import re

    max_num = 1000
    for code in _list_matter_codes():
        match = re.match(r"^AOD-(\d+)$", code, re.I)
        if match:
            max_num = max(max_num, int(match.group(1)))
    return f"AOD-{max_num + 1}"


def upsert_matter_from_import(row: Mapping[str, Any]) -> dict[str, Any]:
    """Create or update a Matter from eImmigration Tier A import row."""

    matter_id = str(row.get("matter_id") or "").strip()
    title = str(row.get("client_name") or row.get("title") or matter_id or "Imported matter").strip()
    if not matter_id and not title:
        return {"action": "skipped", "reason": "missing matter_id and client_name"}

    if not matter_id:
        matter_id = _next_matter_code()

    existing_id = _resolve_matter_record_id(matter_id)
    fm = FIELDS_MATTERS
    now = _now_iso()
    fields: dict[str, Any] = {
        fm["matter_id"]: matter_id,
        fm["title"]: title[:240],
        fm["updated_at"]: now,
    }
    if row.get("case_type"):
        fields[fm["case_type"]] = str(row["case_type"])[:120]
    if row.get("status"):
        fields[fm["status"]] = str(row["status"])[:80]
    if row.get("procedural_posture") or row.get("posture"):
        fields[fm["posture"]] = str(row.get("procedural_posture") or row.get("posture"))[:120]
    if row.get("next_deadline"):
        fields[fm["next_deadline"]] = str(row["next_deadline"])[:40]

    if existing_id:
        rec = _patch_record(TABLE_MATTERS, existing_id, fields)
        return {"action": "updated", "matter_id": matter_id, "record": rec}

    fields[fm["status"]] = fields.get(fm["status"], "Open")
    fields[fm["created_at"]] = now
    rec = _create_record(TABLE_MATTERS, fields)
    return {"action": "created", "matter_id": matter_id, "record": rec}


def create_agent_task(
    *,
    matter_code: str,
    description: str,
    priority: str = "High",
    created_from_agent: str = "pm_orchestrator",
) -> dict[str, Any] | None:
    """Create a follow-up task when PM surfaces gap questions."""

    rec_id = _resolve_matter_record_id(matter_code)
    if not rec_id:
        return None
    ft = FIELDS_TASKS
    fields: dict[str, Any] = {
        ft["description"]: description[:500],
        ft["matter_id"]: [rec_id],
        ft["status"]: "To Do",
        ft["priority"]: priority[:40],
        ft["created_from_agent"]: created_from_agent[:120],
    }
    return _create_record(TABLE_TASKS, fields)


def _resolve_matter_record_id(matter_code: str) -> str | None:
    """Look up the Airtable rec id for the given Matter ID code."""

    if not is_configured() or not matter_code:
        return None
    if matter_code.startswith("rec"):
        return matter_code
    safe = matter_code.replace("'", "\\'")
    formula = f"{{{FIELDS_MATTERS['matter_id']}}} = '{safe}'"
    try:
        with _client() as client:
            resp = client.get(
                _base_url(TABLE_MATTERS),
                params={"filterByFormula": formula, "maxRecords": "1"},
            )
            if resp.status_code >= 400:
                return None
            records = resp.json().get("records", [])
            return records[0]["id"] if records else None
    except httpx.HTTPError:
        return None


def _list_records(table: str, *, max_records: int = 100, fields: list[str] | None = None) -> list[dict[str, Any]]:
    if not is_configured():
        return []
    params: dict[str, str] = {"pageSize": str(min(max_records, 100))}
    if fields:
        for idx, name in enumerate(fields):
            params[f"fields[{idx}]"] = name
    rows: list[dict[str, Any]] = []
    offset: str | None = None
    try:
        with _client() as client:
            while len(rows) < max_records:
                if offset:
                    params["offset"] = offset
                resp = client.get(_base_url(table), params=params)
                if resp.status_code >= 400:
                    LOGGER.warning("airtable list %s failed: %s", table, resp.status_code)
                    break
                data = resp.json()
                for rec in data.get("records") or []:
                    fields_out = rec.get("fields") or {}
                    fields_out["_record_id"] = rec.get("id")
                    rows.append(fields_out)
                    if len(rows) >= max_records:
                        break
                offset = data.get("offset")
                if not offset:
                    break
    except httpx.HTTPError:
        LOGGER.exception("airtable list %s network error", table)
    return rows


def list_matters(limit: int = 100) -> list[dict[str, Any]]:
    """Return matter rows keyed by BUILD_SPEC snake_case field names."""

    return _list_records(
        TABLE_MATTERS,
        max_records=limit,
        fields=[
            "matter_id",
            "title",
            "case_type",
            "country",
            "posture",
            "status",
            "summary",
            "next_deadline",
            "next_hearing",
        ],
    )


def list_tasks(limit: int = 100) -> list[dict[str, Any]]:
    return _list_records(
        TABLE_TASKS,
        max_records=limit,
        fields=["description", "matter_id", "status", "priority", "due_date", "is_filing_deadline"],
    )


def list_legal_elements(limit: int = 100) -> list[dict[str, Any]]:
    return _list_records(
        TABLE_LEGAL_ELEMENTS,
        max_records=limit,
        fields=[
            "element_name",
            "matter_id",
            "assessment",
            "key_gap",
            "next_action",
            "supporting_facts",
            "supporting_cases",
        ],
    )


def create_inbox_item(
    *,
    title: str,
    agent: str,
    what_tried: str,
    what_needed: str,
    options: list[str] | None = None,
    matter_code: str | None = None,
    created_at_iso: str | None = None,
) -> dict[str, Any] | None:
    """Persist a PM Inbox card (BUILD_SPEC §7.5).

    Returns the Airtable record dict on success, ``None`` if Airtable is
    not configured or the write failed (caller should rely on Redis).
    """

    fields: dict[str, Any] = {
        FIELDS_PM_INBOX["title"]: title[:240],
        FIELDS_PM_INBOX["agent"]: agent[:120],
        FIELDS_PM_INBOX["what_tried"]: what_tried[:4000],
        FIELDS_PM_INBOX["what_needed"]: what_needed[:4000],
        FIELDS_PM_INBOX["status"]: "Pending",
        FIELDS_PM_INBOX["options"]: json.dumps(options or []),
    }
    if matter_code:
        fields[FIELDS_PM_INBOX["matter_id"]] = matter_code
    if created_at_iso:
        # PM Inbox.created_at is a date column in the live base.
        fields[FIELDS_PM_INBOX["created_at"]] = created_at_iso.split("T", 1)[0]
    return _create_record(TABLE_PM_INBOX, fields)


def create_correction(
    *,
    agent: str,
    original_output: str,
    attorney_edit: str,
    category: str,
    reason: str,
    applied_to: str,
    matter_code: str | None = None,
    created_at_iso: str | None = None,
) -> dict[str, Any] | None:
    """Persist a Corrections row (BUILD_SPEC §10).

    ``category`` accepts the legacy snake_case correction enum
    (``factual_error``, ``analytical_error``, ...) and maps it to the
    Airtable single-select value. Returns ``None`` if Airtable is not
    configured or the write failed; caller keeps writing to firm-rules /
    strategy-patterns / categorizer-examples markdown.
    """

    fields: dict[str, Any] = {
        FIELDS_CORRECTIONS["agent"]: agent[:120],
        FIELDS_CORRECTIONS["original_output"]: original_output[:4000],
        FIELDS_CORRECTIONS["attorney_edit"]: attorney_edit[:4000],
        FIELDS_CORRECTIONS["correction_type"]: _CATEGORY_TO_TYPE.get(category, "Analytical"),
        FIELDS_CORRECTIONS["reason"]: reason[:1000],
        FIELDS_CORRECTIONS["applied_to"]: applied_to,
        FIELDS_CORRECTIONS["created_at"]: created_at_iso or _now_iso(),
    }
    if matter_code:
        rec_id = _resolve_matter_record_id(matter_code)
        if rec_id:
            fields[FIELDS_CORRECTIONS["matter_id"]] = [rec_id]
    return _create_record(TABLE_CORRECTIONS, fields)


def create_document(
    *,
    matter_code: str,
    title: str,
    category: str = "",
    uploaded_by: str = "Strong Reader",
    ocr_status: str = "processed",
    pii_tier: str = "0",
    file_type: str = "",
    file_path: str = "",
) -> dict[str, Any] | None:
    """Persist a Documents row after intake (BUILD_SPEC §7.8)."""

    fields: dict[str, Any] = {
        FIELDS_DOCUMENTS["title"]: title[:240],
        FIELDS_DOCUMENTS["category"]: category[:120] or "uncategorized",
        FIELDS_DOCUMENTS["created_at"]: _now_iso(),
        FIELDS_DOCUMENTS["uploaded_by"]: uploaded_by[:120],
        FIELDS_DOCUMENTS["ocr_status"]: ocr_status[:80],
        FIELDS_DOCUMENTS["pii_tier"]: str(pii_tier),
    }
    if file_type:
        fields[FIELDS_DOCUMENTS["file_type"]] = file_type[:80]
    if file_path:
        fields[FIELDS_DOCUMENTS["file_path"]] = file_path[:500]
    rec_id = _resolve_matter_record_id(matter_code)
    if rec_id:
        fields[FIELDS_DOCUMENTS["matter_id"]] = [rec_id]
    else:
        fields[FIELDS_DOCUMENTS["matter_id"]] = matter_code
    return _create_record(TABLE_DOCUMENTS, fields)


def create_matter_note(
    *,
    matter_code: str,
    content: str,
    author: str = "Litigation Associate",
    note_type: str = "Agent",
) -> dict[str, Any] | None:
    """Create a matter note (agent output or correction)."""

    rec_id = _resolve_matter_record_id(matter_code)
    if not rec_id:
        return None
    fields: dict[str, Any] = {
        FIELDS_NOTES["content"]: content[:8000],
        FIELDS_NOTES["author"]: author[:120],
        FIELDS_NOTES["matter_id"]: [rec_id],
        FIELDS_NOTES["created_at"]: _now_iso(),
        FIELDS_NOTES["type"]: note_type,
    }
    return _create_record(TABLE_NOTES, fields)


def update_matter_note(
    *,
    note_id: str,
    content: str,
    author: str | None = None,
) -> dict[str, Any] | None:
    """Update an existing matter note (attorney-edited agent output)."""

    fields: dict[str, Any] = {FIELDS_NOTES["content"]: content[:8000]}
    if author:
        fields[FIELDS_NOTES["author"]] = author[:120]
    return _patch_record(TABLE_NOTES, note_id, fields)


def list_matter_notes(matter_code: str, *, max_records: int = 50) -> list[dict[str, Any]]:
    """Return Notes rows linked to a matter code (human-readable matter_id)."""

    if not is_configured() or not matter_code:
        return []
    safe = matter_code.replace("'", "\\'")
    formula = f"FIND('{safe}', ARRAYJOIN({{{FIELDS_NOTES['matter_id']}}}))"
    params: dict[str, str] = {
        "filterByFormula": formula,
        "pageSize": str(min(max_records, 100)),
    }
    rows: list[dict[str, Any]] = []
    offset: str | None = None
    try:
        with _client() as client:
            while len(rows) < max_records:
                if offset:
                    params["offset"] = offset
                resp = client.get(_base_url(TABLE_NOTES), params=params)
                if resp.status_code >= 400:
                    LOGGER.warning("airtable list notes failed: %s", resp.status_code)
                    break
                data = resp.json()
                for rec in data.get("records") or []:
                    fields = rec.get("fields") or {}
                    fields["_record_id"] = rec.get("id")
                    rows.append(fields)
                    if len(rows) >= max_records:
                        break
                offset = data.get("offset")
                if not offset:
                    break
    except httpx.HTTPError:
        LOGGER.exception("airtable list notes network error")
    return rows


def fetch_latest_drafting_facts(matter_code: str) -> dict[str, Any] | None:
    """Parse the newest Facts-type note JSON blob for agent prompts."""

    notes = list_matter_notes(matter_code, max_records=100)
    fact_notes = [n for n in notes if str(n.get(FIELDS_NOTES["type"]) or "") == "Facts"]
    if not fact_notes:
        return None
    fact_notes.sort(key=lambda n: str(n.get(FIELDS_NOTES["created_at"]) or ""), reverse=True)
    raw = fact_notes[0].get(FIELDS_NOTES["content"])
    if not raw or not isinstance(raw, str):
        return None
    try:
        data = json.loads(raw.strip())
    except json.JSONDecodeError:
        return None
    if isinstance(data, dict) and data.get("v") == 1:
        return data
    return None


def create_strategy_pattern(
    *,
    fact_pattern: str,
    strategy_used: str,
    outcome: str,
    detail: str = "",
    correction_note: str = "",
    matter_code: str | None = None,
) -> dict[str, Any] | None:
    """Persist analytical correction to Strategy Patterns table (BUILD_SPEC §10)."""

    label = fact_pattern[:240] or "Correction pattern"
    fields: dict[str, Any] = {
        FIELDS_STRATEGY_PATTERNS["fact_pattern"]: label,
        FIELDS_STRATEGY_PATTERNS["fact_pattern_detail"]: detail[:4000] or outcome[:4000],
        FIELDS_STRATEGY_PATTERNS["strategy_used"]: strategy_used[:240],
        FIELDS_STRATEGY_PATTERNS["outcome"]: outcome[:4000],
        FIELDS_STRATEGY_PATTERNS["created_at"]: _now_iso(),
    }
    if correction_note:
        fields[FIELDS_STRATEGY_PATTERNS["correction_note"]] = correction_note[:2000]
    if matter_code:
        fields["matching_matters"] = matter_code[:240]
    return _create_record(TABLE_STRATEGY_PATTERNS, fields)


def _now_iso() -> str:
    from datetime import datetime, timezone

    return datetime.now(timezone.utc).isoformat(timespec="seconds")
