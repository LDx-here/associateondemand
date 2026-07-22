"""Firm knowledge excerpts + Firm Memory matter-context injection."""

from __future__ import annotations

from pathlib import Path

from app.agents.firm_context import (
    load_firm_knowledge_excerpts,
    select_immigration_knowledge_files,
)
from app.services.matter_context import format_firm_memory_block, format_matter_context


def test_load_firm_knowledge_excerpts_includes_aos_checklist() -> None:
    text = load_firm_knowledge_excerpts(max_chars=6000)
    assert "Firm knowledge excerpts" in text
    assert "discretionary" in text.lower() or "I-485" in text
    # Meta files must not be injected as sections (body may cross-link to 00-index).
    assert "### README" not in text
    assert "### 00-index" not in text
    assert "### _PROPOSAL" not in text


def test_select_skips_meta_files(tmp_path: Path) -> None:
    (tmp_path / "aos-discretionary-checklist.md").write_text("AOS core", encoding="utf-8")
    (tmp_path / "00-index.md").write_text("index", encoding="utf-8")
    (tmp_path / "_PROPOSAL-legal-element-templates.md").write_text("proposal", encoding="utf-8")
    (tmp_path / "README.md").write_text("readme", encoding="utf-8")
    picked = select_immigration_knowledge_files(
        case_type="AOS",
        deliverable="aos-discretionary-brief",
        knowledge_dir=tmp_path,
    )
    names = {p.name for p in picked}
    assert "aos-discretionary-checklist.md" in names
    assert "00-index.md" not in names
    assert "_PROPOSAL-legal-element-templates.md" not in names
    assert "README.md" not in names


def test_select_aos_discretionary_prefers_core_and_related(tmp_path: Path) -> None:
    for name in (
        "aos-discretionary-checklist.md",
        "aos-statutory-eligibility.md",
        "extreme-hardship-factors.md",
        "asylum-elements.md",
        "cancellation-of-removal.md",
        "affidavit-of-support.md",
        "family-based-immigration.md",
        "false-claim-usc.md",
        "aggravated-felony-overview.md",
    ):
        (tmp_path / name).write_text(name, encoding="utf-8")

    picked = select_immigration_knowledge_files(
        case_type="Adjustment of Status — discretionary",
        deliverable="aos-discretionary-brief",
        query_text="I-485 equities totality of the circumstances",
        max_files=8,
        knowledge_dir=tmp_path,
    )
    stems = [p.stem for p in picked]
    assert "aos-discretionary-checklist" in stems
    assert "aos-statutory-eligibility" in stems
    # Unrelated topics should not displace AOS core for this matter.
    assert "asylum-elements" not in stems
    assert "cancellation-of-removal" not in stems
    assert len(picked) <= 8


def test_select_waiver_hardship_matter(tmp_path: Path) -> None:
    for name in (
        "aos-discretionary-checklist.md",
        "extreme-hardship-factors.md",
        "ina-212a-waiver.md",
        "unlawful-presence-bars.md",
        "asylum-elements.md",
        "aos-filing-packet.md",
    ):
        (tmp_path / name).write_text(name, encoding="utf-8")

    picked = select_immigration_knowledge_files(
        case_type="I-601A provisional waiver",
        query_text="extreme hardship to USC spouse unlawful presence 3-year bar",
        max_files=5,
        knowledge_dir=tmp_path,
    )
    stems = set(p.stem for p in picked)
    assert "extreme-hardship-factors" in stems
    assert "ina-212a-waiver" in stems
    assert "unlawful-presence-bars" in stems


def test_select_respects_max_files(tmp_path: Path) -> None:
    for name in (
        "aos-discretionary-checklist.md",
        "aos-statutory-eligibility.md",
        "aos-filing-packet.md",
        "extreme-hardship-factors.md",
        "ina-212a-waiver.md",
        "marriage-based-aos.md",
    ):
        (tmp_path / name).write_text(name, encoding="utf-8")
    picked = select_immigration_knowledge_files(
        case_type="AOS waiver hardship marriage",
        deliverable="aos-discretionary-brief",
        query_text="I-485 extreme hardship I-601 spouse bona fide",
        max_files=3,
        knowledge_dir=tmp_path,
    )
    assert len(picked) == 3
    assert all(p.suffix == ".md" for p in picked)


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


def test_format_matter_context_passes_case_type(monkeypatch) -> None:
    captured: dict[str, str] = {}

    def fake_load(*, max_chars=4000, case_type="", deliverable="", query_text="", max_files=8):
        captured["case_type"] = case_type
        captured["query_text"] = query_text
        return "## Firm knowledge excerpts (immigration)\n### aos-discretionary-checklist\nok"

    monkeypatch.setattr("app.services.matter_context.format_firm_memory_block", lambda: "")
    monkeypatch.setattr("app.services.matter_context.fetch_drafting_facts", lambda _c: None)
    monkeypatch.setattr("app.services.matter_context.fetch_latest_assessment_document", lambda _c: None)
    monkeypatch.setattr("app.services.matter_context.fetch_attorney_instructions", lambda _c: [])
    monkeypatch.setattr("app.services.matter_context.fetch_research_notes", lambda _c: [])
    monkeypatch.setattr("app.agents.firm_context.load_firm_knowledge_excerpts", fake_load)

    text = format_matter_context(
        {
            "matter_id": "AOD-1001",
            "case_type": "AOS discretionary",
            "summary": "I-485 equities brief",
        },
        matter_code="AOD-1001",
    )
    assert "Firm knowledge excerpts" in text
    assert captured["case_type"] == "AOS discretionary"
    assert "I-485" in captured["query_text"] or "equities" in captured["query_text"]
