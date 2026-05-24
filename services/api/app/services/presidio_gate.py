"""PII tier gate — Strong Reader access control."""

from __future__ import annotations

import os

import httpx
from fastapi import HTTPException


def current_tier() -> int:
    raw = os.getenv("AOD_PII_TIER", "0")
    try:
        return int(raw)
    except ValueError:
        return 0


def presidio_reachable() -> bool:
    url = os.getenv("PRESIDIO_HEALTH_URL")
    if not url:
        return False
    try:
        return httpx.get(url, timeout=2).status_code == 200
    except Exception:
        return False


def require_strong_reader(*, manual_review_approved: bool = False) -> None:
    """
    Tier 1+: Presidio must be healthy before documents traverse OCR/LLM stacks.
    Tier 0: attorney must explicitly approve manual review (no anonymization proxy).
    """

    tier = current_tier()
    if tier >= 1:
        if not presidio_reachable():
            raise HTTPException(
                status_code=503,
                detail=(
                    "Presidio analyzer not reachable. Set PRESIDIO_HEALTH_URL and ensure "
                    "the sidecar is healthy before intake at tier 1+."
                ),
            )
        return

    if not manual_review_approved:
        raise HTTPException(
            status_code=503,
            detail=(
                "Strong Reader disabled at AOD_PII_TIER=0 without manual attorney approval. "
                "Send manual_review_approved=true (form field or X-Manual-Review-Approved header) "
                "after confirming no client PII should leave the firm boundary, or raise tier to 1."
            ),
        )
