"""Deterministic classification rules (Parser Pipeline Part 4)."""

from __future__ import annotations

import re
from typing import Any

PRESERVE_HEADING_PATTERNS = [
    r"legal standard",
    r"statutory (framework|basis|authority)",
    r"discretionary (standard|analysis|framework)",
    r"standard of (review|discretion)",
    r"applicable (law|legal standard)",
    r"congress created adjustment",
    r"adjustment of status.*permit",
    r"uscis policy",
    r"policy (manual|memorandum|framework)",
]

FILL_HEADING_PATTERNS = [
    r"statutory eligibility",
    r"argument",
    r"favorable.*discretion",
    r"family ties",
    r"humanitarian",
    r"moral character",
    r"community",
    r"employment",
    r"adverse",
    r"negative",
    r"balancing",
    r"equit",
    r"circumstance",
]

CAPTION_HEADING_PATTERNS = [
    r"^in (the )?re\b",
    r"^(in support of|memorandum)",
    r"^(re:|subject:)",
    r"^cover",
    r"^__cover__",
]

BOILERPLATE_HEADING_PATTERNS = [
    r"certificate of service",
    r"signature",
    r"respectfully submitted",
    r"counsel of record",
    r"conclusion",
]

PRESERVE_PARAGRAPH_SIGNALS = [
    r"\d+\s+I&N Dec\.\s+\d+",
    r"Matter of [A-Z][a-z]+",
    r"INA\s*§\s*\d+",
    r"8\s+U\.S\.C\.\s*§",
    r"1 USCIS-PM",
    r"PM-\d{3}-\d{4}",
    r"administrative grace",
    r"ordinarily be granted",
    r"balancing.*negative factors",
    r"unusual or (even )?outstanding equities",
    r"burden of showing that discretion",
]

FILL_PARAGRAPH_SIGNALS = [
    r"\[.*?\]",
    r"\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}",
    r"\b\d{1,2}/\d{1,2}/\d{4}",
    r"\bA-\d{8,9}\b",
    r"\bI-\d{3}\b",
    r"\b(Ms\.|Mr\.|Mrs\.)\s+[A-Z][a-z]+",
    r"receipt number",
    r"case number",
    r"born (in|on)",
    r"native (of|and citizen of)",
    r"was admitted",
    r"entered the United States",
    r"filed (an|a|her|his|the) (I-\d+|petition|application)",
]

CITATION_PATTERNS = [
    r"Matter of \w+(?:-\w+)?,\s*\d+ I&N Dec\. \d+(?:,\s*\d+)?\s*\(BIA \d{4}\)",
    r"INA\s*§\s*\d+\([a-z]\)",
    r"8\s+U\.S\.C\.\s*§\s*\d+",
    r"1 USCIS-PM [A-Z]\.\d+(?:\([A-Z]\))?",
    r"PM-\d{3}-\d{4}",
    r"\d+\s+C\.F\.R\.\s*§\s*\d+\.\d+",
]


def classify_section_by_heading(heading_text: str) -> str:
    heading_lower = (heading_text or "").lower()
    for pattern in PRESERVE_HEADING_PATTERNS:
        if re.search(pattern, heading_lower):
            return "PRESERVE"
    for pattern in CAPTION_HEADING_PATTERNS:
        if re.search(pattern, heading_lower):
            return "CAPTION"
    for pattern in BOILERPLATE_HEADING_PATTERNS:
        if re.search(pattern, heading_lower):
            return "BOILERPLATE"
    for pattern in FILL_HEADING_PATTERNS:
        if re.search(pattern, heading_lower):
            return "FILL"
    return "UNKNOWN"


def classify_paragraph(text: str) -> tuple[str, float]:
    preserve_matches = sum(1 for p in PRESERVE_PARAGRAPH_SIGNALS if re.search(p, text or ""))
    fill_matches = sum(1 for p in FILL_PARAGRAPH_SIGNALS if re.search(p, text or ""))
    total = preserve_matches + fill_matches
    if total == 0:
        return "AMBIGUOUS", 0.5
    if fill_matches > 0 and preserve_matches == 0:
        return "FILL", float(fill_matches) / max(fill_matches, 1)
    if preserve_matches > 0 and fill_matches == 0:
        return "PRESERVE", float(preserve_matches) / max(preserve_matches, 1)

    # Mixed paragraph — legal authority AND client facts → FILL (citations extracted separately)
    if fill_matches > 0 and preserve_matches > 0:
        return "FILL", 0.6
    return "AMBIGUOUS", 0.5


def extract_citations_from_paragraph(text: str) -> list[str]:
    found: list[str] = []
    for pattern in CITATION_PATTERNS:
        found.extend(re.findall(pattern, text or ""))
    return list(dict.fromkeys(found))


def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", (text or "").lower()).strip("_")


def detect_variable_slots(text: str, known_applicant_name: str | None = None) -> list[dict[str, Any]]:
    slots: list[dict[str, Any]] = []
    body = text or ""

    for match in re.finditer(r"\[([^\]]+)\]", body):
        slots.append(
            {
                "slot_type": "bracket",
                "matched_text": match.group(0),
                "replacement_key": slugify(match.group(1)),
            }
        )

    for match in re.finditer(r"\bA-\d{8,9}\b", body):
        slots.append(
            {
                "slot_type": "a_number",
                "matched_text": match.group(0),
                "replacement_key": "applicant_a_number",
            }
        )

    if known_applicant_name:
        for match in re.finditer(re.escape(known_applicant_name), body):
            slots.append(
                {
                    "slot_type": "applicant_name",
                    "matched_text": match.group(0),
                    "replacement_key": "applicant_full_name",
                }
            )

    date_pattern = (
        r"(January|February|March|April|May|June|July|August|September|October|November|December)"
        r"\s+\d{1,2},\s+\d{4}"
    )
    for match in re.finditer(date_pattern, body):
        context = body[max(0, match.start() - 80) : match.end() + 80].lower()
        if "admitted" in context or "entry" in context or "entered" in context:
            key = "entry_date"
        elif "filed" in context and "i-130" in context:
            key = "i130_filed_date"
        elif "approved" in context and "i-130" in context:
            key = "i130_approved_date"
        elif "filed" in context and "i-485" in context:
            key = "i485_filed_date"
        elif "born" in context:
            key = "applicant_dob"
        else:
            key = "date_unknown"
        slots.append(
            {
                "slot_type": "date",
                "matched_text": match.group(0),
                "replacement_key": key,
            }
        )

    visa_pattern = (
        r"\b(B-1/B-2|B-2|F-1|J-1|H-1B|H-4|L-1|O-1|tourist visa|student visa|work visa)\b"
    )
    for match in re.finditer(visa_pattern, body, re.IGNORECASE):
        slots.append(
            {
                "slot_type": "visa_type",
                "matched_text": match.group(0),
                "replacement_key": "entry_visa_type",
            }
        )

    return slots


def resolve_section_classification(heading: str, paragraphs: list[str]) -> str:
    """Section-level first; fall back to paragraph majority for UNKNOWN."""
    by_heading = classify_section_by_heading(heading)
    if by_heading != "UNKNOWN":
        return by_heading
    votes: dict[str, int] = {}
    for para in paragraphs:
        label, _ = classify_paragraph(para)
        if label == "AMBIGUOUS":
            continue
        votes[label] = votes.get(label, 0) + 1
    if not votes:
        return "FILL"
    return max(votes.items(), key=lambda kv: kv[1])[0]
