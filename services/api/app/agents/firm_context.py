"""Load firm rules, strategy patterns, and categorizer examples from brain vault."""

from __future__ import annotations

import json
import os
import re
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

# Topic keywords → knowledge stems (see brain/.../immigration/00-index.md).
# Higher weight = stronger preference when the haystack matches.
_FILE_KEYWORDS: dict[str, tuple[tuple[str, int], ...]] = {
    "aos-discretionary-checklist": (
        ("aos", 3),
        ("i-485", 4),
        ("i485", 4),
        ("adjustment of status", 4),
        ("discretionary", 5),
        ("discretion", 3),
        ("equit", 3),
        ("totality", 2),
    ),
    "aos-statutory-eligibility": (
        ("aos", 3),
        ("i-485", 3),
        ("adjustment of status", 4),
        ("245(a)", 5),
        ("245(i)", 5),
        ("section 245", 4),
        ("statutory", 3),
        ("eligibility", 2),
    ),
    "aos-filing-packet": (
        ("aos", 2),
        ("i-485", 3),
        ("filing packet", 5),
        ("i-693", 4),
        ("medical exam", 3),
        ("ead", 2),
        ("advance parole", 3),
    ),
    "affidavit-of-support": (
        ("affidavit of support", 5),
        ("i-864", 5),
        ("sponsor", 2),
        ("i864", 5),
    ),
    "extreme-hardship-factors": (
        ("extreme hardship", 6),
        ("hardship", 5),
        ("qualifying relative", 4),
        ("waiver", 2),
    ),
    "ina-212a-waiver": (
        ("212(a)", 4),
        ("i-601", 5),
        ("i-601a", 5),
        ("i-212", 5),
        ("waiver", 4),
        ("provisional waiver", 5),
    ),
    "inadmissibility-overview": (
        ("inadmissib", 5),
        ("deportab", 4),
        ("212 vs 237", 4),
        ("ground of inadmissibility", 5),
    ),
    "unlawful-presence-bars": (
        ("unlawful presence", 6),
        ("ulp", 3),
        ("3-year bar", 5),
        ("10-year bar", 5),
        ("212(a)(9)", 5),
        ("9(b)", 3),
        ("9(c)", 3),
    ),
    "misrepresentation-212i": (
        ("misrepresentation", 5),
        ("212(i)", 5),
        ("fraud waiver", 5),
        ("material misrepresentation", 5),
    ),
    "false-claim-usc": (
        ("false claim", 6),
        ("false claim to citizenship", 6),
        ("usc claim", 4),
        ("claim to be a citizen", 5),
    ),
    "criminal-grounds-overview": (
        ("criminal", 3),
        ("cimt", 5),
        ("crime involving moral", 5),
        ("conviction", 2),
        ("212(a)(2)", 4),
    ),
    "aggravated-felony-overview": (
        ("aggravated felony", 6),
        ("agfel", 4),
        ("101(a)(43)", 5),
    ),
    "asylum-elements": (
        ("asylum", 5),
        ("refugee", 4),
        ("nexus", 3),
        ("particular social group", 4),
        ("well-founded fear", 5),
        ("persecution", 3),
    ),
    "asylum-bars": (
        ("asylum bar", 5),
        ("asylum", 3),
        ("firm resettlement", 5),
        ("one-year", 3),
        ("1-year", 3),
        ("persecutor", 4),
    ),
    "withholding-cat": (
        ("withholding", 5),
        ("cat", 2),
        ("convention against torture", 6),
        ("torture", 3),
    ),
    "family-based-immigration": (
        ("family-based", 5),
        ("family based", 5),
        ("i-130", 5),
        ("immediate relative", 4),
        ("preference category", 4),
        ("petition", 1),
    ),
    "marriage-based-aos": (
        ("marriage", 4),
        ("bona fide", 5),
        ("i-751", 5),
        ("spouse", 2),
        ("conditional resident", 4),
    ),
    "vawa-u-t-overview": (
        ("vawa", 6),
        ("u visa", 5),
        ("t visa", 5),
        ("u-visa", 5),
        ("t-visa", 5),
        ("humanitarian", 2),
    ),
    "procedural-posture-removal": (
        ("removal", 3),
        ("nta", 4),
        ("eoir", 4),
        ("immigration court", 4),
        ("reinstatement", 4),
        ("master calendar", 3),
        ("individual hearing", 3),
    ),
    "cancellation-of-removal": (
        ("cancellation", 5),
        ("240a", 5),
        ("240a(b)", 5),
        ("non-lpr cancellation", 5),
        ("lpr cancellation", 5),
    ),
}

# Always prefer these when the topic is active (even if keyword hit is light).
_CORE_BY_TOPIC: dict[str, tuple[str, ...]] = {
    "aos": ("aos-discretionary-checklist", "aos-statutory-eligibility"),
    "waiver": ("extreme-hardship-factors", "ina-212a-waiver", "unlawful-presence-bars"),
    "asylum": ("asylum-elements", "asylum-bars"),
    "removal": ("procedural-posture-removal", "cancellation-of-removal"),
    "criminal": ("criminal-grounds-overview", "aggravated-felony-overview"),
}

# Fallback when no signals match (RMV high-frequency AOS work).
_DEFAULT_CORE: tuple[str, ...] = (
    "aos-discretionary-checklist",
    "aos-statutory-eligibility",
    "inadmissibility-overview",
)

_META_NAMES = frozenset({"readme.md", "00-index.md"})


def _is_meta_knowledge_file(name: str) -> bool:
    name_l = name.lower()
    return name_l in _META_NAMES or name_l.startswith("_") or name_l.startswith(".")


def _haystack(*, case_type: str = "", deliverable: str = "", query_text: str = "") -> str:
    return " ".join(part for part in (case_type, deliverable, query_text) if part).lower()


def _active_topics(haystack: str) -> set[str]:
    topics: set[str] = set()
    if any(
        tok in haystack
        for tok in (
            "aos",
            "i-485",
            "i485",
            "adjustment of status",
            "discretionary",
            "discretion",
        )
    ):
        topics.add("aos")
    if any(
        tok in haystack
        for tok in ("waiver", "hardship", "i-601", "i-601a", "i-212", "212(a)", "ulp")
    ):
        topics.add("waiver")
    if any(tok in haystack for tok in ("asylum", "refugee", "withholding", "convention against torture")):
        topics.add("asylum")
    if any(
        tok in haystack
        for tok in ("removal", "nta", "eoir", "immigration court", "cancellation")
    ):
        topics.add("removal")
    if any(tok in haystack for tok in ("criminal", "cimt", "aggravated felony", "conviction")):
        topics.add("criminal")
    # Deliverable SKUs like aos-discretionary-brief
    if re.search(r"\baos[-_]", haystack) or "aos_discretionary" in haystack:
        topics.add("aos")
    return topics


def score_immigration_knowledge_file(stem: str, haystack: str) -> int:
    """Return relevance score for a knowledge file stem against topic text."""

    if not haystack:
        return 0
    score = 0
    for keyword, weight in _FILE_KEYWORDS.get(stem, ()):
        if keyword in haystack:
            score += weight
    # Light stem-token boost (e.g. "hardship" in extreme-hardship-factors).
    for token in stem.replace("-", " ").split():
        if len(token) >= 4 and token in haystack:
            score += 1
    return score


def select_immigration_knowledge_files(
    *,
    case_type: str = "",
    deliverable: str = "",
    query_text: str = "",
    max_files: int = 8,
    knowledge_dir: Path | None = None,
) -> list[Path]:
    """Pick topic-relevant immigration .md files (not alphabetical first-N)."""

    root = knowledge_dir or IMMIGRATION_KNOWLEDGE_DIR
    if not root.is_dir():
        return []

    candidates = [
        p for p in root.glob("*.md") if p.is_file() and not _is_meta_knowledge_file(p.name)
    ]
    if not candidates:
        return []

    haystack = _haystack(case_type=case_type, deliverable=deliverable, query_text=query_text)
    topics = _active_topics(haystack)
    scores: dict[str, int] = {}
    by_stem = {p.stem: p for p in candidates}

    for path in candidates:
        scores[path.stem] = score_immigration_knowledge_file(path.stem, haystack)

    for topic in topics:
        for stem in _CORE_BY_TOPIC.get(topic, ()):
            if stem in by_stem:
                scores[stem] = max(scores.get(stem, 0), 0) + 8

    ranked = sorted(
        ((stem, sc) for stem, sc in scores.items() if sc > 0 and stem in by_stem),
        key=lambda item: (-item[1], item[0]),
    )
    if not ranked:
        # No signals — prefer a small high-frequency core over alphabetical dump.
        ordered = [by_stem[s] for s in _DEFAULT_CORE if s in by_stem]
        if len(ordered) < max_files:
            extras = sorted(p for p in candidates if p not in ordered)
            ordered.extend(extras[: max(0, max_files - len(ordered))])
        return ordered[:max_files]

    return [by_stem[stem] for stem, _ in ranked[:max_files]]


def load_firm_rules(max_chars: int = 8000) -> str:
    if not FIRM_RULES_PATH.exists():
        return ""
    return FIRM_RULES_PATH.read_text(encoding="utf-8", errors="replace")[:max_chars]


def load_firm_knowledge_excerpts(
    *,
    max_chars: int = 6000,
    max_files: int = 8,
    case_type: str = "",
    deliverable: str = "",
    query_text: str = "",
) -> str:
    """Load curated markdown excerpts from brain/03_Firm_Knowledge/immigration/.

    Selects by matter case type / deliverable SKU / keyword signals when provided.
    Whole PDFs are not ingested — drop short .md checklists/summaries only.
    Skips README / 00-index / _PROPOSAL* / _source. Returns empty when missing.
    """

    paths = select_immigration_knowledge_files(
        case_type=case_type,
        deliverable=deliverable,
        query_text=query_text,
        max_files=max_files,
    )
    if not paths:
        return ""

    chunks: list[str] = []
    used = 0
    for path in paths:
        if used >= max_chars:
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
