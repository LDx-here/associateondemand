"""Reversible pseudonymization — the attorney must never see a token."""

from __future__ import annotations

import app.pipelines.pseudonymize as pseudo
from app.pipelines.pseudonymize import (
    Scrubbed,
    has_unrestored_tokens,
    restore,
    scrub,
)


def _fake_analyze(spans):
    """Stand in for the Presidio analyzer with a fixed span list."""

    def _inner(text, timeout_s):  # noqa: ARG001 - signature parity
        return spans

    return _inner


def test_round_trip_restores_exactly(monkeypatch):
    text = "Aigul Viazovikova, A123-456-789, called about her hearing."
    monkeypatch.setattr(
        pseudo,
        "_presidio_analyze",
        _fake_analyze([{"entity_type": "PERSON", "start": 0, "end": 17}]),
    )

    scrubbed = scrub(text)
    assert scrubbed.ok

    # The name and the A-number are both gone from what would be transmitted.
    assert "Aigul Viazovikova" not in scrubbed.text
    assert "A123-456-789" not in scrubbed.text

    # And the round trip is byte-identical to the original.
    assert restore(scrubbed.text, scrubbed.mapping) == text
    assert not has_unrestored_tokens(restore(scrubbed.text, scrubbed.mapping))


def test_alien_number_detected_without_presidio(monkeypatch):
    """A-numbers are firm-specific; Presidio has no recognizer for them."""
    monkeypatch.setattr(pseudo, "_presidio_analyze", _fake_analyze([]))

    for raw in ("A123456789", "A 123 456 789", "a123-456-78"):
        scrubbed = scrub(f"Client file {raw} attached.")
        assert raw not in scrubbed.text, raw
        assert restore(scrubbed.text, scrubbed.mapping) == f"Client file {raw} attached."


def test_repeated_value_gets_one_stable_token(monkeypatch):
    """Two mentions of the same client must read as the same person."""
    text = "Konst called. Konst will send the estimate."
    monkeypatch.setattr(
        pseudo,
        "_presidio_analyze",
        _fake_analyze(
            [
                {"entity_type": "PERSON", "start": 0, "end": 5},
                {"entity_type": "PERSON", "start": 14, "end": 19},
            ]
        ),
    )

    scrubbed = scrub(text)
    assert len(scrubbed.mapping) == 1, "one distinct value -> one token"
    assert scrubbed.text.count("<<PERSON_1>>") == 2
    assert restore(scrubbed.text, scrubbed.mapping) == text


def test_fails_closed_when_analyzer_unreachable(monkeypatch):
    """The whole point: never transmit raw PII because a service is down."""
    monkeypatch.setattr(pseudo, "_presidio_analyze", lambda text, timeout_s: None)

    scrubbed = scrub("Aigul Viazovikova, A123-456-789")
    assert scrubbed.ok is False
    assert "refusing to send" in scrubbed.reason
    # Text is returned unchanged, but ok=False means the caller must not send it.
    assert scrubbed.mapping == {}


def test_overlapping_spans_do_not_corrupt_text(monkeypatch):
    """Presidio returns nested hits; replacing both would corrupt offsets."""
    text = "Maria Garcia lives in San Francisco"
    monkeypatch.setattr(
        pseudo,
        "_presidio_analyze",
        _fake_analyze(
            [
                {"entity_type": "PERSON", "start": 0, "end": 12},
                {"entity_type": "PERSON", "start": 6, "end": 12},  # nested
                {"entity_type": "LOCATION", "start": 22, "end": 35},
            ]
        ),
    )

    scrubbed = scrub(text)
    assert restore(scrubbed.text, scrubbed.mapping) == text
    assert "Maria Garcia" not in scrubbed.text


def test_token_10_does_not_clobber_token_1(monkeypatch):
    """PERSON_1 must not eat the prefix of PERSON_10 during restoration."""
    mapping = {f"<<PERSON_{i}>>": f"Name{i}" for i in range(1, 12)}
    scrubbed_text = " ".join(mapping)
    restored = restore(scrubbed_text, mapping)

    assert not has_unrestored_tokens(restored)
    for value in mapping.values():
        assert value in restored
    # Name1 followed by "0" would be the symptom of a prefix clobber.
    assert "Name10" in restored


def test_empty_and_whitespace_are_safe(monkeypatch):
    monkeypatch.setattr(pseudo, "_presidio_analyze", _fake_analyze([]))
    for text in ("", "   ", "\n"):
        scrubbed = scrub(text)
        assert scrubbed.ok
        assert scrubbed.text == text
        assert restore(scrubbed.text, scrubbed.mapping) == text


def test_no_pii_found_is_a_clean_pass_through(monkeypatch):
    monkeypatch.setattr(pseudo, "_presidio_analyze", _fake_analyze([]))
    text = "Review the statute and confirm the filing window."
    scrubbed = scrub(text)
    assert scrubbed.ok
    assert scrubbed.text == text
    assert scrubbed.mapping == {}


def test_has_unrestored_tokens_detects_a_leak():
    assert has_unrestored_tokens("Call <<PERSON_1>> tomorrow") is True
    assert has_unrestored_tokens("Call Maria tomorrow") is False


def test_mapping_is_not_embedded_in_transmitted_text(monkeypatch):
    """The scrubbed text must not carry the values it is meant to hide."""
    text = "Sarmila Limbu filed an I-589."
    monkeypatch.setattr(
        pseudo,
        "_presidio_analyze",
        _fake_analyze([{"entity_type": "PERSON", "start": 0, "end": 13}]),
    )
    scrubbed = scrub(text)
    for original in scrubbed.mapping.values():
        assert original not in scrubbed.text


def test_generate_text_refuses_to_send_when_analyzer_missing(monkeypatch):
    """The guard that matters: no Presidio, no transmission.

    Without this, the first working API key would ship raw client notes —
    A-numbers, immigration status, medical detail — to a third party.
    """
    import app.services.llm as llm

    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-test-key")
    monkeypatch.delenv("AOD_PSEUDONYMIZE", raising=False)
    monkeypatch.delenv("PRESIDIO_ANALYZER_URL", raising=False)

    called = {"posted": False}

    class ExplodingClient:
        def __init__(self, *a, **k):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *a):
            return False

        def post(self, *a, **k):
            called["posted"] = True
            raise AssertionError("raw client text must never reach Anthropic")

    monkeypatch.setattr(llm.httpx, "Client", ExplodingClient)

    result = llm.generate_text(
        system="You are a legal assistant.",
        user="Aigul Viazovikova, A123-456-789, asylum hearing.",
    )

    assert result is None
    assert called["posted"] is False, "no HTTP call may be attempted"


def test_generate_text_sends_scrubbed_text_and_restores_output(monkeypatch):
    """End to end: the model sees tokens, the attorney sees real names."""
    import app.pipelines.pseudonymize as pseudo
    import app.services.llm as llm

    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-test-key")
    monkeypatch.delenv("AOD_PSEUDONYMIZE", raising=False)
    monkeypatch.setattr(
        pseudo,
        "_presidio_analyze",
        lambda text, timeout_s: (
            [{"entity_type": "PERSON", "start": 0, "end": 17}]
            if text.startswith("Aigul Viazovikova")
            else []
        ),
    )

    sent = {}

    class FakeResp:
        status_code = 200
        text = ""

        def json(self):
            # The model echoes the token back, as a real one would.
            return {"content": [{"type": "text", "text": "Draft for <<PERSON_1>> is ready."}]}

    class FakeClient:
        def __init__(self, *a, **k):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *a):
            return False

        def post(self, url, headers=None, json=None):
            sent["payload"] = json
            return FakeResp()

    monkeypatch.setattr(llm.httpx, "Client", FakeClient)

    result = llm.generate_text(
        system="Assist.",
        user="Aigul Viazovikova, A123-456-789, asylum hearing.",
    )

    transmitted = str(sent["payload"])
    assert "Aigul Viazovikova" not in transmitted, "name must not be transmitted"
    assert "A123-456-789" not in transmitted, "A-number must not be transmitted"

    assert result == "Draft for Aigul Viazovikova is ready."
    assert "<<" not in result, "the attorney must never see a token"
