"""OCR and text extraction for intake (Tesseract + PDF text layers)."""

from __future__ import annotations

import logging
import os
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

LOGGER = logging.getLogger(__name__)


@dataclass
class OcrResult:
    text: str
    method: str
    confidence: float
    processing_status: str
    page_count: int = 1
    metadata: dict[str, Any] = field(default_factory=dict)


def text_quality_score(text: str) -> float:
    """Heuristic 0–1 score: penalize empty, garbled, or very short OCR."""

    cleaned = (text or "").strip()
    if not cleaned:
        return 0.0
    if len(cleaned) < 40:
        return 0.35
    letters = sum(1 for c in cleaned if c.isalpha())
    ratio = letters / max(len(cleaned), 1)
    if ratio < 0.45:
        return 0.4
    words = len(re.findall(r"\w+", cleaned))
    if words < 12:
        return 0.5
    return min(0.95, 0.55 + ratio * 0.35)


def _extract_pdf_text(path: Path) -> tuple[str, int]:
    try:
        import fitz

        doc = fitz.open(path)
        pages = [page.get_text("text") for page in doc]
        doc.close()
        return "\n\n".join(p.strip() for p in pages if p.strip()), len(pages)
    except Exception:
        pass

    try:
        import pdfplumber

        chunks: list[str] = []
        with pdfplumber.open(path) as pdf:
            for page in pdf.pages:
                t = page.extract_text() or ""
                if t.strip():
                    chunks.append(t.strip())
            return "\n\n".join(chunks), len(pdf.pages)
    except Exception as exc:
        LOGGER.warning("PDF text extraction failed for %s: %s", path.name, exc)
    return "", 0


def _ocr_image(path: Path) -> tuple[str, float]:
    try:
        import pytesseract
        from PIL import Image

        img = Image.open(path)
        text = pytesseract.image_to_string(img)
        data = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT)
        confidences = [int(c) for c in data.get("conf", []) if str(c).isdigit() and int(c) >= 0]
        avg = sum(confidences) / len(confidences) if confidences else 50
        return text, round(avg / 100, 3)
    except Exception as exc:
        LOGGER.warning("Tesseract OCR failed for %s: %s", path.name, exc)
        return "", 0.0


def _docx_style_is_heading(style_name: str | None) -> bool:
    name = (style_name or "").strip().lower()
    if not name:
        return False
    return name.startswith("heading") or name in {"title", "subtitle"}


def _extract_docx_rich(path: Path) -> tuple[str, str, str | None]:
    """Extract text + simple HTML from .docx. Returns (text, html, error).

    Heading styles become markdown ``##`` lines so structure parsers can detect CREAC/outline.
    """

    try:
        from docx import Document  # type: ignore[import-not-found]
        from docx.oxml.ns import qn  # type: ignore[import-not-found]
    except ImportError:
        return "", "", "python-docx is not installed on the API server"

    try:
        doc = Document(str(path))
        text_parts: list[str] = []
        html_parts: list[str] = [
            "<article class='aod-docx-preview' "
            "style='font-family:Georgia,serif;line-height:1.45;padding:1rem;color:#0f172a'>"
        ]

        for paragraph in doc.paragraphs:
            text = (paragraph.text or "").strip()
            if not text:
                continue
            style_name = ""
            try:
                style_name = paragraph.style.name if paragraph.style else ""
            except Exception:
                style_name = ""
            is_heading = _docx_style_is_heading(style_name)
            # Outline level from Word (0–8) also marks headings
            if not is_heading:
                try:
                    pPr = paragraph._p.get_or_add_pPr()  # noqa: SLF001
                    outline = pPr.find(qn("w:outlineLvl"))
                    if outline is not None:
                        is_heading = True
                except Exception:
                    pass

            if is_heading:
                text_parts.append(f"## {text}")
                level = 2
                m = re.search(r"heading\s*(\d)", style_name or "", re.I)
                if m:
                    level = min(max(int(m.group(1)), 1), 3)
                html_parts.append(f"<h{level}>{_escape_html(text)}</h{level}>")
            else:
                text_parts.append(text)
                html_parts.append(f"<p>{_escape_html(text)}</p>")

        for table in doc.tables:
            rows_html: list[str] = []
            for row in table.rows:
                cells = [(cell.text or "").strip() for cell in row.cells]
                cells = [c for c in cells if c]
                if not cells:
                    continue
                text_parts.append(" | ".join(cells))
                tds = "".join(f"<td>{_escape_html(c)}</td>" for c in cells)
                rows_html.append(f"<tr>{tds}</tr>")
            if rows_html:
                html_parts.append(
                    "<table style='border-collapse:collapse;width:100%;margin:0.75rem 0' border='1'>"
                    + "".join(rows_html)
                    + "</table>"
                )

        html_parts.append("</article>")
        combined = "\n\n".join(text_parts).strip()
        html = "\n".join(html_parts)
        if not combined:
            return "", "", "DOCX opened but contained no extractable text"
        return combined, html, None
    except Exception as exc:
        LOGGER.warning("DOCX text extraction failed for %s: %s", path.name, exc)
        return "", "", f"Could not read DOCX: {exc}"


def _escape_html(text: str) -> str:
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def _extract_docx_text(path: Path) -> tuple[str, str | None]:
    """Extract readable text from a .docx (OOXML). Returns (text, error)."""

    text, _html, err = _extract_docx_rich(path)
    return text, err


def run_ocr_pipeline(stored_path: Path | str) -> OcrResult:
    """Extract text from PDF, DOCX, image, or plain-text uploads."""

    path = Path(stored_path)
    suffix = path.suffix.lower()
    meta: dict[str, Any] = {"filename": path.name}

    if suffix == ".pdf":
        text, pages = _extract_pdf_text(path)
        if len(text.strip()) >= 80:
            return OcrResult(
                text=text,
                method="pdf_text",
                confidence=0.92,
                processing_status="processed",
                page_count=max(pages, 1),
                metadata=meta,
            )
        # Scanned PDF — rasterize first page attempt via fitz pixmap + tesseract
        try:
            import fitz

            doc = fitz.open(path)
            chunks: list[str] = []
            confidences: list[float] = []
            for page in doc:
                pix = page.get_pixmap(dpi=200)
                tmp = path.with_suffix(f".page{page.number}.png")
                pix.save(tmp)
                t, c = _ocr_image(tmp)
                if t.strip():
                    chunks.append(t)
                    confidences.append(c)
                tmp.unlink(missing_ok=True)
            doc.close()
            combined = "\n\n".join(chunks)
            conf = sum(confidences) / len(confidences) if confidences else 0.5
            return OcrResult(
                text=combined,
                method="tesseract_pdf",
                confidence=round(conf, 3),
                processing_status="processed" if combined.strip() else "failed",
                page_count=len(chunks) or 1,
                metadata=meta,
            )
        except Exception as exc:
            LOGGER.warning("PDF OCR fallback failed: %s", exc)

    if suffix == ".docx":
        text, html, err = _extract_docx_rich(path)
        if text.strip():
            structure_meta: dict[str, Any] = {}
            try:
                from app.services.template_structure import parse_template_structure

                sections = parse_template_structure(text, prefer_creac=True)
                if sections:
                    structure_meta["sections"] = sections
            except Exception as exc:
                LOGGER.debug("template structure parse skipped: %s", exc)
            if html.strip():
                structure_meta["html_preview"] = html[:120_000]
            return OcrResult(
                text=text,
                method="docx_text",
                confidence=0.95,
                processing_status="processed",
                page_count=1,
                metadata={**meta, **structure_meta},
            )
        return OcrResult(
            text="",
            method="docx_text",
            confidence=0.0,
            processing_status="failed",
            page_count=0,
            metadata={
                **meta,
                "reason": err
                or "DOCX text extraction failed. Re-save as .docx (not .doc) or upload a PDF.",
            },
        )

    if suffix == ".doc":
        return OcrResult(
            text="",
            method="unsupported",
            confidence=0.0,
            processing_status="failed",
            page_count=0,
            metadata={
                **meta,
                "reason": "Legacy .doc is not supported. Save as .docx or PDF and upload again.",
            },
        )

    if suffix in {".png", ".jpg", ".jpeg", ".tif", ".tiff", ".webp", ".bmp", ".gif"}:
        text, conf = _ocr_image(path)
        return OcrResult(
            text=text,
            method="tesseract",
            confidence=conf or 0.5,
            processing_status="processed" if text.strip() else "failed",
            page_count=1,
            metadata=meta,
        )

    if suffix in {".txt", ".md", ".csv"}:
        try:
            raw = path.read_text(encoding="utf-8", errors="replace")
            if raw.strip():
                return OcrResult(
                    text=raw,
                    method="plain_text",
                    confidence=0.99,
                    processing_status="processed",
                    page_count=1,
                    metadata=meta,
                )
        except Exception as exc:
            LOGGER.warning("Plain text read failed for %s: %s", path.name, exc)

    # Avoid treating binary Office/ZIP files as UTF-8 plain text (garbled OCR).
    return OcrResult(
        text="",
        method="unsupported",
        confidence=0.0,
        processing_status="failed",
        page_count=0,
        metadata={
            **meta,
            "reason": (
                f"Unsupported file type ({suffix or 'unknown'}). "
                "Upload a PDF, DOCX, image (PNG/JPG), or plain text file."
            ),
        },
    )
