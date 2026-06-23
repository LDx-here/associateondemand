"""Drafting Agent — memos, AOS discretionary briefs, letters, motions (BUILD_SPEC §4)."""

from __future__ import annotations

import os
import tempfile
from pathlib import Path
from typing import Any

from app.agents._llm_skill import load_skill_text, resolve_skill_path, run_skill_llm
from app.drafting.aos_brief_docx import build_aos_brief_docx
from app.drafting.aos_framework import aos_drafting_context
from app.drafting.citation_extractor import extract_citation_strings, resolve_sources_for_draft
from app.drafting.citation_package import build_citation_package
from app.drafting.classify import classify_draft_type
from app.models.agent_result import AgentResult
from app.services.document_linter import lint_document
from app.services.matter_context import fetch_matter_context

_DRAFTING_SKILL = resolve_skill_path("05-Drafting-SKILL.md", "AOD_DRAFTING_SKILL_PATH")
_CITATION_SKILL = resolve_skill_path("08-Citation-Verification-SKILL.md", "AOD_CITATION_SKILL_PATH")


def _upload_root() -> Path:
    root = Path(os.getenv("UPLOAD_DIR", "/tmp/aod-uploads"))
    root.mkdir(parents=True, exist_ok=True)
    return root


def _draft_extra_rules(doc_type: str) -> str:
    rules = [
        "Identify document type and use the matching structure from the SKILL.",
        "End with a 'Sources Cited' list when the draft includes legal citations.",
    ]
    if doc_type == "aos_discretionary_brief":
        rules.append(
            "This is an AOS Discretionary Factors Memorandum (I-485). Follow PM-602-0199 framing."
        )
        rules.append("Use bracketed [FACT NEEDED] placeholders — never invent client facts.")
        rules.append("Never fabricate case quotes or page pinpoints.")
    return "\n".join(f"- {r}" for r in rules)


def _draft_extra_context(doc_type: str, matter_id: str) -> str:
    parts: list[str] = []
    if doc_type == "aos_discretionary_brief":
        parts.append("## AOS Discretionary Brief Framework\n" + aos_drafting_context())
    citation_skill = load_skill_text(_CITATION_SKILL)
    if citation_skill and doc_type in {"aos_discretionary_brief", "brief_section", "general"}:
        parts.append("## Citation Verification Skill (mandatory for cited drafts)\n" + citation_skill[:12000])
    ctx = fetch_matter_context(matter_id)
    if ctx and ctx.get("assessment_data"):
        parts.append("## Case assessment data\nUse assessment_data for factor analysis where present.")
    return "\n\n".join(parts)


def _post_process_draft(
    *,
    doc: str,
    doc_type: str,
    matter_id: str,
    matter_ctx: dict | None,
) -> dict[str, Any]:
    meta: dict[str, Any] = {}
    lint_issues = lint_document(doc)
    meta["document_lint"] = {"passed": not lint_issues, "issues": lint_issues}

    cites = extract_citation_strings(doc)
    meta["citations_found"] = cites

    if doc_type in {"aos_discretionary_brief", "brief_section"} or len(cites) >= 2:
        sources = resolve_sources_for_draft(doc)
        label = matter_id
        if matter_ctx:
            label = str(matter_ctx.get("title") or matter_id)
        out_dir = tempfile.mkdtemp(prefix="citation-pkg-", dir=_upload_root())
        pkg = build_citation_package(sources, out_dir, matter_label=label)
        meta["citation_package"] = pkg
        meta["citation_verification_summary"] = (
            f"{pkg.get('verified_count', 0)} verified, "
            f"{pkg.get('verification_needed_count', 0)} need attorney action "
            f"({pkg.get('total_sources', 0)} sources)."
        )

    if doc_type == "aos_discretionary_brief":
        client = str((matter_ctx or {}).get("title") or matter_id)
        theme = ""
        for line in doc.splitlines():
            if line.lower().startswith("case theme:"):
                theme = line.split(":", 1)[-1].strip()
                break
        try:
            docx_bytes = build_aos_brief_docx(
                client_name=client,
                matter_id=matter_id,
                draft_text=doc,
                case_theme=theme,
            )
            docx_dir = _upload_root() / "drafts" / matter_id.replace("/", "_")
            docx_dir.mkdir(parents=True, exist_ok=True)
            docx_path = docx_dir / f"{matter_id}_aos_brief.docx"
            docx_path.write_bytes(docx_bytes)
            meta["aos_brief_docx"] = str(docx_path)
        except Exception as exc:
            meta["aos_brief_docx_error"] = str(exc)

    return meta


def run_drafting(matter_id: str, instruction: str) -> AgentResult:
    doc_type = classify_draft_type(instruction)
    matter_ctx = fetch_matter_context(matter_id)

    result = run_skill_llm(
        agent="drafting",
        matter_id=matter_id,
        instruction=instruction,
        skill_path=_DRAFTING_SKILL,
        role="the RMV Drafting Agent",
        extra_rules=_draft_extra_rules(doc_type),
        extra_context=_draft_extra_context(doc_type, matter_id),
        summary_prefix=f"[{doc_type}] ",
        max_tokens=12000 if doc_type == "aos_discretionary_brief" else 8192,
        confidence=0.82 if doc_type == "aos_discretionary_brief" else 0.8,
    )

    if not result.complete:
        return result

    doc = (result.metadata or {}).get("full_memo") or result.summary
    post = _post_process_draft(doc=str(doc), doc_type=doc_type, matter_id=matter_id, matter_ctx=matter_ctx)
    result.metadata = {**(result.metadata or {}), **post, "draft_type": doc_type}

    lint = post.get("document_lint") or {}
    gaps = list(result.gaps or [])
    if not lint.get("passed"):
        gaps.append(f"Document linter: {'; '.join(lint.get('issues', []))}")
    if post.get("citation_verification_summary"):
        gaps.append(f"Citation package: {post['citation_verification_summary']}")
    gaps.append("Attorney review required before filing or client communication.")
    result.gaps = gaps

    pkg = post.get("citation_package") or {}
    if pkg.get("verification_needed_count", 0) > 0:
        result.anchor_next = list(result.anchor_next or []) + [
            "Download VERIFICATION NEEDED citation cards and attach source PDFs",
        ]

    return result


def drafting_from_payload(payload: dict) -> AgentResult:
    return run_drafting(
        str(payload.get("matter_id") or ""),
        str(payload.get("instruction") or payload.get("query") or ""),
    )
