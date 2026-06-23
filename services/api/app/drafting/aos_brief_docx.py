"""Build AOS discretionary brief DOCX from draft text (python-docx)."""

from __future__ import annotations

import re
from io import BytesIO
from typing import Any


def _add_page_footer(section) -> None:
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    from docx.oxml import OxmlElement
    from docx.oxml.ns import qn

    def add_field(paragraph, instruction: str) -> None:
        run = paragraph.add_run()
        for fld_type, text in (("begin", None), (None, instruction), ("end", None)):
            if fld_type:
                el = OxmlElement("w:fldChar")
                el.set(qn("w:fldCharType"), fld_type)
            else:
                el = OxmlElement("w:instrText")
                el.set(qn("xml:space"), "preserve")
                el.text = text or ""
            run._r.append(el)

    footer = section.footer
    paragraph = footer.paragraphs[0] if footer.paragraphs else footer.add_paragraph()
    paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
    paragraph.add_run("Page ")
    add_field(paragraph, "PAGE")
    paragraph.add_run(" of ")
    add_field(paragraph, "NUMPAGES")


def _split_sections(text: str) -> list[tuple[str, list[str]]]:
    """Split draft into (heading, paragraphs) by Roman numerals or markdown headers."""

    lines = text.replace("\r\n", "\n").split("\n")
    sections: list[tuple[str, list[str]]] = []
    current_heading = "Draft"
    current_paras: list[str] = []
    buf: list[str] = []

    heading_re = re.compile(
        r"^(?:#{1,3}\s+)?((?:I{1,3}|IV|V|VI{0,3}|IX|X{0,3})\.\s+.+)$|^(?:\*\*)?([A-Z][A-Z\s/\-]{4,})(?:\*\*)?$"
    )

    def flush_para() -> None:
        nonlocal buf
        if buf:
            current_paras.append(" ".join(buf).strip())
            buf = []

    for line in lines:
        stripped = line.strip()
        if not stripped:
            flush_para()
            continue
        m = heading_re.match(stripped)
        if m and (m.group(1) or m.group(2)):
            flush_para()
            if current_paras or current_heading != "Draft":
                sections.append((current_heading, current_paras))
            current_heading = (m.group(1) or m.group(2) or stripped).strip("*")
            current_paras = []
            continue
        buf.append(stripped)
    flush_para()
    sections.append((current_heading, current_paras))
    return [(h, ps) for h, ps in sections if h or ps]


def build_aos_brief_docx(
    *,
    client_name: str,
    matter_id: str,
    draft_text: str,
    case_theme: str = "",
    a_number: str = "",
) -> bytes:
    from docx import Document
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    from docx.shared import Pt

    doc = Document()
    section = doc.sections[0]
    _add_page_footer(section)

    title = doc.add_paragraph()
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = title.add_run("MEMORANDUM IN SUPPORT OF ADJUSTMENT OF STATUS")
    run.bold = True
    run.font.size = Pt(14)

    sub = doc.add_paragraph()
    sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    sub.add_run(f"In the Matter of {client_name or matter_id}").italic = True

    if a_number:
        meta = doc.add_paragraph()
        meta.alignment = WD_ALIGN_PARAGRAPH.CENTER
        meta.add_run(f"File No.: {a_number}")

    if case_theme:
        theme = doc.add_paragraph()
        theme.alignment = WD_ALIGN_PARAGRAPH.CENTER
        tr = theme.add_run(case_theme)
        tr.italic = True

    doc.add_paragraph()

    for heading, paragraphs in _split_sections(draft_text):
        if heading and heading != "Draft":
            h = doc.add_paragraph()
            h_run = h.add_run(heading)
            h_run.bold = True
            h_run.font.size = Pt(12)
        for para in paragraphs:
            if not para:
                continue
            p = doc.add_paragraph()
            p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
            p.add_run(para)

    buf = BytesIO()
    doc.save(buf)
    return buf.getvalue()


def build_from_xlsx(xlsx_path: str, output_path: str, client_name: str, a_number: str) -> dict[str, Any]:
    """Optional: generate brief from Brief Development Matrix + Case Theme tabs."""

    import openpyxl

    wb = openpyxl.load_workbook(xlsx_path, data_only=True)
    if "2. Brief Development Matrix" not in wb.sheetnames:
        raise ValueError("Workbook missing '2. Brief Development Matrix' sheet")

    parts: list[str] = []
    theme = ""
    if "3. Case Theme" in wb.sheetnames:
        ws_theme = wb["3. Case Theme"]
        theme = str(ws_theme.cell(row=5, column=2).value or "").strip()

    ws = wb["2. Brief Development Matrix"]
    for row in ws.iter_rows(min_row=1, values_only=True):
        draft_col = row[9] if len(row) > 9 else None
        weight = row[7] if len(row) > 7 else None
        if draft_col and weight in ("Strong", "Moderate", "Limited"):
            text = str(draft_col).strip()
            if text and not text.startswith("[This factor"):
                parts.append(text)

    draft_text = "\n\n".join(parts) or "[No weighted draft paragraphs found in matrix — complete Tab 2 first.]"
    blob = build_aos_brief_docx(
        client_name=client_name,
        matter_id="",
        draft_text=draft_text,
        case_theme=theme,
        a_number=a_number,
    )
    with open(output_path, "wb") as fh:
        fh.write(blob)
    return {"ok": True, "output_path": output_path, "paragraph_count": len(parts), "case_theme": theme}
