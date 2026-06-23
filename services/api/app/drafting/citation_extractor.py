"""Extract legal citations from draft text and match to verified source library."""

from __future__ import annotations

import re
from typing import Any

from app.drafting.aos_verified_sources import VERIFIED_AOS_SOURCES

_CITATION_PATTERNS = [
    re.compile(r"Matter of [A-Za-z\-]+,?\s*\d+\s*I&N Dec\.?\s*\d+", re.I),
    re.compile(r"\d+\s*I&N Dec\.?\s*\d+", re.I),
    re.compile(r"INA\s*§\s*\d+[A-Za-z()]*(?:\([a-z0-9]+\))?", re.I),
    re.compile(r"8\s*U\.S\.C\.?\s*§\s*\d+", re.I),
    re.compile(r"8\s*C\.F\.R\.?\s*§\s*[\d.]+", re.I),
    re.compile(r"PM-602-\d+", re.I),
    re.compile(r"1\s*USCIS-PM\s*E\.8", re.I),
    re.compile(r"7\s*USCIS-PM\s*A\.10", re.I),
    re.compile(r"Patel v\. Garland,?\s*596\s*U\.S\.?\s*\d+", re.I),
]


def extract_citation_strings(text: str) -> list[str]:
    found: list[str] = []
    seen: set[str] = set()
    for pattern in _CITATION_PATTERNS:
        for match in pattern.finditer(text or ""):
            s = match.group(0).strip()
            key = s.lower()
            if key not in seen:
                seen.add(key)
                found.append(s)
    return found


def _match_source(citation: str, proposition: str = "") -> dict[str, Any] | None:
    blob = f"{citation} {proposition}".lower()
    for src in VERIFIED_AOS_SOURCES:
        if any(m in blob for m in src.get("match", [])):
            return dict(src)
    return None


def resolve_sources_for_draft(text: str) -> list[dict[str, Any]]:
    """Return source dicts (verified + verification-needed) for citations in *text*."""

    cites = extract_citation_strings(text)
    resolved: list[dict[str, Any]] = []
    used_files: set[str] = set()

    for cite in cites:
        src = _match_source(cite)
        if not src:
            fname = f"REF_UNVERIFIED_{len(resolved) + 1:02d}.pdf"
            src = {
                "filename": fname,
                "title": cite,
                "citation": cite,
                "url": "",
                "proposition": "Cited in draft — attorney must verify source and proposition.",
                "verified": False,
                "instructions": [
                    "Locate the source in a public database (DOJ, USCIS, ecfr.gov, govinfo.gov).",
                    "Confirm the proposition matches the cited language.",
                    "Download PDF and attach to case file.",
                ],
            }
        if src["filename"] in used_files:
            continue
        used_files.add(src["filename"])
        entry = dict(src)
        entry.setdefault("verified", True)
        entry["cited_as"] = cite
        resolved.append(entry)

    # Always include core AOS authorities when drafting an AOS brief with few cites
    if len(resolved) < 3:
        for src in VERIFIED_AOS_SOURCES[:6]:
            if src["filename"] not in used_files:
                used_files.add(src["filename"])
                resolved.append({**src, "verified": src.get("verified", True), "cited_as": src["citation"]})

    return resolved
