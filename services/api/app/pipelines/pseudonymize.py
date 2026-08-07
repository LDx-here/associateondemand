"""Reversible pseudonymization for text that leaves the firm boundary.

The attorney's requirement, stated directly: anonymization must be *completely*
handled and the result brought back "as though it wasn't" — she must never see
a placeholder token or have to decode anything.

That rules out the existing `pipelines.pii_pipeline.anonymize_text`, which is
one-way: it replaces PII and discards the mapping, so the real values can never
be restored. Running client notes through it would hand her `<PERSON_1>` in her
own case file.

This module keeps the mapping for the life of a single request:

    scrub   -> replace each detected entity with a stable token
    (send the scrubbed text to the model)
    restore -> put the real values back before anything is shown or stored

Design constraints:

* The mapping is returned to the caller and never persisted, logged, or sent
  anywhere. It lives in memory for one request and is discarded.
* Tokens are chosen to survive a model round-trip intact and to be
  unambiguous to split on.
* Detection failures fail **closed** — the caller is told scrubbing did not
  happen so it can refuse to send, rather than silently transmitting raw PII.
  A silent fallback is what let this system run in template mode for weeks;
  the same mistake with client data would be far worse.
"""

from __future__ import annotations

import logging
import os
import re
from dataclasses import dataclass, field
from typing import Any

import httpx

LOGGER = logging.getLogger(__name__)

# Entity types worth scrubbing for an immigration / personal-injury practice.
# A-numbers and case numbers are the firm's own high-risk identifiers and are
# detected locally because Presidio has no recognizer for them.
DEFAULT_ENTITIES = [
    "PERSON",
    "EMAIL_ADDRESS",
    "PHONE_NUMBER",
    "US_SSN",
    "LOCATION",
    "DATE_TIME",
    "CREDIT_CARD",
    "US_DRIVER_LICENSE",
    "US_PASSPORT",
    "MEDICAL_LICENSE",
    "IBAN_CODE",
]

# Local recognizers for identifiers Presidio does not know about.
# A-number: A followed by 8 or 9 digits, optionally hyphenated.
_LOCAL_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("ALIEN_NUMBER", re.compile(r"\bA[-\s]?\d{3}[-\s]?\d{3}[-\s]?\d{2,3}\b", re.IGNORECASE)),
]


def _token(entity_type: str, index: int) -> str:
    """A token the model will echo back unchanged.

    Double angle brackets are rare in legal prose, contain no characters a
    tokenizer tends to split awkwardly, and are trivially greppable if one
    ever escapes to the UI.
    """
    return f"<<{entity_type}_{index}>>"


@dataclass
class Scrubbed:
    """Result of scrubbing. `mapping` never leaves the process."""

    text: str
    mapping: dict[str, str] = field(default_factory=dict)
    ok: bool = True
    reason: str = ""

    @property
    def entity_count(self) -> int:
        return len(self.mapping)


def _presidio_analyze(text: str, timeout_s: float) -> list[dict[str, Any]] | None:
    analyzer = os.getenv("PRESIDIO_ANALYZER_URL", "").strip()
    if not analyzer:
        return None
    try:
        with httpx.Client(timeout=timeout_s) as client:
            resp = client.post(
                f"{analyzer.rstrip('/')}/analyze",
                json={"text": text, "language": "en", "entities": DEFAULT_ENTITIES},
            )
        if resp.status_code >= 400:
            LOGGER.error("Presidio analyze failed: %s %s", resp.status_code, resp.text[:200])
            return None
        return list(resp.json())
    except httpx.HTTPError as exc:
        LOGGER.error("Presidio unreachable: %s", exc)
        return None


def _local_spans(text: str) -> list[dict[str, Any]]:
    spans: list[dict[str, Any]] = []
    for entity_type, pattern in _LOCAL_PATTERNS:
        for m in pattern.finditer(text):
            spans.append({"entity_type": entity_type, "start": m.start(), "end": m.end()})
    return spans


def _merge_spans(spans: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Drop overlaps, keeping the longest match at each position.

    Presidio frequently returns nested hits (PERSON inside LOCATION, say);
    replacing both would corrupt offsets.
    """
    ordered = sorted(spans, key=lambda s: (s["start"], -(s["end"] - s["start"])))
    kept: list[dict[str, Any]] = []
    last_end = -1
    for span in ordered:
        if span["start"] >= last_end:
            kept.append(span)
            last_end = span["end"]
    return kept


def scrub(text: str, *, timeout_s: float = 40.0, require_presidio: bool = True) -> Scrubbed:
    """Replace PII with stable tokens, returning the mapping needed to restore.

    `require_presidio=True` fails closed when the analyzer is unreachable: the
    caller gets ok=False and must not transmit the text. Local patterns alone
    are not sufficient coverage to claim the text was scrubbed.
    """
    if not text.strip():
        return Scrubbed(text=text, mapping={}, ok=True)

    presidio_spans = _presidio_analyze(text, timeout_s)

    if presidio_spans is None and require_presidio:
        return Scrubbed(
            text=text,
            mapping={},
            ok=False,
            reason=(
                "PII analyzer unavailable — refusing to send text outside the firm boundary. "
                "Set PRESIDIO_ANALYZER_URL and ensure the sidecar is healthy."
            ),
        )

    spans = _merge_spans(list(presidio_spans or []) + _local_spans(text))

    mapping: dict[str, str] = {}
    counters: dict[str, int] = {}
    # Reuse one token per distinct value so the model sees a consistent
    # referent — two mentions of the same client are the same person.
    value_to_token: dict[tuple[str, str], str] = {}

    out: list[str] = []
    cursor = 0
    for span in spans:
        start, end, entity_type = span["start"], span["end"], span["entity_type"]
        original = text[start:end]
        key = (entity_type, original)

        token = value_to_token.get(key)
        if token is None:
            counters[entity_type] = counters.get(entity_type, 0) + 1
            token = _token(entity_type, counters[entity_type])
            value_to_token[key] = token
            mapping[token] = original

        out.append(text[cursor:start])
        out.append(token)
        cursor = end

    out.append(text[cursor:])
    return Scrubbed(text="".join(out), mapping=mapping, ok=True)


def restore(text: str, mapping: dict[str, str]) -> str:
    """Put the real values back. The attorney never sees a token."""
    if not mapping or not text:
        return text
    # Longest token first so PERSON_1 cannot clobber part of PERSON_10.
    for token in sorted(mapping, key=len, reverse=True):
        text = text.replace(token, mapping[token])
    return text


def has_unrestored_tokens(text: str) -> bool:
    """True when any token survived restoration.

    A leaked token is a visible bug for the attorney, so callers assert on
    this rather than trusting the replacement loop.
    """
    return bool(re.search(r"<<[A-Z_]+_\d+>>", text))
