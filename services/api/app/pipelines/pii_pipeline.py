"""Presidio anonymization gate for OCR text at PII tier >= 1."""

from __future__ import annotations

import logging
import os

import httpx

LOGGER = logging.getLogger(__name__)


def anonymize_text(text: str, *, tier: int | None = None) -> tuple[str, bool]:
    """Return (text, was_anonymized). Skips when tier < 1 or Presidio unavailable."""

    active_tier = tier if tier is not None else int(os.getenv("AOD_PII_TIER", "0"))
    if active_tier < 1 or not text.strip():
        return text, False

    analyzer = os.getenv("PRESIDIO_ANALYZER_URL", "http://presidio-analyzer:3000")
    anonymizer = os.getenv("PRESIDIO_ANONYMIZER_URL", "http://presidio-anonymizer:3000")

    try:
        with httpx.Client(timeout=8.0) as client:
            analyze = client.post(f"{analyzer}/analyze", json={"text": text, "language": "en"})
            if analyze.status_code >= 400:
                LOGGER.warning("Presidio analyze failed: %s", analyze.status_code)
                return text, False
            results = analyze.json()
            anon = client.post(
                f"{anonymizer}/anonymize",
                json={"text": text, "analyzer_results": results},
            )
            if anon.status_code >= 400:
                return text, False
            payload = anon.json()
            return str(payload.get("text") or text), True
    except httpx.HTTPError as exc:
        LOGGER.warning("Presidio unavailable at tier %s: %s", active_tier, exc)
        return text, False
