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


def _extract_docx_text(path: Path) -> tuple[str, str | None]:
    """Extract readable text from a .docx (OOXML). Returns (text, error)."""

    try:
        from docx import Document  # type: ignore[import-not-found]
    except ImportError:
        return "", "python-docx is not installed on the API server"

    try:
        doc = Document(str(path))
        parts: list[str] = []
        for paragraph in doc.paragraphs:
            text = (paragraph.text or "").strip()
            if text:
                parts.append(text)
        for table in doc.tables:
            for row in table.rows:
                cells = [(cell.text or "").strip() for cell in row.cells]
                cells = [c for c in cells if c]
                if cells:
                    parts.append(" | ".join(cells))
        combined = "\n\n".join(parts).strip()
        if not combined:
            return "", "DOCX opened but contained no extractable text"
        return combined, None
    except Exception as exc:
        LOGGER.warning("DOCX text extraction failed for %s: %s", path.name, exc)
        return "", f"Could not read DOCX: {exc}"


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
        text, err = _extract_docx_text(path)
        if text.strip():
            return OcrResult(
                text=text,
                method="docx_text",
                confidence=0.95,
                processing_status="processed",
                page_count=1,
                metadata=meta,
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
