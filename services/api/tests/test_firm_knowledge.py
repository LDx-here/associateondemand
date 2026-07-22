"""Firm knowledge excerpts + Firm Memory matter-context injection."""

from __future__ import annotations

from app.agents.firm_context import load_firm_knowledge_excerpts
from app.services.matter_context import format_firm_memory_block, format_matter_context


def test_load_firm_knowledge_excerpts_includes_aos_checklist() -> None:
    text = load_firm_knowledge_excerpts(max_chars=6000)
    assert "Firm knowledge excerpts" in text
    assert "discretionary" in text.lower() or "I-485" in text
    assert "README" not in text


def test_format_firm_memory_block_empty_without_airtable(monkeypatch) -> None:
    monkeypatch.setattr("app.services.matter_context.at.is_configured", lambda: False)
    assert format_firm_memory_block() == ""


def test_format_firm_memory_block_renders_patterns(monkeypatch) -> None:
    monkeypatch.setattr("app.services.matter_context.at.is_configured", lambda: True)
    monkeypatch.setattr(
        "app.services.matter_context.at.list_firm_memory_patterns",
        lambda max_records=8: [
            {
                "strategy_used": "Cover letter",
                "outcome": "Tone: Formal\nAlways use RMV caption block.",
            }
        ],
    )
    text = format_firm_memory_block()
    assert "Firm Memory" in text
    assert "Cover letter" in text
    assert "RMV caption" in text


def test_format_matter_context_injects_knowledge_when_no_matter(monkeypatch) -> None:
    monkeypatch.setattr("app.services.matter_context.format_firm_memory_block", lambda: "")
    text = format_matter_context(None)
    assert "No live matter row" in text
    assert "Firm knowledge excerpts" in text or "discretionary" in text.lower()
