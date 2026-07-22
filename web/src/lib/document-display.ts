import type { UploadResult } from "@/components/IntakeUploadShared";
import { parseDocumentCategory } from "@/lib/assessment-documents";
import type { DocumentRow } from "@/lib/types";

/** Human-readable document status for matter Documents tab. */
export function documentStatusLabel(
  doc: DocumentRow,
  preview?: UploadResult,
): "Uploaded" | "OCR processing" | "Ready" {
  const processing = (preview?.processing_status ?? doc.ocrStatus ?? "").toLowerCase();
  if (processing.includes("process") || processing === "pending") {
    return "OCR processing";
  }
  if (preview?.text_preview || preview?.ocr_method || processing.includes("done") || processing === "processed") {
    return "Ready";
  }
  return "Uploaded";
}

/** Plain-language category label (not raw snake_case). */
export function documentCategoryLabel(category: string): string {
  const parsed = parseDocumentCategory(category);
  if (parsed.role === "case_assessment") return "Case assessment";
  if (parsed.role === "assessment_template") {
    return parsed.practiceArea
      ? `Firm template (${parsed.practiceArea.replace("_", " ")})`
      : "Firm template";
  }
  if (parsed.role === "firm_sample") {
    return parsed.practiceArea
      ? `Firm sample (${parsed.practiceArea.replace("_", " ")})`
      : "Firm sample";
  }
  if (parsed.role === "deliverable_template") {
    return parsed.deliverableId
      ? `Deliverable template (${parsed.deliverableId})`
      : "Deliverable template";
  }
  if (!category?.trim()) return "General";
  return category.replace(/_/g, " ");
}

export function documentStorageNote(matterId: string): string {
  return `Stored in Airtable Documents (matter ${matterId})`;
}

/** Same-origin URL for in-app PDF preview (auth-protected proxy to Fly storage). */
export function documentFilePreviewUrl(
  matterId: string,
  documentId: string,
  title: string,
  postgresDocumentId?: string,
): string {
  const params = new URLSearchParams({ title });
  if (postgresDocumentId) {
    params.set("postgresId", postgresDocumentId);
  }
  return `/api/matters/${encodeURIComponent(matterId)}/documents/${encodeURIComponent(documentId)}/file?${params.toString()}`;
}

/** Infer preview kind from filename / mime for inline viewers. */
export function documentPreviewKind(
  doc: DocumentRow,
  preview?: UploadResult,
): "pdf" | "image" | "text" | "metadata" {
  const name = (preview?.filename ?? doc.title ?? "").toLowerCase();
  const type = (doc.fileType ?? "").toLowerCase();
  if (name.endsWith(".pdf") || type.includes("pdf")) return "pdf";
  if (/\.(png|jpe?g|gif|webp|tif|tiff)$/.test(name) || type.startsWith("image/")) return "image";
  if (
    name.endsWith(".txt") ||
    name.endsWith(".md") ||
    name.endsWith(".docx") ||
    type.startsWith("text/") ||
    type.includes("wordprocessingml") ||
    type.includes("msword")
  ) {
    return "text";
  }
  return "metadata";
}

export function documentPreviewSupportsFile(
  kind: ReturnType<typeof documentPreviewKind>,
): kind is "pdf" | "image" {
  return kind === "pdf" || kind === "image";
}

export function documentViewLabel(kind: ReturnType<typeof documentPreviewKind>): string {
  if (kind === "pdf") return "View PDF";
  if (kind === "image") return "View image";
  if (kind === "text") return "View text";
  return "View";
}
