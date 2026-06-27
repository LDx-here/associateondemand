"""OCR pipeline tests."""

from __future__ import annotations

import tempfile
from pathlib import Path

from app.pipelines.ocr_pipeline import run_ocr_pipeline, text_quality_score


def test_text_quality_empty() -> None:
    assert text_quality_score("") == 0.0


def test_plain_text_file() -> None:
    with tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False) as fh:
        fh.write("This is a sufficiently long plain text document for intake testing purposes.")
        path = Path(fh.name)
    try:
        result = run_ocr_pipeline(path)
        assert result.method == "plain_text"
        assert "intake testing" in result.text
        assert result.processing_status == "processed"
    finally:
        path.unlink(missing_ok=True)
