"""Intelligent Document Ingestion — OCR and text extraction pipeline."""

from __future__ import annotations

import io
import logging
import os
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

MIN_CHARS_PER_PAGE = 40
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".tif", ".tiff", ".bmp", ".webp"}


@dataclass
class PageResult:
    page_num: int
    text: str
    method: str
    confidence: float


@dataclass
class OCRPipelineResult:
    text: str
    method: str
    confidence: float
    processing_status: str
    page_count: int
    pages: list[PageResult] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)


def _ocr_provider() -> str:
    return os.getenv("OCR_PROVIDER", "tesseract").lower()


def _aws_configured() -> bool:
    return bool(os.getenv("AWS_ACCESS_KEY_ID") and os.getenv("AWS_SECRET_ACCESS_KEY"))


def _extract_pdf_text_pypdf(path: Path) -> tuple[str, int, list[PageResult]]:
    from pypdf import PdfReader

    reader = PdfReader(str(path))
    pages: list[PageResult] = []
    chunks: list[str] = []
    for idx, page in enumerate(reader.pages, start=1):
        text = (page.extract_text() or "").strip()
        pages.append(PageResult(page_num=idx, text=text, method="pdf_text", confidence=0.95 if text else 0.0))
        if text:
            chunks.append(text)
    return "\n\n".join(chunks), len(reader.pages), pages


def _extract_pdf_text_pdfplumber(path: Path) -> tuple[str, int, list[PageResult]]:
    import pdfplumber

    pages: list[PageResult] = []
    chunks: list[str] = []
    with pdfplumber.open(str(path)) as pdf:
        for idx, page in enumerate(pdf.pages, start=1):
            text = (page.extract_text() or "").strip()
            pages.append(PageResult(page_num=idx, text=text, method="pdf_text", confidence=0.95 if text else 0.0))
            if text:
                chunks.append(text)
        page_count = len(pdf.pages)
    return "\n\n".join(chunks), page_count, pages


def _render_pdf_pages(path: Path, dpi: int = 200) -> list[tuple[int, Any]]:
    from pdf2image import convert_from_path

    images = convert_from_path(str(path), dpi=dpi)
    return list(enumerate(images, start=1))


def _ocr_image_tesseract(image: Any) -> tuple[str, float]:
    import pytesseract
    from PIL import Image

    if not isinstance(image, Image.Image):
        image = Image.open(image)
    data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT)
    text = pytesseract.image_to_string(image).strip()
    confidences = [int(c) for c in data.get("conf", []) if str(c).lstrip("-").isdigit() and int(c) >= 0]
    avg_conf = (sum(confidences) / len(confidences) / 100.0) if confidences else 0.35
    return text, min(max(avg_conf, 0.0), 1.0)


def _ocr_bytes_textract(content: bytes) -> tuple[str, float]:
    import boto3

    client = boto3.client("textract", region_name=os.getenv("AWS_REGION", "us-east-1"))
    response = client.detect_document_text(Document={"Bytes": content})
    lines: list[str] = []
    confidences: list[float] = []
    for block in response.get("Blocks", []):
        if block.get("BlockType") == "LINE":
            lines.append(block.get("Text", ""))
            if "Confidence" in block:
                confidences.append(float(block["Confidence"]) / 100.0)
    text = "\n".join(lines).strip()
    avg = sum(confidences) / len(confidences) if confidences else 0.7
    return text, min(max(avg, 0.0), 1.0)


def _ocr_pdf_textract(path: Path) -> tuple[str, int, list[PageResult]]:
    content = path.read_bytes()
    text, conf = _ocr_bytes_textract(content)
    pages = [PageResult(page_num=1, text=text, method="textract", confidence=conf)]
    return text, 1, pages


def _ocr_pages_tesseract(path: Path) -> tuple[str, int, list[PageResult]]:
    rendered = _render_pdf_pages(path)
    pages: list[PageResult] = []
    chunks: list[str] = []
    for page_num, image in rendered:
        text, conf = _ocr_image_tesseract(image)
        pages.append(PageResult(page_num=page_num, text=text, method="tesseract", confidence=conf))
        if text:
            chunks.append(text)
    return "\n\n".join(chunks), len(rendered), pages


def _fix_needs_ocr(text: str, page_count: int) -> bool:
    if not text.strip():
        return True
    if page_count <= 0:
        return True
    return len(text.strip()) / max(page_count, 1) < MIN_CHARS_PER_PAGE


def _ocr_image_file(path: Path) -> OCRPipelineResult:
    provider = _ocr_provider()
    if provider == "textract" and _aws_configured():
        content = path.read_bytes()
        text, conf = _ocr_bytes_textract(content)
        page = PageResult(page_num=1, text=text, method="textract", confidence=conf)
        status = "success" if text else "failed"
        return OCRPipelineResult(
            text=text,
            method="textract",
            confidence=conf,
            processing_status=status,
            page_count=1,
            pages=[page],
            metadata={"filename": path.name},
        )

    text, conf = _ocr_image_tesseract(path)
    page = PageResult(page_num=1, text=text, method="tesseract", confidence=conf)
    status = "success" if text else "partial" if conf > 0 else "failed"
    return OCRPipelineResult(
        text=text,
        method="tesseract",
        confidence=conf,
        processing_status=status,
        page_count=1,
        pages=[page],
        metadata={"filename": path.name},
    )


def _ocr_pdf(path: Path) -> OCRPipelineResult:
    text = ""
    page_count = 0
    pages: list[PageResult] = []
    method = "pdf_text"

    try:
        text, page_count, pages = _extract_pdf_text_pdfplumber(path)
        method = "pdfplumber"
    except Exception as exc:
        logger.warning("pdfplumber failed for %s: %s", path, exc)
        try:
            text, page_count, pages = _extract_pdf_text_pypdf(path)
            method = "pypdf"
        except Exception as exc2:
            logger.warning("pypdf failed for %s: %s", path, exc2)
            text, page_count, pages = "", 0, []

    if _fix_needs_ocr(text, page_count):
        provider = _ocr_provider()
        if provider == "textract" and _aws_configured():
            try:
                text, page_count, pages = _ocr_pdf_textract(path)
                method = "textract"
            except Exception as exc:
                logger.warning("Textract failed for %s: %s — falling back to tesseract", path, exc)
                text, page_count, pages = _ocr_pages_tesseract(path)
                method = "tesseract"
        else:
            text, page_count, pages = _ocr_pages_tesseract(path)
            method = "tesseract"

    confidences = [p.confidence for p in pages if p.text.strip()]
    avg_conf = sum(confidences) / len(confidences) if confidences else 0.0

    if not text.strip():
        status = "failed"
    elif avg_conf < 0.4:
        status = "partial"
    else:
        status = "success"

    return OCRPipelineResult(
        text=text.strip(),
        method=method,
        confidence=round(avg_conf, 3),
        processing_status=status,
        page_count=page_count,
        pages=pages,
        metadata={"filename": path.name, "ocr_provider": _ocr_provider()},
    )


def _ocr_plaintext(path: Path) -> OCRPipelineResult:
    raw = path.read_text(encoding="utf-8", errors="replace")
    return OCRPipelineResult(
        text=raw.strip(),
        method="plaintext",
        confidence=1.0,
        processing_status="success" if raw.strip() else "failed",
        page_count=1,
        pages=[PageResult(page_num=1, text=raw, method="plaintext", confidence=1.0)],
        metadata={"filename": path.name},
    )


def run_ocr_pipeline(file_path: str | Path) -> OCRPipelineResult:
    """Extract text from a document — digital PDF layer first, OCR fallback for scans."""

    path = Path(file_path)
    if not path.exists():
        return OCRPipelineResult(
            text="",
            method="none",
            confidence=0.0,
            processing_status="failed",
            page_count=0,
            metadata={"error": "file not found", "path": str(path)},
        )

    suffix = path.suffix.lower()
    if suffix == ".pdf":
        return _ocr_pdf(path)
    if suffix in IMAGE_EXTENSIONS:
        return _ocr_image_file(path)
    if suffix in {".txt", ".md"}:
        return _ocr_plaintext(path)

    # Unknown — try OCR as image bytes
    try:
        return _ocr_image_file(path)
    except Exception as exc:
        logger.exception("OCR pipeline failed for %s", path)
        return OCRPipelineResult(
            text="",
            method="none",
            confidence=0.0,
            processing_status="failed",
            page_count=0,
            metadata={"error": str(exc), "filename": path.name},
        )


def text_quality_score(text: str) -> float:
    """Heuristic 0–1 score for extracted text usability."""

    if not text.strip():
        return 0.0
    alpha_ratio = sum(c.isalpha() for c in text) / max(len(text), 1)
    word_count = len(re.findall(r"\w+", text))
    length_score = min(word_count / 100.0, 1.0)
    return round(min(1.0, alpha_ratio * 0.5 + length_score * 0.5), 3)
