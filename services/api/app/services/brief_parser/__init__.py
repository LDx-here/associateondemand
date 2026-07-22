"""Public API for brief parser package."""

from __future__ import annotations

from app.services.brief_parser.aos_discretionary import (
    BRIEF_TYPE,
    CATALOG_SKU,
    brief_template_to_creac_sections,
    build_default_aos_template,
    classify_and_build_template,
    parse_aos_brief_docx,
)
from app.services.brief_parser.blocks import group_blocks_into_sections, parse_docx_to_blocks
from app.services.brief_parser.classification import (
    classify_paragraph,
    classify_section_by_heading,
    detect_variable_slots,
    extract_citations_from_paragraph,
    resolve_section_classification,
)
from app.services.brief_parser.registry import (
    get_brief_type,
    list_brief_types,
    resolve_brief_type_from_category,
)

__all__ = [
    "BRIEF_TYPE",
    "CATALOG_SKU",
    "brief_template_to_creac_sections",
    "build_default_aos_template",
    "classify_and_build_template",
    "classify_paragraph",
    "classify_section_by_heading",
    "detect_variable_slots",
    "extract_citations_from_paragraph",
    "get_brief_type",
    "group_blocks_into_sections",
    "list_brief_types",
    "parse_aos_brief_docx",
    "parse_docx_to_blocks",
    "resolve_brief_type_from_category",
    "resolve_section_classification",
]
