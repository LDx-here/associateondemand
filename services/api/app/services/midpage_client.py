"""Optional research connector clients (Midpage, Fastcase)."""

from __future__ import annotations

import logging
import os
from typing import Any

import httpx

LOGGER = logging.getLogger(__name__)


def search_midpage(query: str, *, jurisdiction: str = "6th Circuit") -> list[dict[str, Any]]:
    """Call Midpage when MIDPAGE_API_KEY is configured; else return []."""

    key = os.getenv("MIDPAGE_API_KEY", "").strip()
    if not key:
        return []
    base = os.getenv("MIDPAGE_API_URL", "https://api.midpage.ai/v1").rstrip("/")
    try:
        with httpx.Client(timeout=15.0) as client:
            resp = client.post(
                f"{base}/search",
                headers={"Authorization": f"Bearer {key}"},
                json={"query": query, "jurisdiction": jurisdiction},
            )
            if resp.status_code >= 400:
                LOGGER.warning("Midpage search failed: %s", resp.status_code)
                return []
            data = resp.json()
            return data if isinstance(data, list) else data.get("results", [])
    except httpx.HTTPError as exc:
        LOGGER.warning("Midpage unavailable: %s", exc)
        return []


def search_fastcase(query: str) -> list[dict[str, Any]]:
    """Call Fastcase when FASTCASE_API_KEY is configured; else return []."""

    key = os.getenv("FASTCASE_API_KEY", "").strip()
    if not key:
        return []
    base = os.getenv("FASTCASE_API_URL", "https://api.fastcase.com").rstrip("/")
    try:
        with httpx.Client(timeout=15.0) as client:
            resp = client.get(
                f"{base}/search",
                headers={"Authorization": f"Bearer {key}"},
                params={"q": query},
            )
            if resp.status_code >= 400:
                return []
            data = resp.json()
            return data if isinstance(data, list) else data.get("results", [])
    except httpx.HTTPError:
        return []
