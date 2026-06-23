"""Tiered eImmigration integration — import UI (Tier A), observe/learn (B), automation (C)."""

from __future__ import annotations

import csv
import io
import json
from typing import Any

from fastapi import APIRouter, File, UploadFile

router = APIRouter(tags=["eimmigration"])

FIELD_ALIASES = {
    "matter_id": ("matter_id", "Matter ID", "matterId", "MatterID", "case_id"),
    "client_name": ("client_name", "Client Name", "clientName", "Client"),
    "case_type": ("case_type", "Case Type", "caseType", "CaseType"),
    "status": ("status", "Status", "case_status"),
    "posture": ("posture", "Procedural Posture", "proceduralPosture", "Posture"),
    "next_deadline": ("next_deadline", "Next Deadline", "nextDeadline", "Deadline"),
}


def _pick(row: dict[str, Any], keys: tuple[str, ...]) -> str | None:
    for key in keys:
        if key in row and row[key]:
            return str(row[key]).strip()
    return None


def normalize_record(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "matter_id": _pick(row, FIELD_ALIASES["matter_id"]),
        "client_name": _pick(row, FIELD_ALIASES["client_name"]),
        "case_type": _pick(row, FIELD_ALIASES["case_type"]),
        "status": _pick(row, FIELD_ALIASES["status"]),
        "procedural_posture": _pick(row, FIELD_ALIASES["posture"]),
        "next_deadline": _pick(row, FIELD_ALIASES["next_deadline"]),
        "raw": row,
    }


async def _parse_upload(file: UploadFile) -> tuple[list[dict[str, Any]], str | None]:
    raw = await file.read()
    name = (file.filename or "").lower()
    records: list[dict[str, Any]] = []

    if name.endswith(".json"):
        payload = json.loads(raw.decode("utf-8"))
        if isinstance(payload, list):
            records = payload
        elif isinstance(payload, dict) and "records" in payload:
            records = payload["records"]
        else:
            records = [payload]
    elif name.endswith(".csv"):
        reader = csv.DictReader(io.StringIO(raw.decode("utf-8")))
        records = list(reader)
    else:
        return [], f"Unsupported format: {file.filename}. Use .csv or .json"

    return records, None


@router.get("/eimmigration/status")
def eimmigration_status() -> dict[str, Any]:
    return {
        "tier_a": "csv_json_import",
        "tier_b": "playwright_observe_learn",
        "tier_c": "gated_browser_automation",
        "active_tier": "A",
        "endpoints": ["/eimmigration/import", "/api/import/eimmigration"],
    }


@router.post("/eimmigration/import")
@router.post("/api/import/eimmigration")
async def import_file(file: UploadFile = File(...)) -> dict[str, Any]:
    records, err = await _parse_upload(file)
    if err:
        return {"error": err, "filename": file.filename}

    normalized = [normalize_record(row) for row in records[:500]]
    valid = [r for r in normalized if r.get("matter_id") or r.get("client_name")]
    skipped = len(normalized) - len(valid)

    return {
        "imported": len(valid),
        "skipped": skipped,
        "preview": valid[:5],
        "field_map": list(FIELD_ALIASES.keys()),
        "message": "Tier A import complete. Map fields to Airtable in web UI or POST to matters API.",
        "next_steps": [
            "Review preview rows for field mapping",
            "Write to Airtable Matters table (Phase 6 production)",
            "Re-run Pattern Agent seed after import",
        ],
    }
