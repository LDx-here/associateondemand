"""Build citation verification manifest + annotated reference PDFs (BUILD_SPEC / Citation Verification Skill)."""

from __future__ import annotations

import logging
import os
import tempfile
from typing import Any

LOGGER = logging.getLogger(__name__)

FIRM_NAME = os.getenv("AOD_FIRM_NAME", "Recover My Value")


def _styles():
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_CENTER, TA_LEFT
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet

    s = getSampleStyleSheet()
    return {
        "firm_header": ParagraphStyle(
            "FirmHeader",
            parent=s["Normal"],
            fontSize=9,
            fontName="Helvetica-Bold",
            textColor=colors.white,
            alignment=TA_LEFT,
        ),
        "source_title": ParagraphStyle(
            "SourceTitle",
            parent=s["Normal"],
            fontSize=15,
            fontName="Helvetica-Bold",
            textColor=colors.HexColor("#0d0d4d"),
            spaceAfter=4,
        ),
        "citation_line": ParagraphStyle(
            "Citation",
            parent=s["Normal"],
            fontSize=11,
            textColor=colors.HexColor("#1a3399"),
            spaceAfter=3,
        ),
        "url_line": ParagraphStyle(
            "URL",
            parent=s["Normal"],
            fontSize=8,
            textColor=colors.HexColor("#555555"),
            spaceAfter=14,
        ),
        "section_head": ParagraphStyle(
            "SectionHead",
            parent=s["Normal"],
            fontSize=8,
            fontName="Helvetica-Bold",
            textColor=colors.HexColor("#333333"),
            spaceBefore=12,
            spaceAfter=5,
        ),
        "prop_box": ParagraphStyle(
            "PropBox",
            parent=s["Normal"],
            fontSize=10,
            textColor=colors.HexColor("#0d0d4d"),
            leftIndent=10,
            rightIndent=10,
            spaceBefore=6,
            spaceAfter=12,
            leading=16,
        ),
        "body_text": ParagraphStyle(
            "Body",
            parent=s["Normal"],
            fontSize=9,
            leading=14,
            textColor=colors.black,
            spaceAfter=6,
        ),
        "key_quote": ParagraphStyle(
            "KeyQuote",
            parent=s["Normal"],
            fontSize=10,
            leading=16,
            textColor=colors.HexColor("#1a1a1a"),
            leftIndent=16,
            rightIndent=16,
            spaceBefore=8,
            spaceAfter=8,
            backColor=colors.HexColor("#fffaaa"),
        ),
        "instruction": ParagraphStyle(
            "Instruction",
            parent=s["Normal"],
            fontSize=10,
            leading=15,
            textColor=colors.HexColor("#7a2800"),
            leftIndent=10,
            rightIndent=10,
            spaceBefore=4,
            spaceAfter=4,
        ),
        "footer_text": ParagraphStyle(
            "Footer",
            parent=s["Normal"],
            fontSize=7,
            textColor=colors.HexColor("#aaaaaa"),
            alignment=TA_CENTER,
        ),
        "colors": colors,
    }


def _build_reference_pdf(source: dict[str, Any], st: dict, output_dir: str) -> str | None:
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.units import inch
    from reportlab.platypus import HRFlowable, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

    colors = st["colors"]
    verified = source.get("verified", True)
    out_name = source["filename"]
    temp_path = tempfile.mktemp(suffix=".pdf")
    final_path = os.path.join(output_dir, out_name)

    status_text = "VERIFIED — Public source confirmed" if verified else "VERIFICATION NEEDED"
    status_color = colors.HexColor("#1a6b2e") if verified else colors.HexColor("#8b3300")

    header_data = [[
        Paragraph(
            f"{FIRM_NAME}<br/>Citation Verification Package<br/>{source.get('matter_label', '')}",
            st["firm_header"],
        ),
        Paragraph(f'<font color="white"><b>{status_text}</b></font>', st["firm_header"]),
    ]]
    header_table = Table(header_data, colWidths=[4.5 * inch, 2.25 * inch])
    header_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#0d0d4d")),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 12),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
            ("LEFTPADDING", (0, 0), (0, 0), 16),
            ("BACKGROUND", (1, 0), (1, 0), status_color),
            ("ALIGN", (1, 0), (1, 0), "CENTER"),
        ])
    )

    content: list[Any] = [header_table, Spacer(1, 14)]
    content.append(Paragraph(source.get("title", ""), st["source_title"]))
    content.append(Paragraph(source.get("citation", ""), st["citation_line"]))
    if source.get("url"):
        content.append(Paragraph(f"Source: {source['url']}", st["url_line"]))

    content.append(Paragraph("Proposition Cited in Brief", st["section_head"]))
    prop_table = Table(
        [[Paragraph(f'"{source.get("proposition", "")}"', st["prop_box"])]],
        colWidths=[6.75 * inch],
    )
    prop_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#eef0ff")),
            ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#2233aa")),
            ("TOPPADDING", (0, 0), (-1, -1), 10),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
            ("LEFTPADDING", (0, 0), (-1, -1), 12),
            ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ])
    )
    content.append(prop_table)

    if not verified:
        content.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor("#cc6600")))
        content.append(Paragraph("How to Supply This Source", st["section_head"]))
        for step in source.get("instructions", []):
            content.append(Paragraph(f"•  {step}", st["instruction"]))
    else:
        content.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#cccccc")))
        content.append(Paragraph("Relevant Excerpt (key passage highlighted)", st["section_head"]))
        for part in source.get("excerpt_parts", []):
            style = st["key_quote"] if part.get("highlight") else st["body_text"]
            content.append(Paragraph(part.get("text", ""), style))

    content.append(Spacer(1, 16))
    content.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#dddddd")))
    content.append(
        Paragraph(f"{FIRM_NAME} | Citation verification package | For attorney use only", st["footer_text"])
    )

    doc = SimpleDocTemplate(
        temp_path,
        pagesize=letter,
        rightMargin=0.75 * inch,
        leftMargin=0.75 * inch,
        topMargin=0.65 * inch,
        bottomMargin=0.65 * inch,
    )
    doc.build(content)

    try:
        import fitz  # PyMuPDF

        pdf = fitz.open(temp_path)
        for page in pdf.pages():
            for phrase in source.get("highlight_phrases", []):
                for rect in page.search_for(phrase):
                    annot = page.add_highlight_annot(rect)
                    annot.set_colors(stroke=fitz.utils.getColor("yellow"))
                    annot.update()
        pdf_bytes = pdf.tobytes(garbage=4, deflate=True)
        pdf.close()
        with open(final_path, "wb") as fh:
            fh.write(pdf_bytes)
    except Exception:
        LOGGER.debug("PyMuPDF highlight pass skipped", exc_info=True)
        with open(final_path, "wb") as out, open(temp_path, "rb") as src:
            out.write(src.read())
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

    return final_path


def _build_manifest(sources: list[dict[str, Any]], st: dict, output_dir: str) -> str:
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.units import inch
    from reportlab.platypus import HRFlowable, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

    colors = st["colors"]
    verified_count = sum(1 for s in sources if s.get("verified", True))
    temp_path = tempfile.mktemp(suffix="_manifest.pdf")
    final_path = os.path.join(output_dir, "CITATION_VERIFICATION_MANIFEST.pdf")

    header_data = [[
        Paragraph(f"{FIRM_NAME}<br/>Citation Verification Manifest", st["firm_header"]),
        Paragraph(
            f'<font color="white"><b>{verified_count} of {len(sources)} VERIFIED</b></font>',
            st["firm_header"],
        ),
    ]]
    header_table = Table(header_data, colWidths=[4.5 * inch, 2.25 * inch])
    header_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#0d0d4d")),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 12),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
            ("BACKGROUND", (1, 0), (1, 0), colors.HexColor("#1a6b2e")),
            ("ALIGN", (1, 0), (1, 0), "CENTER"),
        ])
    )

    content: list[Any] = [header_table, Spacer(1, 16)]
    content.append(Paragraph("Verification Manifest", st["section_head"]))
    content.append(
        Paragraph(
            "Each source below was matched to the draft brief. Verified sources include "
            "public URLs and excerpt text. VERIFICATION NEEDED sources require attorney download.",
            st["body_text"],
        )
    )

    table_data = [[
        Paragraph("<b>Source</b>", st["body_text"]),
        Paragraph("<b>Status</b>", st["body_text"]),
        Paragraph("<b>Proposition</b>", st["body_text"]),
    ]]
    for src in sources:
        status = "VERIFIED" if src.get("verified", True) else "VERIFICATION NEEDED"
        table_data.append([
            Paragraph(f"{src.get('title', '')}<br/>{src.get('citation', '')}", st["body_text"]),
            Paragraph(status, st["body_text"]),
            Paragraph(str(src.get("proposition", ""))[:300], st["body_text"]),
        ])

    tbl = Table(table_data, colWidths=[2.5 * inch, 1.2 * inch, 3.05 * inch])
    tbl.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0d0d4d")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f5f5f8")]),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#aaaaaa")),
            ("INNERGRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#cccccc")),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ])
    )
    content.append(tbl)

    doc = SimpleDocTemplate(
        temp_path,
        pagesize=letter,
        rightMargin=0.75 * inch,
        leftMargin=0.75 * inch,
        topMargin=0.65 * inch,
        bottomMargin=0.65 * inch,
    )
    doc.build(content)

    try:
        import fitz

        pdf = fitz.open(temp_path)
        pdf_bytes = pdf.tobytes(garbage=4, deflate=True)
        pdf.close()
        with open(final_path, "wb") as fh:
            fh.write(pdf_bytes)
    except Exception:
        with open(final_path, "wb") as out, open(temp_path, "rb") as src:
            out.write(src.read())
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

    return final_path


def build_citation_package(
    sources: list[dict[str, Any]],
    output_dir: str,
    *,
    matter_label: str = "",
) -> dict[str, Any]:
    """Write manifest + reference PDFs. Returns paths and summary counts."""

    os.makedirs(output_dir, exist_ok=True)
    for src in sources:
        src["matter_label"] = matter_label

    try:
        st = _styles()
    except ImportError as exc:
        return {
            "ok": False,
            "error": "reportlab required for citation packages (pip install reportlab)",
            "detail": str(exc),
        }

    paths: list[str] = []
    paths.append(_build_manifest(sources, st, output_dir))
    for src in sources:
        path = _build_reference_pdf(src, st, output_dir)
        if path:
            paths.append(path)

    verified = sum(1 for s in sources if s.get("verified", True))
    return {
        "ok": True,
        "output_dir": output_dir,
        "files": [os.path.basename(p) for p in paths],
        "paths": paths,
        "verified_count": verified,
        "verification_needed_count": len(sources) - verified,
        "total_sources": len(sources),
    }
