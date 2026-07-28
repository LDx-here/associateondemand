"""Documents persistence factory — Airtable primary, optional Sheets dual-write.

See docs/runbooks/documents-sheets-migration.md.
"""

from __future__ import annotations

import logging
import os
from typing import Any

from app.services import airtable as at
from app.services import google_sheets as gs

LOGGER = logging.getLogger(__name__)


def data_store_kind() -> str:
    raw = os.environ.get("DATA_STORE", "").strip().lower()
    if raw in {"google_sheets", "sheets", "gsheets"}:
        return "google_sheets"
    if raw in {"airtable", "at"}:
        return "airtable"
    # Default: Airtable (legacy Fly path) until secrets + dual-write verified.
    return "airtable"


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
    """Persist a Documents row.

    - Always attempts Airtable when PAT is set (legacy OCR path).
    - When ``AOD_DOCUMENTS_DUAL_WRITE=1`` and Sheets is configured, also appends
      to the Documents tab so Next.js ``DATA_STORE=google_sheets`` can list it.
    - When ``DATA_STORE=google_sheets`` and Airtable is unset, writes Sheets only.
    """

    kind = data_store_kind()
    airtable_result: dict[str, Any] | None = None
    sheets_result: dict[str, Any] | None = None

    write_airtable = kind != "google_sheets" or bool(os.environ.get("AIRTABLE_PAT", "").strip())
    write_sheets = kind == "google_sheets" or gs.dual_write_enabled()

    if write_airtable:
        airtable_result = at.create_document(
            matter_code=matter_code,
            title=title,
            category=category,
            uploaded_by=uploaded_by,
            ocr_status=ocr_status,
            pii_tier=pii_tier,
            file_type=file_type,
            file_path=file_path,
        )

    if write_sheets and gs.sheets_configured():
        # Prefer reusing Airtable record id as Sheets row_id when dual-writing so
        # Next.js file-preview URLs that key off the same id keep working.
        row_id = None
        if isinstance(airtable_result, dict):
            row_id = airtable_result.get("id") or airtable_result.get("record_id")
        sheets_result = gs.create_document(
            matter_code=matter_code,
            title=title,
            category=category,
            uploaded_by=uploaded_by,
            ocr_status=ocr_status,
            pii_tier=pii_tier,
            file_type=file_type,
            row_id=str(row_id) if row_id else None,
        )
        if sheets_result is None:
            LOGGER.warning(
                "Sheets document write skipped/failed for matter=%s title=%s "
                "(set GOOGLE_SERVICE_ACCOUNT_JSON + GOOGLE_SHEETS_SPREADSHEET_ID on Fly)",
                matter_code,
                title[:80],
            )
    elif write_sheets and not gs.sheets_configured():
        LOGGER.info(
            "Sheets dual-write requested but not configured "
            "(need GOOGLE_SHEETS_SPREADSHEET_ID + GOOGLE_SERVICE_ACCOUNT_JSON)"
        )

    return airtable_result or sheets_result
