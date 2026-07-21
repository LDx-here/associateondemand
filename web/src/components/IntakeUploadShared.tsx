"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  documentFilePreviewUrl,
  documentPreviewKind,
  documentPreviewSupportsFile,
  documentViewLabel,
} from "@/lib/document-display";
import { cacheDocumentPreview, getBlobPreview, setBlobPreview } from "@/lib/document-preview-cache";
import { formatOcrConfidence } from "@/lib/extraction-confidence";
import { btnSecondary } from "@/lib/ui-classes";

const TIER = Number(process.env.NEXT_PUBLIC_PII_TIER ?? "0");

/** Simple attorney-facing copy — full tier policy lives in Settings. */
export function UploadSupportingDocsHint({ context }: { context: "matter" | "assignment" | "assessment" }) {
  const label =
    context === "assignment"
      ? "Upload supporting documents for this assignment (PDF, image, or text)."
      : context === "assessment"
        ? "Upload a case assessment scan (PDF or image)."
        : "Upload supporting documents for this matter (PDF, image, or text).";
  return <p className="text-xs text-slate-600">{label}</p>;
}

export function TierZeroBanner({
  approved,
  onApprovedChange,
}: {
  approved: boolean;
  onApprovedChange: (v: boolean) => void;
}) {
  if (TIER >= 1) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
        PII tier {TIER}: Strong Reader enabled when Presidio sidecar is healthy.
      </div>
    );
  }

  return (
    <div
      className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
      role="alert"
    >
      <p className="font-medium">Tier 0: manual attorney approval required</p>
      <p className="mt-1 text-amber-900">
        Documents with client PII are not auto-processed until Strong Reader tier 1 is enabled by IT.
        For controlled testing on de-identified or synthetic scans, confirm below.
      </p>
      <label className="mt-3 flex cursor-pointer items-start gap-2">
        <input
          checked={approved}
          className="mt-0.5"
          type="checkbox"
          onChange={(e) => onApprovedChange(e.target.checked)}
        />
        <span>
          I confirm this upload is approved for manual Strong Reader processing under tier 0 firm
          policy.
        </span>
      </label>
    </div>
  );
}

export function tierRequiresManualApproval(): boolean {
  return TIER < 1;
}

/** Attorney-facing uploads auto-approve tier-0 manual review (logged-in counsel). */
export function attorneyUploadApproved(): boolean {
  return tierRequiresManualApproval();
}

export type UploadResult = {
  document_id?: string;
  airtable_document_id?: string;
  filename?: string;
  ocr_method?: string;
  processing_status?: string;
  confidence?: number;
  category?: string;
  facts_extracted?: number;
  facts?: Array<{ fact_type: string; value: string; confidence: number }>;
  obsidian_path?: string;
  text_preview?: string;
  error?: string;
};

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function uploadDocument(
  matterId: string,
  file: File,
  manualApproved: boolean,
  endpoint: "single" | "batch" = "single",
  options?: { documentCategory?: string; extractionContext?: Record<string, unknown> },
): Promise<UploadResult> {
  const fd = new FormData();
  fd.set("matter_id", matterId);
  if (endpoint === "single") {
    fd.set("file", file);
  } else {
    fd.append("files", file);
  }
  if (options?.documentCategory) {
    fd.set("document_category", options.documentCategory);
  }
  if (options?.extractionContext) {
    fd.set("extraction_context", JSON.stringify(options.extractionContext));
  }
  if (manualApproved) {
    fd.set("manual_review_approved", "true");
  }

  const url = endpoint === "single" ? `${API}/intake/upload` : `${API}/intake/batch`;

  const resp = await fetch(url, {
    method: "POST",
    body: fd,
    headers: manualApproved ? { "X-Manual-Review-Approved": "true" } : {},
  });
  const data = await resp.json();
  if (!resp.ok) {
    const detail = typeof data.detail === "string" ? data.detail : JSON.stringify(data);
    return { error: detail };
  }
  if (endpoint === "batch" && Array.isArray(data.documents)) {
    const match = data.documents.find((d: UploadResult) => d.filename === file.name);
    return match ?? data.documents[data.documents.length - 1] ?? data;
  }
  return data;
}

/** Cache postgres + blob preview so Matter Documents tab and inline View PDF work after upload. */
export function cacheUploadPreview(
  matterId: string,
  file: File,
  result: UploadResult,
): string | undefined {
  const docId = result.airtable_document_id;
  if (!docId) return undefined;
  cacheDocumentPreview(matterId, docId, {
    postgresDocumentId: result.document_id,
    filename: result.filename ?? file.name,
  });
  setBlobPreview(matterId, docId, file);
  return docId;
}

export function matterDocumentsHref(
  matterId: string,
  highlightDocId?: string,
): `/matters/${string}` {
  const base = `/matters/${encodeURIComponent(matterId)}` as `/matters/${string}`;
  if (!highlightDocId) return base;
  return `${base}?highlightDoc=${encodeURIComponent(highlightDocId)}` as `/matters/${string}`;
}

export function UploadProgressList({
  items,
}: {
  items: Array<{
    name: string;
    status: "pending" | "uploading" | "done" | "error";
    result?: UploadResult;
  }>;
}) {
  if (!items.length) return null;
  return (
    <ul className="space-y-2 rounded-lg border border-slate-200 bg-white p-4 text-sm">
      {items.map((item) => (
        <li key={item.name} className="border-b border-slate-100 pb-2 last:border-0 last:pb-0">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate font-medium">{item.name}</span>
            <span
              className={
                item.status === "done"
                  ? "text-emerald-700"
                  : item.status === "error"
                    ? "text-red-700"
                    : item.status === "uploading"
                      ? "text-slate-700"
                      : "text-slate-500"
              }
            >
              {item.status === "pending" && "Queued"}
              {item.status === "uploading" && "Processing OCR…"}
              {item.status === "done" &&
                (() => {
                  const ocr = formatOcrConfidence(item.result?.confidence);
                  return `${item.result?.processing_status ?? "done"} · ${item.result?.ocr_method ?? ""}${ocr ? ` · ${ocr.shortLabel}` : ""}`;
                })()}
              {item.status === "error" && (item.result?.error ?? "Failed")}
            </span>
          </div>
          {item.status === "done" && item.result?.facts?.length ? (
            <ul className="mt-1 list-inside list-disc text-xs text-slate-600">
              {item.result.facts.slice(0, 4).map((f) => (
                <li key={`${f.fact_type}-${f.value}`}>
                  {f.fact_type}: {f.value}
                </li>
              ))}
            </ul>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/** BUILD_SPEC §7.8 progress table: filename, status, category, View PDF. */
export function UploadProgressTable({
  items,
  matterId,
  filesByName,
}: {
  items: Array<{
    name: string;
    status: "pending" | "uploading" | "done" | "error";
    result?: UploadResult;
  }>;
  /** When set, enables View PDF + link to Matter → Documents tab. */
  matterId?: string;
  filesByName?: Record<string, File>;
}) {
  if (!items.length) return null;
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
          <tr>
            <th className="px-3 py-2">Filename</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Category</th>
            <th className="px-3 py-2">OCR</th>
            {matterId ? <th className="px-3 py-2">Preview</th> : null}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <UploadProgressRow
              key={item.name}
              item={item}
              matterId={matterId}
              file={filesByName?.[item.name]}
            />
          ))}
        </tbody>
      </table>
      {matterId ? (
        <p className="border-t border-slate-100 px-3 py-2 text-xs text-slate-600">
          Saved to{" "}
          <Link className="font-medium text-sky-800 hover:underline" href={matterDocumentsHref(matterId)}>
            Matter → {matterId} → Documents
          </Link>
          . Use <strong>View PDF</strong> here or on that tab.
        </p>
      ) : null}
    </div>
  );
}

function UploadProgressRow({
  item,
  matterId,
  file,
}: {
  item: {
    name: string;
    status: "pending" | "uploading" | "done" | "error";
    result?: UploadResult;
  };
  matterId?: string;
  file?: File;
}) {
  const [expanded, setExpanded] = useState(false);
  const result = item.result;
  const docId = result?.airtable_document_id;
  const title = result?.filename ?? item.name;
  const previewKind = documentPreviewKind({ title, fileType: "", category: "", id: "", matterId: "", uploadedAt: "", uploadedBy: "", ocrStatus: "", piiTier: "" }, result);
  const canPreview = documentPreviewSupportsFile(previewKind);
  const viewLabel = documentViewLabel(previewKind);

  useEffect(() => {
    if (item.status !== "done" || !matterId || !file || !result || result.error) return;
    cacheUploadPreview(matterId, file, result);
  }, [item.status, matterId, file, result]);

  return (
    <>
      <tr className="border-t border-slate-100">
        <td className="px-3 py-2 font-medium">{item.name}</td>
        <td className="px-3 py-2 capitalize text-slate-700">
          {item.status === "uploading" ? "processing" : item.status}
        </td>
        <td className="px-3 py-2">{result?.category ?? "n/a"}</td>
        <td className="px-3 py-2 text-xs text-slate-600">
          {result?.ocr_method ?? "n/a"}
          {(() => {
            const ocr = formatOcrConfidence(result?.confidence);
            return ocr ? (
              <span title={ocr.tooltip}> · {ocr.shortLabel}</span>
            ) : null;
          })()}
        </td>
        {matterId ? (
          <td className="px-3 py-2">
            {item.status === "done" && !result?.error && docId && canPreview ? (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className={`${btnSecondary} text-xs`}
                  onClick={() => setExpanded((v) => !v)}
                >
                  {expanded ? "Hide" : viewLabel}
                </button>
                <Link
                  className="text-xs font-medium text-sky-800 hover:underline"
                  href={matterDocumentsHref(matterId, docId)}
                >
                  Documents tab →
                </Link>
              </div>
            ) : item.status === "done" && !result?.error && docId ? (
              <Link
                className="text-xs font-medium text-sky-800 hover:underline"
                href={matterDocumentsHref(matterId, docId)}
              >
                Open in Documents →
              </Link>
            ) : (
              <span className="text-xs text-slate-400">—</span>
            )}
          </td>
        ) : null}
      </tr>
      {expanded && matterId && docId && canPreview ? (
        <tr className="border-t border-slate-50 bg-slate-50/60">
          <td colSpan={matterId ? 5 : 4} className="px-3 py-3">
            <UploadInlineFilePreview
              matterId={matterId}
              documentId={docId}
              title={title}
              previewKind={previewKind}
              postgresDocumentId={result?.document_id}
            />
          </td>
        </tr>
      ) : null}
    </>
  );
}

function UploadInlineFilePreview({
  matterId,
  documentId,
  title,
  previewKind,
  postgresDocumentId,
}: {
  matterId: string;
  documentId: string;
  title: string;
  previewKind: "pdf" | "image";
  postgresDocumentId?: string;
}) {
  const blobUrl = getBlobPreview(matterId, documentId);
  const serverUrl = documentFilePreviewUrl(matterId, documentId, title, postgresDocumentId);
  const displayUrl = blobUrl ?? serverUrl;

  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {previewKind === "pdf" ? "PDF preview" : "Image preview"}
      </p>
      {blobUrl ? (
        <p className="mb-2 text-xs text-emerald-800">Showing your upload from this browser session.</p>
      ) : null}
      {previewKind === "pdf" ? (
        <iframe
          src={displayUrl}
          title={`Preview: ${title}`}
          className="h-[min(360px,60vh)] w-full rounded-md border border-slate-200 bg-white"
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={displayUrl}
          alt={`Preview: ${title}`}
          className="max-h-[min(360px,60vh)] w-full rounded-md border border-slate-200 bg-white object-contain"
        />
      )}
    </div>
  );
}
