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
    thinking: dict[str, Any] | None = None,
) -> str | None:
    """Return assistant text or None if Anthropic is not configured / call fails.

    thinking: optional Anthropic extended thinking, e.g.
      {"type": "enabled", "budget_tokens": 8192}
    When set, temperature is omitted (API requirement) and max_tokens must exceed budget.
    """

    api_key = os.getenv("ANTHROPIC_API_KEY", "").strip()
    if not api_key:
        return None

    resolved_max = max_tokens
    if thinking and thinking.get("type") == "enabled":
        budget = int(thinking.get("budget_tokens") or 0)
        if budget and resolved_max <= budget:
            resolved_max = budget + max(2048, max_tokens)
            LOGGER.debug(
                "raised max_tokens from %s to %s for thinking budget %s",
                max_tokens,
                resolved_max,
                budget,
            )

    payload: dict[str, Any] = {
        "model": model or os.getenv("LLM_DEFAULT_MODEL", DEFAULT_MODEL),
        "max_tokens": resolved_max,
        "system": system,
        "messages": [{"role": "user", "content": user}],
    }
    # Anthropic rejects temperature when extended thinking is enabled.
    if thinking and thinking.get("type") == "enabled":
        payload["thinking"] = thinking
    else:
        payload["temperature"] = temperature

    try:
        # Thinking + long AOS sections can exceed 2 minutes.
        timeout = 300.0 if (thinking and thinking.get("type") == "enabled") else 120.0
        with httpx.Client(timeout=httpx.Timeout(timeout, connect=10.0)) as client:
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


def aos_thinking_kwargs() -> dict[str, Any]:
    """Extended thinking config for AOS FILL section calls."""
    try:
        budget = int(os.getenv("AOD_AOS_THINKING_BUDGET", "8192").strip() or "8192")
    except ValueError:
        budget = 8192
    return {"type": "enabled", "budget_tokens": budget}


def aos_model_name() -> str:
    """Model for AOS FILL — must support extended thinking. Override via AOD_AOS_MODEL."""
    return (
        os.getenv("AOD_AOS_MODEL", "").strip()
        or os.getenv("AOD_DRAFTING_MODEL_AOS_DISCRETIONARY_BRIEF", "").strip()
        or os.getenv("LLM_DEFAULT_MODEL", "").strip()
        or DEFAULT_MODEL
    )


def aos_max_tokens() -> int:
    try:
        return int(os.getenv("AOD_AOS_MAX_TOKENS", "16000").strip() or "16000")
    except ValueError:
        return 16000
