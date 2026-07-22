"""Brief-type registry — AOS discretionary first; other types plug in later."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable

# ---------------------------------------------------------------------------
# Extensibility stub
# ---------------------------------------------------------------------------
# Registered today: AOS_DISCRETIONARY
# TODO: asylum_affirmative_brief — asylum claim CREAC + country-conditions FILL
# TODO: hearing_packet — exhibit index + witness list CAPTION/FILL patterns
# TODO: i601a_waiver_brief — hardship-centered FILL slots
# ---------------------------------------------------------------------------

Classification = str  # PRESERVE | FILL | CAPTION | BOILERPLATE | UNKNOWN


@dataclass(frozen=True)
class BriefTypeSpec:
    """Shared interface so the next brief type plugs classification + schema."""

    brief_type: str
    catalog_sku: str
    task_alias: str
    template_id: str
    template_name: str
    # Heading / paragraph pattern lists live on the classifier module per type.
    classify_heading: Callable[[str], Classification]
    classify_paragraph: Callable[[str], tuple[str, float]]
    build_default_template: Callable[[], dict[str, Any]]
    notes: str = ""
    extra: dict[str, Any] = field(default_factory=dict)


_REGISTRY: dict[str, BriefTypeSpec] = {}


def register_brief_type(spec: BriefTypeSpec) -> None:
    _REGISTRY[spec.brief_type] = spec
    _REGISTRY[spec.catalog_sku] = spec
    _REGISTRY[spec.task_alias] = spec


def get_brief_type(key: str) -> BriefTypeSpec | None:
    return _REGISTRY.get(key)


def list_brief_types() -> list[BriefTypeSpec]:
    seen: set[str] = set()
    out: list[BriefTypeSpec] = []
    for spec in _REGISTRY.values():
        if spec.brief_type in seen:
            continue
        seen.add(spec.brief_type)
        out.append(spec)
    return out


def resolve_brief_type_from_category(document_category: str | None) -> BriefTypeSpec | None:
    """Map deliverable_template:{sku} → brief type."""
    cat = (document_category or "").strip()
    if not cat.startswith("deliverable_template:"):
        return None
    sku = cat.split(":", 1)[1].strip()
    return get_brief_type(sku)
