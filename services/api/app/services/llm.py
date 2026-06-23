"""Anthropic Messages API wrapper for agent LLM calls."""

from __future__ import annotations

import logging
import os
from typing import Any

import httpx

LOGGER = logging.getLogger(__name__)

ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"
DEFAULT_MODEL = "claude-sonnet-4-6"


def is_configured() -> bool:
    key = os.getenv("ANTHROPIC_API_KEY", "").strip()
    return bool(key and not key.startswith("sk-ant-replace"))


def generate_text(
    *,
    system: str,
    user: str,
    max_tokens: int = 8192,
    temperature: float = 0.2,
    model: str | None = None,
) -> str | None:
    """Return assistant text or None if Anthropic is not configured / call fails."""

    api_key = os.getenv("ANTHROPIC_API_KEY", "").strip()
    if not api_key:
        return None

    payload: dict[str, Any] = {
        "model": model or os.getenv("LLM_DEFAULT_MODEL", DEFAULT_MODEL),
        "max_tokens": max_tokens,
        "temperature": temperature,
        "system": system,
        "messages": [{"role": "user", "content": user}],
    }

    try:
        with httpx.Client(timeout=httpx.Timeout(120.0, connect=10.0)) as client:
            resp = client.post(
                ANTHROPIC_API_URL,
                headers={
                    "x-api-key": api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json=payload,
            )
            if resp.status_code >= 400:
                LOGGER.warning("anthropic error %s: %s", resp.status_code, resp.text[:400])
                return None
            data = resp.json()
            blocks = data.get("content") or []
            parts = [b.get("text", "") for b in blocks if b.get("type") == "text"]
            text = "".join(parts).strip()
            return text or None
    except httpx.HTTPError:
        LOGGER.exception("anthropic request failed")
        return None
