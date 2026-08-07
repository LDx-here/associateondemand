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

    # Scrub client PII before anything leaves the firm boundary, and restore
    # the real values on the way back so the attorney never sees a token.
    #
    # This sits here rather than at each call site deliberately: every agent
    # funnels through generate_text(), so covering this one function means no
    # future caller can forget. Set AOD_PSEUDONYMIZE=off only for local work
    # against non-client text.
    pseudonymize = os.getenv("AOD_PSEUDONYMIZE", "on").strip().lower() != "off"
    mapping: dict[str, str] = {}
    if pseudonymize:
        from app.pipelines.pseudonymize import restore, scrub

        scrubbed_system = scrub(system)
        scrubbed_user = scrub(user)
        if not (scrubbed_system.ok and scrubbed_user.ok):
            # Fail closed. Sending raw client text because a sidecar is down
            # is exactly the silent-degradation pattern that hid a 401 for
            # weeks — with far worse consequences here.
            LOGGER.error(
                "refusing to send text to Anthropic: %s",
                scrubbed_system.reason or scrubbed_user.reason,
            )
            return None
        mapping = {**scrubbed_system.mapping, **scrubbed_user.mapping}
        system, user = scrubbed_system.text, scrubbed_user.text

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
                # A bad key is a configuration failure, not "LLM unavailable".
                # Returning None here makes every agent fall back to a template,
                # which reads to the attorney as normal operation — the drafting
                # pipeline ran in template mode for days behind a logged 401
                # nobody saw. Auth and quota failures get logged at error level
                # so they surface in `flyctl logs` without being hunted for.
                if resp.status_code in (401, 403):
                    LOGGER.error(
                        "ANTHROPIC_API_KEY rejected (%s) — every agent will fall back to "
                        "template output until this is fixed: %s",
                        resp.status_code,
                        resp.text[:400],
                    )
                elif resp.status_code == 429:
                    LOGGER.error("anthropic rate limited (429): %s", resp.text[:400])
                else:
                    LOGGER.warning("anthropic error %s: %s", resp.status_code, resp.text[:400])
                return None
            data = resp.json()
            blocks = data.get("content") or []
            parts = [b.get("text", "") for b in blocks if b.get("type") == "text"]
            text = "".join(parts).strip()
            if not text:
                return None
            if mapping:
                from app.pipelines.pseudonymize import has_unrestored_tokens, restore

                text = restore(text, mapping)
                if has_unrestored_tokens(text):
                    # A token the model invented or mangled would surface to
                    # the attorney as gibberish in her own case file.
                    LOGGER.error("model output contained an unrestorable token; discarding")
                    return None
            return text
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


def check_connection(timeout_s: float = 15.0) -> dict[str, Any]:
    """Actually call Anthropic and report whether the key works.

    `is_configured()` only reports that a key *string* is present — it returns
    True for a revoked, expired, or wrong-account key. That gap is how this
    system ran in template mode for weeks: the key was set, so everything
    reported healthy, while every request 401'd and silently fell back.

    This makes one cheap call and reports the truth, so "the key is set" and
    "the key works" stop being the same answer.
    """
    key = os.getenv("ANTHROPIC_API_KEY", "").strip()
    model = os.getenv("LLM_DEFAULT_MODEL", DEFAULT_MODEL)
    # Always attach analyzer state: drafting needs BOTH a valid key and a
    # reachable analyzer, and a dead key must not hide whether the second
    # half is wired up.
    pii = pii_readiness()

    if not key:
        return {
            "configured": False,
            "working": False,
            "reason": "not_configured",
            "detail": "ANTHROPIC_API_KEY is not set. Drafting runs on templates.",
            "model": model,
            "pii": pii,
        }

    try:
        with httpx.Client(timeout=httpx.Timeout(timeout_s, connect=5.0)) as client:
            resp = client.post(
                ANTHROPIC_API_URL,
                headers={
                    "x-api-key": key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": model,
                    "max_tokens": 8,
                    "messages": [{"role": "user", "content": "Reply with OK."}],
                },
            )
    except httpx.HTTPError as exc:
        return {
            "configured": True,
            "working": False,
            "reason": "network_error",
            "detail": f"Could not reach Anthropic: {exc}",
            "model": model,
            "pii": pii,
        }

    if resp.status_code == 200:
        # A valid key is not sufficient: pseudonymization fails closed, so
        # without a reachable analyzer every call is refused before it is
        # made. Report that here rather than letting drafting look available
        # and then silently return nothing.
        if not pii["ready"]:
            return {
                "configured": True,
                "working": False,
                "reason": "pii_blocked",
                "detail": pii["detail"],
                "model": model,
                "pii": pii,
            }
        return {"configured": True, "working": True, "reason": "ok", "detail": "", "model": model, "pii": pii}

    reason_by_status = {
        401: (
            "invalid_key",
            "The API key is set but Anthropic rejected it (401). This is not a billing "
            "problem — credits do not fix a rejected key. Generate a key at "
            "console.anthropic.com/settings/keys; a Claude.ai subscription key will not work.",
        ),
        403: ("forbidden", "The key was accepted but lacks permission for this model (403)."),
        404: ("bad_model", f"Model '{model}' was not found (404). Check LLM_DEFAULT_MODEL."),
        429: ("rate_limited", "The key is valid but rate limited or out of credits (429)."),
    }
    reason, detail = reason_by_status.get(
        resp.status_code, ("error", f"Anthropic returned {resp.status_code}.")
    )
    return {
        "configured": True,
        "working": False,
        "reason": reason,
        "detail": detail,
        "model": model,
        "pii": pii,
    }


def pii_readiness() -> dict[str, Any]:
    """Whether client text can legally leave the firm boundary right now.

    Pseudonymization fails closed by design, so a missing analyzer blocks all
    drafting. That is the correct behaviour and a deliberate trade: no draft
    is worth transmitting a client's A-number in the clear.
    """
    if os.getenv("AOD_PSEUDONYMIZE", "on").strip().lower() == "off":
        return {
            "ready": True,
            "detail": "",
            "note": "AOD_PSEUDONYMIZE=off — client text is sent unscrubbed. Local use only.",
        }

    analyzer = os.getenv("PRESIDIO_ANALYZER_URL", "").strip()
    if not analyzer:
        return {
            "ready": False,
            "detail": (
                "AI drafting is blocked because the PII analyzer is not deployed. Client notes "
                "contain A-numbers, immigration status, and medical detail, so text is never sent "
                "unscrubbed. Deploy Presidio and set PRESIDIO_ANALYZER_URL to enable drafting."
            ),
        }

    try:
        # Presidio loads spaCy models on its first request (~20s cold, fast
        # after). A short probe reported a healthy analyzer as unreachable.
        with httpx.Client(timeout=40.0) as client:
            resp = client.post(
                f"{analyzer.rstrip('/')}/analyze",
                json={"text": "health probe", "language": "en"},
            )
        if resp.status_code >= 400:
            return {
                "ready": False,
                "detail": f"PII analyzer responded {resp.status_code}. Drafting stays blocked.",
            }
    except httpx.HTTPError as exc:
        return {
            "ready": False,
            "detail": f"PII analyzer unreachable ({exc}). Drafting stays blocked.",
        }

    return {"ready": True, "detail": ""}
