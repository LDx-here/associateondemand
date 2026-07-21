"use client";

import { ChevronDown, ChevronRight, Eye, FileText, FolderOpen } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { UploadResult } from "@/components/IntakeUploadShared";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import {
  documentCategoryLabel,
  documentFilePreviewUrl,
  documentPreviewKind,
  documentPreviewSupportsFile,
  documentStatusLabel,
  documentStorageNote,
  documentViewLabel,
} from "@/lib/document-display";
import { getBlobPreview, getCachedDocumentPreview } from "@/lib/document-preview-cache";
import type { DocumentRow } from "@/lib/types";
import { btnSecondary } from "@/lib/ui-classes";
import { formatDate } from "@/lib/utils";

export function MatterDocumentsList({
  matterId,
  documents,
  highlightId,
  uploadPreviews = {},
}: {
  matterId: string;
  documents: DocumentRow[];
  highlightId?: string | null;
  uploadPreviews?: Record<string, UploadResult>;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});

  useEffect(() => {
    if (!highlightId) return;
    setExpandedId(highlightId);
    const row = rowRefs.current[highlightId];
    if (row) {
      window.requestAnimationFrame(() => {
        row.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }
  }, [highlightId, documents]);

  function openPreview(docId: string) {
    setExpandedId(docId);
    const row = rowRefs.current[docId];
    if (row) {
      window.requestAnimationFrame(() => {
        row.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    }
  }

  return (
    <section className="space-y-3">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start gap-2">
          <FolderOpen className="mt-0.5 h-5 w-5 shrink-0 text-slate-600" aria-hidden />
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Matters → {matterId} → Documents
            </p>
            <h2 className="text-sm font-semibold text-slate-900">Documents for this matter</h2>
            <p className="mt-1 text-xs text-slate-600">
              All files for this matter are listed below — not a separate folder on your computer.
              Use <strong>View</strong> on any row to open the PDF or image preview.
            </p>
          </div>
        </div>
      </div>

      <div
        id="matter-documents-list"
        className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm"
      >
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="w-8 px-2 py-3" aria-label="Expand" />
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Uploaded</th>
              <th className="px-4 py-3">Preview</th>
            </tr>
          </thead>
          <tbody>
            {documents.length ? (
              documents.map((doc) => {
                const preview = uploadPreviews[doc.id];
                const status = documentStatusLabel(doc, preview);
                const isHighlighted = highlightId === doc.id;
                const isExpanded = expandedId === doc.id;
                const previewKind = documentPreviewKind(doc, preview);
                const canPreviewFile = documentPreviewSupportsFile(previewKind);
                const cached = getCachedDocumentPreview(matterId, doc.id);
                const postgresDocumentId = preview?.document_id ?? cached?.postgresDocumentId;
                const blobUrl = getBlobPreview(matterId, doc.id);

                return (
                  <DocumentRowGroup
                    key={doc.id}
                    doc={doc}
                    matterId={matterId}
                    preview={preview}
                    status={status}
                    previewKind={previewKind}
                    canPreviewFile={canPreviewFile}
                    postgresDocumentId={postgresDocumentId}
                    blobUrl={blobUrl}
                    isHighlighted={isHighlighted}
                    isExpanded={isExpanded}
                    rowRef={(el) => {
                      rowRefs.current[doc.id] = el;
                    }}
                    onToggle={() => setExpandedId((id) => (id === doc.id ? null : doc.id))}
                    onView={() => openPreview(doc.id)}
                  />
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="p-0">
                  <EmptyState
                    icon={FileText}
                    title="No documents yet."
                    description="Upload a case assessment or supporting file below. New uploads appear in this list immediately."
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function DocumentRowGroup({
  doc,
  matterId,
  preview,
  status,
  previewKind,
  canPreviewFile,
  postgresDocumentId,
  blobUrl,
  isHighlighted,
  isExpanded,
  rowRef,
  onToggle,
  onView,
}: {
  doc: DocumentRow;
  matterId: string;
  preview?: UploadResult;
  status: ReturnType<typeof documentStatusLabel>;
  previewKind: ReturnType<typeof documentPreviewKind>;
  canPreviewFile: boolean;
  postgresDocumentId?: string;
  blobUrl?: string;
  isHighlighted: boolean;
  isExpanded: boolean;
  rowRef: (el: HTMLTableRowElement | null) => void;
  onToggle: () => void;
  onView: () => void;
}) {
  const textPreview = preview?.text_preview?.trim();
  const viewLabel = documentViewLabel(previewKind);

  return (
    <>
      <tr
        ref={rowRef}
        className={`border-t border-slate-100 transition-colors ${
          isHighlighted ? "bg-emerald-50 ring-2 ring-inset ring-emerald-400" : "hover:bg-slate-50/80"
        }`}
      >
        <td className="px-2 py-3">
          <button
            type="button"
            className="rounded p-1 text-slate-500 hover:bg-slate-100"
            aria-expanded={isExpanded}
            aria-label={isExpanded ? "Collapse preview" : "Expand preview"}
            onClick={onToggle}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" aria-hidden />
            ) : (
              <ChevronRight className="h-4 w-4" aria-hidden />
            )}
          </button>
        </td>
        <td className="px-4 py-3">
          <button type="button" className="text-left font-medium text-slate-900 hover:underline" onClick={onView}>
            {doc.title}
          </button>
          {isHighlighted ? (
            <span className="ml-2 inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[0.65rem] font-medium text-emerald-900">
              Just uploaded
            </span>
          ) : null}
        </td>
        <td className="px-4 py-3 text-slate-700">{documentCategoryLabel(doc.category)}</td>
        <td className="px-4 py-3">
          <StatusBadge status={status} />
        </td>
        <td className="px-4 py-3 tabular-nums text-slate-600">{formatDate(doc.uploadedAt)}</td>
        <td className="px-4 py-3">
          {canPreviewFile ? (
            <button
              type="button"
              className={`${btnSecondary} inline-flex items-center gap-1.5 text-xs`}
              onClick={onView}
              title={viewLabel}
            >
              <Eye className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {viewLabel}
            </button>
          ) : (
            <span
              className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-400"
              title="No file preview for this document type"
            >
              <Eye className="h-3.5 w-3.5 shrink-0" aria-hidden />
              No preview
            </span>
          )}
        </td>
      </tr>
      {isExpanded ? (
        <tr className="border-t border-slate-50 bg-slate-50/60">
          <td colSpan={6} className="px-4 py-3">
            <DocumentPreviewPanel
              doc={doc}
              matterId={matterId}
              preview={preview}
              previewKind={previewKind}
              textPreview={textPreview}
              postgresDocumentId={postgresDocumentId}
              blobUrl={blobUrl}
            />
          </td>
        </tr>
      ) : null}
    </>
  );
}

function DocumentPreviewPanel({
  doc,
  matterId,
  preview,
  previewKind,
  textPreview,
  postgresDocumentId,
  blobUrl,
}: {
  doc: DocumentRow;
  matterId: string;
  preview?: UploadResult;
  previewKind: ReturnType<typeof documentPreviewKind>;
  textPreview?: string;
  postgresDocumentId?: string;
  blobUrl?: string;
}) {
  const showFilePreview = documentPreviewSupportsFile(previewKind);

  return (
    <div className="space-y-3 text-sm text-slate-700">
      <p className="text-xs text-slate-500">{documentStorageNote(matterId)}</p>

      {showFilePreview ? (
        <DocumentFilePreview
          matterId={matterId}
          documentId={doc.id}
          title={doc.title}
          previewKind={previewKind}
          postgresDocumentId={postgresDocumentId}
          blobUrl={blobUrl}
        />
      ) : null}

      {textPreview ? (
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">OCR excerpt</p>
          <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-md border border-slate-200 bg-white p-3 font-mono text-xs leading-relaxed">
            {textPreview}
          </pre>
        </div>
      ) : (
        <p className="text-xs text-slate-500">
          No OCR preview stored for this document yet. Re-upload or open a case assessment to view extracted
          facts.
        </p>
      )}

      {preview?.facts?.length ? (
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Extracted facts</p>
          <ul className="list-disc space-y-1 pl-5 text-xs">
            {preview.facts.slice(0, 8).map((f, i) => (
              <li key={`${f.fact_type}-${i}`}>
                <span className="font-medium">{f.fact_type}:</span> {f.value}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <dl className="grid gap-2 text-xs sm:grid-cols-2">
        {preview?.ocr_method ? (
          <div>
            <dt className="text-slate-500">OCR method</dt>
            <dd>{preview.ocr_method}</dd>
          </div>
        ) : null}
        {preview?.confidence != null ? (
          <div>
            <dt className="text-slate-500">Confidence</dt>
            <dd>{Math.round(preview.confidence * 100)}%</dd>
          </div>
        ) : null}
        {doc.uploadedBy ? (
          <div>
            <dt className="text-slate-500">Uploaded by</dt>
            <dd>{doc.uploadedBy}</dd>
          </div>
        ) : null}
        <div>
          <dt className="text-slate-500">Document ID</dt>
          <dd className="font-mono text-[0.65rem]">{doc.id}</dd>
        </div>
        {postgresDocumentId ? (
          <div>
            <dt className="text-slate-500">Processing ID</dt>
            <dd className="font-mono text-[0.65rem]">{postgresDocumentId}</dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}

function DocumentFilePreview({
  matterId,
  documentId,
  title,
  previewKind,
  postgresDocumentId,
  blobUrl,
}: {
  matterId: string;
  documentId: string;
  title: string;
  previewKind: "pdf" | "image";
  postgresDocumentId?: string;
  blobUrl?: string;
}) {
  const serverUrl = documentFilePreviewUrl(matterId, documentId, title, postgresDocumentId);
  const [status, setStatus] = useState<"checking" | "ready" | "unavailable">(blobUrl ? "ready" : "checking");
  const [errorDetail, setErrorDetail] = useState<string | null>(null);

  useEffect(() => {
    if (blobUrl) {
      setStatus("ready");
      setErrorDetail(null);
      return;
    }

    let cancelled = false;
    setStatus("checking");
    setErrorDetail(null);

    fetch(serverUrl, { method: "HEAD" })
      .then(async (resp) => {
        if (cancelled) return;
        if (resp.ok) {
          setStatus("ready");
          return;
        }
        setStatus("unavailable");
        try {
          const body = (await fetch(serverUrl).then((r) => r.json())) as { error?: string };
          setErrorDetail(body.error ?? `HTTP ${resp.status}`);
        } catch {
          setErrorDetail(`HTTP ${resp.status}`);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatus("unavailable");
          setErrorDetail("Document service unavailable");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [serverUrl, blobUrl]);

  const displayUrl = blobUrl ?? serverUrl;
  const previewLabel = previewKind === "pdf" ? "PDF preview" : "Image preview";

  if (status === "checking") {
    return (
      <div className="rounded-md border border-slate-200 bg-white px-3 py-4">
        <p className="text-xs text-slate-500">Loading {previewKind === "pdf" ? "PDF" : "image"} preview…</p>
      </div>
    );
  }

  if (status === "unavailable") {
    return (
      <div
        className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-950"
        role="alert"
      >
        <p className="font-medium">{previewLabel} unavailable</p>
        <p className="mt-1">
          {errorDetail === "Document service unavailable" || errorDetail === "HTTP 503"
            ? "The document processing API is offline or not deployed. File preview requires the Fly API deploy with /intake/documents endpoints."
            : errorDetail === "File not available on server" || errorDetail === "HTTP 404"
              ? "The file binary is not on the processing server (older upload, or ephemeral Fly disk). Re-upload to preview, or use the OCR excerpt below."
              : (errorDetail ?? "Could not load file from server.")}
        </p>
        {!postgresDocumentId ? (
          <p className="mt-1 text-rose-800">
            No processing ID linked to this row — re-upload the file so preview can resolve it.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{previewLabel}</p>
      {blobUrl ? (
        <p className="mb-2 text-xs text-emerald-800">Showing your upload from this browser session.</p>
      ) : null}
      {previewKind === "pdf" ? (
        <iframe
          src={displayUrl}
          title={`Preview: ${title}`}
          className="h-[min(480px,70vh)] w-full rounded-md border border-slate-200 bg-white"
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={displayUrl}
          alt={`Preview: ${title}`}
          className="max-h-[min(480px,70vh)] w-full rounded-md border border-slate-200 bg-white object-contain"
        />
      )}
    </div>
  );
}
