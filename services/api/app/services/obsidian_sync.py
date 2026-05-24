"""Obsidian vault sync stub — writes YAML-frontmatter markdown under brain/."""

from __future__ import annotations

import os
from datetime import datetime, timezone
from pathlib import Path


def vault_root() -> Path:
    env = os.getenv("AOD_BRAIN_ROOT")
    if env:
        return Path(env)
    return Path(__file__).resolve().parents[4] / "brain"


def write_case_note(matter_id: str, title: str, body: str, tags: list[str] | None = None) -> Path:
    """Persist a markdown note with YAML frontmatter (local dev / mounted volume)."""

    root = vault_root()
    case_dir = root / "01_Cases" / matter_id.replace("/", "-")
    case_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    path = case_dir / f"{stamp}-{title[:40].replace(' ', '-')}.md"
    tag_line = ", ".join(tags or ["intake", "auto-sync"])
    content = f"""---
matter_id: "{matter_id}"
created: "{datetime.now(timezone.utc).isoformat()}"
tags: [{tag_line}]
---

# {title}

{body}
"""
    path.write_text(content, encoding="utf-8")
    return path
