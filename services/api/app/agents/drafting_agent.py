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
from app.services.drafting_prompt import (
    build_drafting_context_block,
    build_drafting_system_prompt,
    fetch_firm_memory_profile,
    resolve_task_config,
)
from app.services.matter_context import fetch_matter_context, format_assessment_data

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
            "This is an AOS Discretionary Factors Memorandum (I-485). Follow CREAC "
            "and Kingdom Counsel AOS System Guide: PRESERVE legal standard verbatim; "
            "FILL equities/adverse/balancing from matter facts."
        )
        rules.append(
            "Adverse section heading MUST NOT contain 'Immigration Violations', "
            "'Overstay', or 'Unlawful Presence' — frame as proportionality."
        )
        rules.append(
            "Balancing MUST close with: 'This is not a case about [adverse]. It is a case "
            "about [theme]. A favorable exercise of discretion is both legally supported "
            "and compelled by the facts of this record.'"
        )
        rules.append("Citations in footnotes only — no in-text parentheticals. Never use 'rebuttal'.")
        rules.append("Use bracketed [FACT NEEDED] placeholders — never invent client facts.")
        rules.append("Never fabricate case quotes or page pinpoints.")
    rules.extend(
        [
            "Voice: write like a careful senior associate — no chatbot filler ('Certainly', 'I'd be happy to'), no AI meta-commentary.",
            "Lead with substance; use RMV immigration brief tone, not generic assistant prose.",
        ]
    )
    return "\n".join(f"- {r}" for r in rules)


def _draft_extra_context(doc_type: str, matter_id: str) -> str:
    parts: list[str] = []
    if doc_type == "aos_discretionary_brief":
        parts.append("## AOS Discretionary Brief Framework\n" + aos_drafting_context())
        try:
            from app.services.aos_brief_generator import format_aos_writing_rules_for_prompt

            parts.append(format_aos_writing_rules_for_prompt())
        except Exception:
            pass
    citation_skill = load_skill_text(_CITATION_SKILL)
    if citation_skill and doc_type in {"aos_discretionary_brief", "brief_section", "general"}:
        parts.append("## Citation Verification Skill (mandatory for cited drafts)\n" + citation_skill[:12000])

    context_block = build_drafting_context_block(matter_id, deliverable_hint=doc_type)
    if context_block:
        parts.append(context_block)

    ctx = fetch_matter_context(matter_id)
    if ctx and ctx.get("assessment_data"):
        assessment_block = format_assessment_data(ctx["assessment_data"])
        if assessment_block and assessment_block not in (context_block or ""):
            parts.append(
                "## Case assessment data\n"
                "Weave structured assessment fields into factor analysis and argument sections.\n\n"
                + assessment_block
            )
    return "\n\n".join(parts)


def _run_aos_generator_primary(matter_id: str, matter_ctx: dict | None) -> dict[str, Any]:
    """Primary AOS path: Part 8.1 + 8.2 prompts + extended thinking via aos_brief_generator."""
    from app.services.aos_brief_generator import (
        assembled_sections_to_memo,
        generate_aos_brief,
    )
    from app.services.brief_parser import build_default_aos_template
    from app.services.drafting_prompt import fetch_deliverable_template_meta
    from app.services.matter_context import fetch_drafting_facts

    client = str((matter_ctx or {}).get("title") or matter_id)
    tmpl_meta = fetch_deliverable_template_meta("aos-discretionary-brief")
    brief_template = None
    if isinstance(tmpl_meta, dict):
        brief_template = tmpl_meta.get("briefTemplate") or tmpl_meta.get("brief_template")
    if not isinstance(brief_template, dict):
        brief_template = build_default_aos_template()

    drafting_facts = fetch_drafting_facts(matter_id) or {}
    fields = drafting_facts.get("fields") if isinstance(drafting_facts, dict) else {}
    fact_payload: dict[str, Any] = {
        "fields": dict(fields) if isinstance(fields, dict) else {},
        "matter_id": matter_id,
    }
    if isinstance(fact_payload["fields"], dict) and not fact_payload["fields"].get("applicantName"):
        fact_payload["fields"]["applicantName"] = client

    docx_dir = _upload_root() / "drafts" / matter_id.replace("/", "_")
    docx_dir.mkdir(parents=True, exist_ok=True)
    docx_path = docx_dir / f"{matter_id}_aos_brief.docx"

    gen = generate_aos_brief(
        brief_template,
        fact_payload,
        docx_path,
        use_api=True,  # full Part 8.1/8.2 + thinking when Anthropic configured
    )
    memo = assembled_sections_to_memo(gen.get("assembled_sections") or [])
    return {
        "memo": memo,
        "gen": gen,
        "docx_path": str(gen.get("output_path") or docx_path),
    }


def _post_process_draft(
    *,
    doc: str,
    doc_type: str,
    matter_id: str,
    matter_ctx: dict | None,
    aos_gen: dict[str, Any] | None = None,
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
        if aos_gen:
            meta["aos_brief_docx"] = str(aos_gen.get("output_path") or "")
            meta["aos_brief_validation"] = aos_gen.get("validation")
            meta["aos_brief_missing_fields"] = aos_gen.get("missing_fields")
            meta["brief_type"] = aos_gen.get("brief_type")
            meta["aos_prompt_meta"] = aos_gen.get("prompt_meta")
            meta["aos_api_used"] = aos_gen.get("api_used")
            meta["aos_api_sections"] = aos_gen.get("api_sections")
            meta["aos_pipeline"] = "aos_brief_generator"
        else:
            # Fallback only if primary generator path was skipped
            client = str((matter_ctx or {}).get("title") or matter_id)
            theme = ""
            for line in doc.splitlines():
                if line.lower().startswith("case theme:"):
                    theme = line.split(":", 1)[-1].strip()
                    break
            try:
                from app.services.aos_brief_generator import generate_aos_brief
                from app.services.brief_parser import build_default_aos_template
                from app.services.drafting_prompt import fetch_deliverable_template_meta
                from app.services.matter_context import fetch_drafting_facts

                tmpl_meta = fetch_deliverable_template_meta("aos-discretionary-brief")
                brief_template = None
                if isinstance(tmpl_meta, dict):
                    brief_template = tmpl_meta.get("briefTemplate") or tmpl_meta.get("brief_template")
                if not isinstance(brief_template, dict):
                    brief_template = build_default_aos_template()

                drafting_facts = fetch_drafting_facts(matter_id) or {}
                fields = drafting_facts.get("fields") if isinstance(drafting_facts, dict) else {}
                fact_payload = {
                    "fields": fields if isinstance(fields, dict) else {},
                    "matter_id": matter_id,
                }
                if isinstance(fact_payload["fields"], dict) and not fact_payload["fields"].get("applicantName"):
                    fact_payload["fields"]["applicantName"] = client
                if theme and isinstance(fact_payload["fields"], dict):
                    fact_payload["fields"].setdefault("caseTheme", theme)

                docx_dir = _upload_root() / "drafts" / matter_id.replace("/", "_")
                docx_dir.mkdir(parents=True, exist_ok=True)
                docx_path = docx_dir / f"{matter_id}_aos_brief.docx"
                gen = generate_aos_brief(
                    brief_template,
                    fact_payload,
                    docx_path,
                    use_api=True,
                )
                meta["aos_brief_docx"] = str(gen.get("output_path") or docx_path)
                meta["aos_brief_validation"] = gen.get("validation")
                meta["aos_brief_missing_fields"] = gen.get("missing_fields")
                meta["brief_type"] = gen.get("brief_type")
                meta["aos_prompt_meta"] = gen.get("prompt_meta")
                meta["aos_api_used"] = gen.get("api_used")
                meta["aos_pipeline"] = "aos_brief_generator_fallback"
                if not Path(str(gen.get("output_path") or "")).exists():
                    raise RuntimeError("generator output missing")
            except Exception as exc:
                meta["aos_brief_generator_error"] = str(exc)
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
                except Exception as exc2:
                    meta["aos_brief_docx_error"] = str(exc2)

    return meta


def run_drafting(matter_id: str, instruction: str) -> AgentResult:
    doc_type = classify_draft_type(instruction)
    matter_ctx = fetch_matter_context(matter_id)
    firm_profile = fetch_firm_memory_profile()
    task_config = resolve_task_config(doc_type, instruction)

    # AOS primary path: structured generator with full Part 8.1/8.2 + thinking.
    # Generic drafting_prompt path remains for non-AOS deliverables only.
    fallback_note = ""
    if doc_type == "aos_discretionary_brief":
        try:
            aos = _run_aos_generator_primary(matter_id, matter_ctx)
            gen = aos["gen"]
            doc = aos["memo"] or "(AOS brief assembled — open DOCX for full formatting.)"
            post = _post_process_draft(
                doc=doc,
                doc_type=doc_type,
                matter_id=matter_id,
                matter_ctx=matter_ctx,
                aos_gen=gen,
            )
            firm_applied = bool(firm_profile)
            matter_facts_present = bool(
                (matter_ctx and matter_ctx.get("assessment_data"))
                or (matter_ctx and matter_ctx.get("summary"))
                or (gen.get("prompt_meta") or {}).get("fact_key_count", 0) > 5
            )
            qc = {
                "firm_memory_applied": firm_applied,
                "matter_context_present": bool(matter_ctx),
                "matter_facts_present": matter_facts_present,
                "document_lint_passed": bool((post.get("document_lint") or {}).get("passed")),
                "citations_checked": bool(post.get("citation_verification_summary") or post.get("citations_found")),
                "attorney_review_required": True,
                "aos_api_used": bool(gen.get("api_used")),
                "aos_thinking": (gen.get("prompt_meta") or {}).get("thinking"),
                "aos_model": (gen.get("prompt_meta") or {}).get("model"),
            }
            gaps: list[str] = []
            lint = post.get("document_lint") or {}
            if not lint.get("passed"):
                gaps.append(f"Document linter: {'; '.join(lint.get('issues', []))}")
            if post.get("citation_verification_summary"):
                gaps.append(f"Citation package: {post['citation_verification_summary']}")
            aos_val = post.get("aos_brief_validation")
            if isinstance(aos_val, dict):
                if aos_val.get("errors"):
                    gaps.append("AOS brief validation: " + "; ".join(aos_val["errors"][:5]))
                elif aos_val.get("warnings"):
                    gaps.append("AOS brief warnings: " + "; ".join(aos_val["warnings"][:3]))
                gaps.append(
                    f"AOS validator: {'PASS' if aos_val.get('passed') else 'NEEDS REVIEW'} "
                    f"({aos_val.get('error_count', 0)} errors, {aos_val.get('warning_count', 0)} warnings)"
                )
            missing = post.get("aos_brief_missing_fields")
            if isinstance(missing, list) and missing:
                gaps.append("AOS missing fact slots: " + ", ".join(missing[:12]))
            if not gen.get("api_used"):
                gaps.append(
                    "AOS FILL API not used (set ANTHROPIC_API_KEY; model via AOD_AOS_MODEL) — "
                    "placeholders/template prose only."
                )
            prompt_meta = gen.get("prompt_meta") or {}
            gaps.append(
                f"AOS prompt: Part 8.1 ({prompt_meta.get('system_prompt_chars', 0)} chars), "
                f"thinking={prompt_meta.get('thinking')}, model={prompt_meta.get('model')}, "
                f"fact_keys={prompt_meta.get('fact_key_count')}"
            )
            if not firm_applied:
                gaps.append(
                    "Firm Memory not applied — set tone/samples at /firm-memory for firmer voice match."
                )
            gaps.append("Attorney review required before filing or client communication.")

            return AgentResult(
                agent="drafting",
                matter_id=matter_id,
                anchor_facts=[f"AOS brief generated for {matter_id}", instruction[:200]],
                anchor_law=["Part 8.1 AOS System Guide (Patel/Marin/Arai + USCIS-PM)"],
                anchor_strategy=["Verify FILL sections against matter facts before filing."],
                anchor_risk=["Verify every citation in Westlaw/Lexis before filing."],
                anchor_next=["Attorney review", "Download AOS DOCX"],
                gaps=gaps,
                summary=f"[aos_discretionary_brief] {doc[:500]}",
                citations=["Anthropic", "aos_brief_generator", "Part 8.1"],
                confidence=0.86 if gen.get("api_used") else 0.55,
                metadata={
                    "full_memo": doc,
                    "draft_type": doc_type,
                    "firm_memory_applied": firm_applied,
                    "draft_qc": qc,
                    "llm": "anthropic" if gen.get("api_used") else "template",
                    "matter_context": matter_ctx,
                    **post,
                },
                complete=True,
            )
        except Exception as exc:
            fallback_note = f"AOS generator primary path failed ({exc}); using generic drafting."

    system_prompt = build_drafting_system_prompt(matter_ctx=matter_ctx, firm_profile=firm_profile)

    result = run_skill_llm(
        agent="drafting",
        matter_id=matter_id,
        instruction=instruction,
        skill_path=_DRAFTING_SKILL,
        role="the RMV Drafting Agent",
        extra_rules=_draft_extra_rules(doc_type),
        extra_context=_draft_extra_context(doc_type, matter_id),
        summary_prefix=f"[{doc_type}] ",
        max_tokens=int(task_config.get("max_tokens", 8192)),
        temperature=float(task_config.get("temperature", 0.2)),
        confidence=0.82 if doc_type == "aos_discretionary_brief" else 0.8,
        system_prompt=system_prompt,
        model=str(task_config.get("model")) if task_config.get("model") else None,
    )

    if not result.complete:
        return result

    doc = (result.metadata or {}).get("full_memo") or result.summary
    post = _post_process_draft(doc=str(doc), doc_type=doc_type, matter_id=matter_id, matter_ctx=matter_ctx)
    firm_applied = bool(firm_profile)
    matter_facts_present = bool(
        (matter_ctx and matter_ctx.get("assessment_data"))
        or (matter_ctx and matter_ctx.get("summary"))
    )
    qc = {
        "firm_memory_applied": firm_applied,
        "matter_context_present": bool(matter_ctx),
        "matter_facts_present": matter_facts_present,
        "document_lint_passed": bool((post.get("document_lint") or {}).get("passed")),
        "citations_checked": bool(post.get("citation_verification_summary") or post.get("citations_found")),
        "attorney_review_required": True,
    }
    result.metadata = {
        **(result.metadata or {}),
        **post,
        "draft_type": doc_type,
        "firm_memory_applied": firm_applied,
        "draft_qc": qc,
    }
    if fallback_note:
        result.metadata["aos_fallback_note"] = fallback_note

    lint = post.get("document_lint") or {}
    gaps = list(result.gaps or [])
    if fallback_note:
        gaps.insert(0, fallback_note)
    if not lint.get("passed"):
        gaps.append(f"Document linter: {'; '.join(lint.get('issues', []))}")
    if post.get("citation_verification_summary"):
        gaps.append(f"Citation package: {post['citation_verification_summary']}")
    aos_val = post.get("aos_brief_validation")
    if isinstance(aos_val, dict):
        if aos_val.get("errors"):
            gaps.append("AOS brief validation: " + "; ".join(aos_val["errors"][:5]))
        elif aos_val.get("warnings"):
            gaps.append("AOS brief warnings: " + "; ".join(aos_val["warnings"][:3]))
        meta_note = (
            f"AOS validator: {'PASS' if aos_val.get('passed') else 'NEEDS REVIEW'} "
            f"({aos_val.get('error_count', 0)} errors, {aos_val.get('warning_count', 0)} warnings)"
        )
        gaps.append(meta_note)
    missing = post.get("aos_brief_missing_fields")
    if isinstance(missing, list) and missing:
        gaps.append("AOS missing fact slots: " + ", ".join(missing[:12]))
    if not firm_applied:
        gaps.append(
            "Firm Memory not applied — set tone/samples at /firm-memory for firmer voice match."
        )
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
