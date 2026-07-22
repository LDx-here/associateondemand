"""Parse firm template text into structural outline (headings / CREAC)."""

from __future__ import annotations

import re
from typing import Any, Literal

CreacRole = Literal[
    "conclusion",
    "rule",
    "explanation",
    "analysis",
    "conclusion_close",
    "introduction",
    "caption",
    "other",
]

_CREAC_PATTERNS: list[tuple[re.Pattern[str], CreacRole]] = [
    (re.compile(r"^\s*(i+\.?\s+)?conclusion\b", re.I), "conclusion"),
    (re.compile(r"^\s*(v+\.?\s+)?conclusion\b", re.I), "conclusion"),
    (re.compile(r"^\s*(ii+\.?\s+)?(legal\s+)?standard\b", re.I), "rule"),
    (re.compile(r"^\s*(ii+\.?\s+)?rule\b", re.I), "rule"),
    (re.compile(r"^\s*(applicable\s+)?law\b", re.I), "rule"),
    (re.compile(r"^\s*(iii+\.?\s+)?explanation\b", re.I), "explanation"),
    (re.compile(r"^\s*(discussion\s+of\s+(the\s+)?law|legal\s+framework)\b", re.I), "explanation"),
    (re.compile(r"^\s*(iv+\.?\s+)?(argument|analysis|application|discussion)\b", re.I), "analysis"),
    (re.compile(r"^\s*(totality|discretionary\s+factors|positive\s+equities)\b", re.I), "analysis"),
    (re.compile(r"^\s*(i+\.?\s+)?introduction\b", re.I), "introduction"),
    (re.compile(r"^\s*(caption|in\s+the\s+matter\s+of)\b", re.I), "caption"),
    (re.compile(r"^\s*(certificate\s+of\s+service|table\s+of\s+contents)\b", re.I), "other"),
]

_NUMBERED_HEADING = re.compile(
    r"^\s*((?:[IVXLC]+\.|[A-Z]\.|§?\d+(?:\.\d+)*\.?|[0-9]+(?:\.[0-9]+)*\.?)\s+)(.{3,120})$"
)
_ALL_CAPS_HEADING = re.compile(r"^[A-Z0-9][A-Z0-9\s\-–—,.'()]{2,100}$")
_MARKDOWN_HEADING = re.compile(r"^#{1,3}\s+(.+)$")


def _slug(label: str, order: int) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", label.lower()).strip("-")[:48] or "section"
    return f"{base}-{order}"


def detect_creac_role(label: str) -> CreacRole:
    cleaned = (label or "").strip()
    # Strip leading roman / number markers for matching
    stripped = re.sub(r"^(?:[IVXLC]+\.|[A-Z]\.|§?\d+(?:\.\d+)*\.?)\s*", "", cleaned, flags=re.I)
    for pattern, role in _CREAC_PATTERNS:
        if pattern.search(stripped) or pattern.search(cleaned):
            return role
    return "other"


def _is_heading_line(line: str) -> bool:
    text = line.strip()
    if not text or len(text) > 140:
        return False
    if _MARKDOWN_HEADING.match(text):
        return True
    if text.startswith("## ") or text.startswith("# "):
        return True
    if _NUMBERED_HEADING.match(text):
        return True
    # ALL CAPS short line (exclude sentences with many lowercase leftovers already filtered)
    if _ALL_CAPS_HEADING.match(text) and " " in text and not text.endswith("."):
        letters = [c for c in text if c.isalpha()]
        if letters and all(c.isupper() for c in letters) and len(letters) >= 4:
            return True
    # CREAC-ish bare labels
    if detect_creac_role(text) != "other" and len(text.split()) <= 8:
        return True
    return False


def _heading_label(line: str) -> str:
    text = line.strip()
    md = _MARKDOWN_HEADING.match(text)
    if md:
        return md.group(1).strip()
    if text.startswith("## "):
        return text[3:].strip()
    if text.startswith("# "):
        return text[2:].strip()
    return text


def parse_template_structure(
    text: str,
    *,
    deliverable_id: str = "",
    prefer_creac: bool | None = None,
    excerpt_chars: int = 600,
) -> list[dict[str, Any]]:
    """
    Split template text into ordered sections.

    Returns list of:
      {id, label, role, contentExcerpt, order}
    """

    raw = (text or "").strip()
    if not raw:
        return []

    use_creac = prefer_creac
    if use_creac is None:
        use_creac = deliverable_id in {"aos-discretionary-brief", "aos_discretionary_brief"}

    lines = raw.replace("\r\n", "\n").split("\n")
    # Find heading indices
    heading_idxs: list[int] = []
    for i, line in enumerate(lines):
        if _is_heading_line(line):
            heading_idxs.append(i)

    sections: list[dict[str, Any]] = []
    if not heading_idxs:
        # Single blob — still try to surface CREAC labels inside paragraphs
        role: CreacRole = "other"
        label = "Full template"
        if use_creac and re.search(r"\brule\b|\blegal\s+standard\b", raw, re.I):
            label = "Unstructured template (scan for CREAC labels)"
        sections.append(
            {
                "id": _slug(label, 0),
                "label": label,
                "role": role,
                "contentExcerpt": raw[:excerpt_chars],
                "order": 0,
            }
        )
        return sections

    for order, start in enumerate(heading_idxs):
        end = heading_idxs[order + 1] if order + 1 < len(heading_idxs) else len(lines)
        label = _heading_label(lines[start])
        body = "\n".join(lines[start + 1 : end]).strip()
        role = detect_creac_role(label) if use_creac else "other"
        if not use_creac:
            role = "other"
        sections.append(
            {
                "id": _slug(label, order),
                "label": label,
                "role": role,
                "contentExcerpt": (body or label)[:excerpt_chars],
                "order": order,
            }
        )

    # If prefer CREAC and we got multiple conclusions, mark last as conclusion_close
    if use_creac:
        conclusion_idxs = [i for i, s in enumerate(sections) if s["role"] == "conclusion"]
        if len(conclusion_idxs) >= 2:
            last = conclusion_idxs[-1]
            sections[last]["role"] = "conclusion_close"
        # If we detected almost no CREAC roles, keep heading tree as-is (roles mostly other)

    return sections


def format_structure_for_prompt(
    sections: list[dict[str, Any]],
    *,
    max_chars: int = 3500,
) -> str:
    """Render TEMPLATE STRUCTURE block for drafting prompts."""

    if not sections:
        return ""
    lines = [
        "## TEMPLATE STRUCTURE (CREAC / outline)",
        "Preserve RULE and EXPLANATION wording from the firm template. "
        "Map new matter facts into ANALYSIS. Conclusions should follow from that analysis.",
        "",
    ]
    used = 0
    for sec in sections:
        role = str(sec.get("role") or "other")
        label = str(sec.get("label") or "Section")
        excerpt = str(sec.get("contentExcerpt") or "").strip()
        preserve = role in {"rule", "explanation"}
        tag = "PRESERVE from template" if preserve else (
            "FILL with matter facts" if role == "analysis" else
            "Guide from analysis outcome" if role in {"conclusion", "conclusion_close"} else
            "Adapt as needed"
        )
        block = f"### [{role.upper()}] {label}\n- Instruction: {tag}\n"
        if excerpt:
            block += f"- Template excerpt:\n{excerpt}\n"
        block += "\n"
        if used + len(block) > max_chars:
            lines.append("(additional sections truncated)")
            break
        lines.append(block)
        used += len(block)
    return "\n".join(lines).strip()


def creac_fact_slot_for_field(field_id: str) -> CreacRole | None:
    """Map structured drafting fact field ids to CREAC slots (AOS)."""

    analysis_fields = {
        "qualifyingRelative",
        "extremeHardshipFactors",
        "adverseFactors",
        "adverseFacts",
        "adverseHeading",
        "adverseFactorBrief",
        "positiveEquities",
        "balancingInventory",
        "inadmissibilityGrounds",
        "priorFilings",
        "clientStatus",
        "supportingDocs",
        "entryDate",
        "portOfEntry",
        "entryVisaType",
        "petitionerName",
        "petitionerRelationship",
        "i130ApprovedDate",
        "i485FiledDate",
        "sectionAHeading",
        "sectionAFacts",
        "sectionBHeading",
        "sectionBFacts",
    }
    conclusion_fields = {"reliefSought", "caseTheme", "caseThemeBrief"}
    caption_fields = {"applicantName", "aNumber"}
    explanation_fields = {"departureHarm"}
    if field_id in analysis_fields:
        return "analysis"
    if field_id in conclusion_fields:
        return "conclusion"
    if field_id in caption_fields:
        return "caption"
    if field_id in explanation_fields:
        return "explanation"
    return None


def format_creac_facts_for_prompt(drafting_fields: dict[str, Any] | None) -> str:
    """Group matter facts under CREAC slots for ANALYSIS vs conclusion guidance."""

    if not drafting_fields:
        return ""
    analysis: list[str] = []
    conclusions: list[str] = []
    other: list[str] = []
    for key, val in drafting_fields.items():
        if not val:
            continue
        if isinstance(val, list):
            rendered = "; ".join(str(v).strip() for v in val if str(v).strip())
        else:
            rendered = str(val).strip()
        if not rendered:
            continue
        slot = creac_fact_slot_for_field(key)
        line = f"- {key}: {rendered}"
        if slot == "analysis":
            analysis.append(line)
        elif slot == "conclusion":
            conclusions.append(line)
        else:
            other.append(line)
    if not (analysis or conclusions or other):
        return ""
    parts = [
        "## FACTS FOR ANALYSIS (map into CREAC Analysis; do not overwrite Rule)",
        "Use these matter facts to show how the case aligns with the Rule preserved above.",
    ]
    if analysis:
        parts.append("### Analysis slot")
        parts.extend(analysis)
    if conclusions:
        parts.append("### Conclusion guidance")
        parts.extend(conclusions)
    if other:
        parts.append("### Other facts")
        parts.extend(other)
    return "\n".join(parts)
