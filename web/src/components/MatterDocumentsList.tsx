"use client";

import { ChevronDown, ChevronRight, FileText, FolderOpen } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { UploadResult } from "@/components/IntakeUploadShared";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import {
  documentCategoryLabel,
  documentPreviewKind,
  documentStatusLabel,
  documentStorageNote,
} from "@/lib/document-display";
import type { DocumentRow } from "@/lib/types";
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
              Uploads are saved to this matter&apos;s Documents tab in Airtable.
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
            </tr>
          </thead>
          <tbody>
            {documents.length ? (
              documents.map((doc) => {
                const preview = uploadPreviews[doc.id];
                const status = documentStatusLabel(doc, preview);
                const isHighlighted = highlightId === doc.id;
                const isExpanded = expandedId === doc.id;

                return (
                  <DocumentRowGroup
                    key={doc.id}
                    doc={doc}
                    matterId={matterId}
                    preview={preview}
                    status={status}
                    isHighlighted={isHighlighted}
                    isExpanded={isExpanded}
                    rowRef={(el) => {
                      rowRefs.current[doc.id] = el;
                    }}
                    onToggle={() => setExpandedId((id) => (id === doc.id ? null : doc.id))}
                  />
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="p-0">
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
  isHighlighted,
  isExpanded,
  rowRef,
  onToggle,
}: {
  doc: DocumentRow;
  matterId: string;
  preview?: UploadResult;
  status: ReturnType<typeof documentStatusLabel>;
  isHighlighted: boolean;
  isExpanded: boolean;
  rowRef: (el: HTMLTableRowElement | null) => void;
  onToggle: () => void;
}) {
  const previewKind = documentPreviewKind(doc, preview);
  const textPreview = preview?.text_preview?.trim();

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
          <button type="button" className="text-left font-medium text-slate-900 hover:underline" onClick={onToggle}>
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
      </tr>
      {isExpanded ? (
        <tr className="border-t border-slate-50 bg-slate-50/60">
          <td colSpan={5} className="px-4 py-3">
            <DocumentPreviewPanel
              doc={doc}
              matterId={matterId}
              preview={preview}
              previewKind={previewKind}
              textPreview={textPreview}
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
}: {
  doc: DocumentRow;
  matterId: string;
  preview?: UploadResult;
  previewKind: ReturnType<typeof documentPreviewKind>;
  textPreview?: string;
}) {
  return (
    <div className="space-y-3 text-sm text-slate-700">
      <p className="text-xs text-slate-500">{documentStorageNote(matterId)}</p>

      {previewKind === "image" && textPreview ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          Image uploaded — OCR text excerpt shown below. Original image is stored on RMV processing servers
          (not attached in Airtable).
        </p>
      ) : null}

      {previewKind === "pdf" && textPreview ? (
        <p className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-950">
          PDF processed — preview shows OCR text excerpt. Full PDF is stored on RMV processing servers.
        </p>
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
      </dl>
    </div>
  );
}
