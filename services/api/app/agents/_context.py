"""Load constitution markdown for agent system prompts."""

from __future__ import annotations

import os
from pathlib import Path

_DEFAULT = Path(__file__).resolve().parents[4] / "docs" / "constitution"
_CONSTITUTION_DIR = Path(os.getenv("AOD_CONSTITUTION_DIR", str(_DEFAULT)))


def load_constitution(max_chars_per_file: int = 12_000) -> str:
    """Return concatenated constitution text (truncated per file for token safety)."""

    chunks: list[str] = []
    if not _CONSTITUTION_DIR.exists():
        return "Constitution directory missing."

    for path in sorted(_CONSTITUTION_DIR.rglob("*.md")):
        if path.name == "README.md":
            continue
        text = path.read_text(encoding="utf-8", errors="replace")[:max_chars_per_file]
        chunks.append(f"## {path.relative_to(_CONSTITUTION_DIR)}\n{text}")

    return "\n\n".join(chunks)
