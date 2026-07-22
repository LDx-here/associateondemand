"""Load firm rules, strategy patterns, and categorizer examples from brain vault."""

from __future__ import annotations

import json
import os
from pathlib import Path

def _resolve_brain_root() -> Path:
    if env := os.getenv("AOD_BRAIN_ROOT"):
        return Path(env)
    return Path(__file__).resolve().parents[4] / "brain"


_BRAIN_ROOT = _resolve_brain_root()

FIRM_RULES_PATH = _BRAIN_ROOT / "03_Firm_Knowledge" / "firm-rules.md"
STRATEGY_PATTERNS_PATH = _BRAIN_ROOT / "03_Firm_Knowledge" / "strategy-patterns.md"
CATEGORIZER_EXAMPLES_PATH = _BRAIN_ROOT / "03_Firm_Knowledge" / "categorizer-examples.jsonl"
IMMIGRATION_KNOWLEDGE_DIR = _BRAIN_ROOT / "03_Firm_Knowledge" / "immigration"


def load_firm_rules(max_chars: int = 8000) -> str:
    if not FIRM_RULES_PATH.exists():
        return ""
    return FIRM_RULES_PATH.read_text(encoding="utf-8", errors="replace")[:max_chars]


def load_firm_knowledge_excerpts(*, max_chars: int = 6000, max_files: int = 8) -> str:
    """Load curated markdown excerpts from brain/03_Firm_Knowledge/immigration/.

    Whole PDFs are not ingested — drop short .md checklists/summaries only.
    Skips README.md. Returns empty string when the folder is missing or empty.
    """

    if not IMMIGRATION_KNOWLEDGE_DIR.is_dir():
        return ""
    chunks: list[str] = []
    used = 0
    paths = sorted(IMMIGRATION_KNOWLEDGE_DIR.glob("*.md"))
    for path in paths:
        name_l = path.name.lower()
        # Skip index/meta docs — they are for humans/Cursor, not prompt injection.
        if name_l in {"readme.md", "00-index.md"} or name_l.startswith("_"):
            continue
        if len(chunks) >= max_files or used >= max_chars:
            break
        try:
            text = path.read_text(encoding="utf-8", errors="replace").strip()
        except OSError:
            continue
        if not text:
            continue
        remaining = max_chars - used
        body = text[:remaining]
        chunk = f"### {path.stem}\n{body}"
        chunks.append(chunk)
        used += len(chunk)
    if not chunks:
        return ""
    return "## Firm knowledge excerpts (immigration)\n" + "\n\n".join(chunks)


def load_strategy_patterns(max_chars: int = 8000) -> str:
    if not STRATEGY_PATTERNS_PATH.exists():
        return ""
    return STRATEGY_PATTERNS_PATH.read_text(encoding="utf-8", errors="replace")[:max_chars]


def load_categorizer_examples(limit: int = 50) -> list[dict]:
    if not CATEGORIZER_EXAMPLES_PATH.exists():
        return []
    rows: list[dict] = []
    for line in CATEGORIZER_EXAMPLES_PATH.read_text(encoding="utf-8", errors="replace").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            rows.append(json.loads(line))
        except json.JSONDecodeError:
            continue
        if len(rows) >= limit:
            break
    return rows


def append_firm_rule(rule: str) -> None:
    FIRM_RULES_PATH.parent.mkdir(parents=True, exist_ok=True)
    with FIRM_RULES_PATH.open("a", encoding="utf-8") as fh:
        fh.write(f"\n- {rule.strip()}\n")


def append_strategy_pattern(entry: dict) -> None:
    STRATEGY_PATTERNS_PATH.parent.mkdir(parents=True, exist_ok=True)
    header = entry.get("pattern_id") or entry.get("matter_id") or "correction"
    line = (
        f"\n### {header} ({entry.get('category', 'analytical')})\n"
        f"- Fact pattern: {entry.get('fact_pattern', 'n/a')}\n"
        f"- Strategy used: {entry.get('strategy_used', 'n/a')}\n"
        f"- Outcome / correction: {entry.get('outcome', entry.get('attorney_correction', 'n/a'))}\n"
    )
    with STRATEGY_PATTERNS_PATH.open("a", encoding="utf-8") as fh:
        fh.write(line)


def append_categorizer_example(example: dict) -> None:
    CATEGORIZER_EXAMPLES_PATH.parent.mkdir(parents=True, exist_ok=True)
    with CATEGORIZER_EXAMPLES_PATH.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(example, ensure_ascii=False) + "\n")
