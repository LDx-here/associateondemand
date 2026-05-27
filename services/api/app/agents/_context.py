"""Load constitution markdown for agent system prompts."""

from __future__ import annotations

import os
from pathlib import Path

_SKILL_MARKER = "04-Research-Memo-SKILL.md"
_DOCKER_CONSTITUTION = Path("/app/docs/constitution")


def _resolve_constitution_dir() -> Path:
    env = os.environ.get("AOD_CONSTITUTION_DIR")
    if env:
        return Path(env).resolve()

    if _DOCKER_CONSTITUTION.is_dir():
        return _DOCKER_CONSTITUTION

    here = Path(__file__).resolve()
    for parent in here.parents:
        candidate = parent / "docs" / "constitution"
        if (candidate / _SKILL_MARKER).is_file():
            return candidate

    if len(here.parents) > 3:
        local = here.parents[3] / "docs" / "constitution"
        if local.is_dir():
            return local

    return _DOCKER_CONSTITUTION


_CONSTITUTION_DIR = _resolve_constitution_dir()


def load_constitution(max_chars_per_file: int = 12_000) -> str:
    """Return concatenated constitution markdown (truncated per file for token safety)."""

    chunks: list[str] = []
    if not _CONSTITUTION_DIR.exists():
        return "Constitution directory missing."

    for path in sorted(_CONSTITUTION_DIR.rglob("*.md")):
        if path.name == "README.md":
            continue
        text = path.read_text(encoding="utf-8", errors="replace")[:max_chars_per_file]
        chunks.append(f"## {path.relative_to(_CONSTITUTION_DIR)}\n{text}")

    return "\n\n".join(chunks)
