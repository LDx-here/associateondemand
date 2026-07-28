"""Google Sheets Documents writer for Fly OCR dual-write.

Requires env (same values as Vercel):
  GOOGLE_SHEETS_SPREADSHEET_ID
  GOOGLE_SERVICE_ACCOUNT_JSON  (full JSON string) OR GOOGLE_APPLICATION_CREDENTIALS (path)

Enable dual-write from Airtable create_document via:
  AOD_DOCUMENTS_DUAL_WRITE=1

When DATA_STORE=google_sheets and dual-write is off, prefer create_document_in_sheets
from data_store factory (Sheets-only path) once Airtable Documents writes are retired.
"""

from __future__ import annotations

import json
import logging
import os
import time
import uuid
from pathlib import Path
from typing import Any

import httpx

LOGGER = logging.getLogger(__name__)

SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets"
SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets"
DOCUMENTS_TAB = "Documents"
DOCUMENTS_HEADERS = [
    "row_id",
    "matter_id",
    "title",
    "category",
    "created_at",
    "uploaded_by",
    "ocr_status",
    "pii_tier",
    "file_type",
]

_token_cache: dict[str, Any] = {"token": None, "expires_at": 0.0}


def sheets_configured() -> bool:
    return bool(os.environ.get("GOOGLE_SHEETS_SPREADSHEET_ID", "").strip()) and bool(
        _load_service_account()
    )


def dual_write_enabled() -> bool:
    return os.environ.get("AOD_DOCUMENTS_DUAL_WRITE", "").strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }


def _load_service_account() -> dict[str, str] | None:
    inline = os.environ.get("GOOGLE_SERVICE_ACCOUNT_JSON", "").strip()
    if inline:
        try:
            data = json.loads(inline)
            if data.get("client_email") and data.get("private_key"):
                return data
        except json.JSONDecodeError:
            LOGGER.warning("GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON")
            return None
    path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "").strip()
    if path and Path(path).is_file():
        try:
            data = json.loads(Path(path).read_text(encoding="utf-8"))
            if data.get("client_email") and data.get("private_key"):
                return data
        except (OSError, json.JSONDecodeError) as exc:
            LOGGER.warning("Failed to read GOOGLE_APPLICATION_CREDENTIALS: %s", exc)
    return None


def _access_token() -> str | None:
    now = time.time()
    cached = _token_cache.get("token")
    expires = float(_token_cache.get("expires_at") or 0)
    if cached and expires > now + 60:
        return str(cached)

    sa = _load_service_account()
    if not sa:
        return None

    try:
        from google.oauth2 import service_account
        from google.auth.transport.requests import Request
    except ImportError:
        LOGGER.warning(
            "google-auth not installed — Sheets dual-write unavailable. "
            "pip install google-auth (see requirements.txt)"
        )
        return None

    creds = service_account.Credentials.from_service_account_info(
        sa,
        scopes=[SHEETS_SCOPE],
    )
    creds.refresh(Request())
    if not creds.token:
        return None
    _token_cache["token"] = creds.token
    _token_cache["expires_at"] = now + 3300
    return str(creds.token)


def _spreadsheet_id() -> str | None:
    sid = os.environ.get("GOOGLE_SHEETS_SPREADSHEET_ID", "").strip()
    return sid or None


def create_document(
    *,
    matter_code: str,
    title: str,
    category: str = "",
    uploaded_by: str = "Strong Reader",
    ocr_status: str = "processed",
    pii_tier: str = "0",
    file_type: str = "",
    row_id: str | None = None,
) -> dict[str, Any] | None:
    """Append a Documents row. Returns {id, ...} or None when not configured / on error."""

    spreadsheet_id = _spreadsheet_id()
    token = _access_token()
    if not spreadsheet_id or not token:
        return None

    doc_id = row_id or f"gs-doc-{uuid.uuid4().hex[:12]}"
    created_at = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    values = [
        doc_id,
        matter_code,
        title[:240],
        (category or "uncategorized")[:120],
        created_at,
        uploaded_by[:120],
        ocr_status[:80],
        str(pii_tier)[:40],
        (file_type or "")[:80],
    ]
    # Align to canonical header order
    assert len(values) == len(DOCUMENTS_HEADERS)

    range_a1 = f"'{DOCUMENTS_TAB}'!A:I"
    from urllib.parse import quote

    url = (
        f"{SHEETS_API}/{spreadsheet_id}/values/"
        f"{quote(range_a1, safe='')}"
        f":append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS"
    )

    try:
        with httpx.Client(timeout=30.0) as client:
            resp = client.post(
                url,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                },
                json={"values": [values]},
            )
        if resp.status_code >= 400:
            LOGGER.warning(
                "Google Sheets document append failed %s: %s",
                resp.status_code,
                resp.text[:400],
            )
            return None
    except Exception as exc:  # noqa: BLE001 — dual-write must never crash OCR
        LOGGER.warning("Google Sheets document append error: %s", exc)
        return None

    return {
        "id": doc_id,
        "matter_id": matter_code,
        "title": title[:240],
        "category": (category or "uncategorized")[:120],
        "created_at": created_at,
        "uploaded_by": uploaded_by[:120],
        "ocr_status": ocr_status,
        "pii_tier": pii_tier,
        "file_type": file_type,
    }
