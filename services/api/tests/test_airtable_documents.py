"""Airtable document create field alignment tests."""

from __future__ import annotations

from app.services import airtable as at


def test_live_document_create_fields_excludes_drift_columns() -> None:
    """Live base lacks ocr_status/pii_tier/file_path — must not be written on create."""

    fields = {
        at.FIELDS_DOCUMENTS["title"]: "test.pdf",
        at.FIELDS_DOCUMENTS["category"]: "case_assessment",
        at.FIELDS_DOCUMENTS["created_at"]: "2026-07-21T12:00:00.000Z",
        at.FIELDS_DOCUMENTS["uploaded_by"]: "Strong Reader",
    }
    assert set(fields.keys()) <= {at.FIELDS_DOCUMENTS[k] for k in at.LIVE_DOCUMENT_CREATE_FIELDS}
    assert at.FIELDS_DOCUMENTS["ocr_status"] not in fields
    assert at.FIELDS_DOCUMENTS["pii_tier"] not in fields
    assert at.FIELDS_DOCUMENTS["file_type"] not in fields
    assert at.FIELDS_DOCUMENTS["file_path"] not in fields
