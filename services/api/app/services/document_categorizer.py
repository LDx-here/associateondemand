"""Document categorizer stub for Strong Reader pipeline."""

from __future__ import annotations

from pathlib import Path
from typing import Any


def categorize(filename: str, content_preview: str = "") -> dict[str, Any]:
    lower = filename.lower()
    if any(k in lower for k in ("passport", "visa", "i-94")):
        category = "identity_travel"
    elif any(k in lower for k in ("court", "order", "notice")):
        category = "court_filing"
    elif any(k in lower for k in ("medical", "psych", "hospital")):
        category = "medical"
    else:
        category = "general_correspondence"

    return {
        "category": category,
        "confidence": 0.6,
        "preview_chars": len(content_preview),
        "facts_stub": [],
    }


def load_training_examples() -> list[dict[str, Any]]:
    path = Path(__file__).resolve().parents[4] / "brain" / "03_Firm_Knowledge" / "categorizer-examples.jsonl"
    if not path.exists():
        return []
    rows: list[dict[str, Any]] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            import json

            rows.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    return rows
