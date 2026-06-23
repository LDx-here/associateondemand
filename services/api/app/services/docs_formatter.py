"""Memo / research output formatting — MEMORANDUM header per constitution."""

from __future__ import annotations

from datetime import datetime, timezone


def _format_date(dt: datetime | None = None) -> str:
    dt = dt or datetime.now(timezone.utc)
    return dt.strftime("%B %d, %Y")


def format_memorandum_header(
    *,
    re_line: str,
    to: str = "La'Dajia Ferguson, Esq.",
    from_line: str = "Litigation Associate",
    date: datetime | None = None,
) -> str:
    """Return constitution-style MEMORANDUM header block."""

    return "\n".join(
        [
            "**MEMORANDUM**",
            "",
            f"TO:          {to}",
            "",
            f"FROM:     {from_line}",
            "",
            f"DATE:      {_format_date(date)}",
            "",
            f"RE:          {re_line}",
            "",
        ]
    )


def format_research_memo(
    title: str,
    sections: dict[str, str],
    matter_id: str | None = None,
    *,
    re_line: str | None = None,
) -> str:
    """Return markdown suitable for Obsidian export or attorney review."""

    re_subject = re_line or title
    if matter_id:
        re_subject = f"{re_subject} — Matter {matter_id}"

    lines = [format_memorandum_header(re_line=re_subject), f"**{title}**", ""]
    for heading, body in sections.items():
        lines.extend([f"**{heading}**", "", body.strip(), ""])
    lines.extend(
        [
            "---",
            "*Attorney review required before filing or client communication.*",
        ]
    )
    return "\n".join(lines)


def format_strategy_memo(
    matter_id: str,
    posture: str,
    sections: dict[str, str],
) -> str:
    """Structured strategy memo following Master Blueprint sections."""

    title = f"Strategy Memo — {matter_id}"
    body_sections = {
        "I. Procedural Posture": posture or "Unknown — confirm before filing.",
        **sections,
    }
    return format_research_memo(
        title=title,
        sections=body_sections,
        matter_id=matter_id,
        re_line=f"Strategy Analysis — {matter_id}",
    )
