"""DOCX → blocks → sections (Parser Pipeline Part 3)."""

from __future__ import annotations

from pathlib import Path
from typing import Any, BinaryIO


def map_style_to_type(style_name: str, text: str) -> str:
    style_lower = (style_name or "").lower()
    if any(s in style_lower for s in ["heading 1", "heading1", "title"]):
        return "heading1"
    if any(s in style_lower for s in ["heading 2", "heading2"]):
        return "heading2"
    if any(s in style_lower for s in ["heading 3", "heading3"]):
        return "heading3"
    if "footnote" in style_lower:
        return "footnote"
    # ALL CAPS heuristics when style is Normal
    stripped = (text or "").strip()
    if (
        stripped.isupper()
        and len(stripped) < 120
        and stripped.startswith(("I.", "II.", "III.", "IV.", "V.", "A.", "B.", "C.", "D.", "E."))
    ):
        return "heading2"
    return "paragraph"


def parse_docx_to_blocks(docx_path: str | Path | BinaryIO) -> list[dict[str, Any]]:
    """
    Parse a .docx into blocks:
      {type: heading1|heading2|heading3|paragraph|footnote, text, style}
    """
    from docx import Document  # type: ignore[import-not-found]

    doc = Document(docx_path)
    blocks: list[dict[str, Any]] = []

    for para in doc.paragraphs:
        text = (para.text or "").strip()
        if not text:
            continue
        style_name = para.style.name if para.style else "Normal"
        blocks.append(
            {
                "type": map_style_to_type(style_name, text),
                "text": text,
                "style": style_name,
            }
        )

    # Footnotes when available (python-docx versions vary)
    try:
        footnotes_part = getattr(doc.part, "footnotes", None)
        if footnotes_part is not None:
            values = getattr(footnotes_part, "values", None)
            iterable = values() if callable(values) else (footnotes_part or [])
            for footnote in iterable:
                for para in getattr(footnote, "paragraphs", []) or []:
                    text = (para.text or "").strip()
                    if text:
                        blocks.append({"type": "footnote", "text": text, "style": "Footnote"})
    except Exception:
        pass

    return blocks


def group_blocks_into_sections(blocks: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Group blocks into sections keyed by headings."""
    sections: list[dict[str, Any]] = []
    current: dict[str, Any] | None = None

    for block in blocks:
        btype = block.get("type")
        if btype in ("heading1", "heading2", "heading3"):
            if current:
                sections.append(current)
            level = int(str(btype)[-1])
            current = {
                "heading": block.get("text") or "",
                "level": level,
                "paragraphs": [],
                "raw_blocks": [],
            }
        elif current is not None:
            current["paragraphs"].append(block.get("text") or "")
            current["raw_blocks"].append(block)
        else:
            sections.append(
                {
                    "heading": "__COVER__",
                    "level": 0,
                    "paragraphs": [block.get("text") or ""],
                    "raw_blocks": [block],
                }
            )

    if current:
        sections.append(current)
    return sections
