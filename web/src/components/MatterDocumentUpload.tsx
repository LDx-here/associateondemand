"use client";

import { CheckCircle2 } from "lucide-react";
import { useState } from "react";

import {
  attorneyUploadApproved,
  UploadProgressTable,
  UploadSupportingDocsHint,
  uploadDocument,
  type UploadResult,
} from "@/components/IntakeUploadShared";
import { useToast } from "@/components/Toast";
import { documentStorageNote } from "@/lib/document-display";
import { btnPrimary } from "@/lib/ui-classes";

export type DocumentUploadPayload = {
  documentId?: string;
  result: UploadResult;
  file?: File;
};

export function MatterDocumentUpload({
  matterId,
  onUploaded,
}: {
  matterId: string;
  onUploaded?: (payload: DocumentUploadPayload) => void;
}) {
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);
  const [apiReachable, setApiReachable] = useState<boolean | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [lastFile, setLastFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function checkApi() {
    const base = process.env.NEXT_PUBLIC_API_URL ?? "";
    if (!base) {
      setApiReachable(false);
      return;
    }
    try {
      const resp = await fetch(`${base}/health`, { method: "GET" });
      setApiReachable(resp.ok);
    } catch {
      setApiReachable(false);
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const input = e.currentTarget.elements.namedItem("file") as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    setBusy(true);
    setError(null);
    setResult(null);
    setLastFile(file);
    await checkApi();

    try {
      const data = await uploadDocument(matterId, file, attorneyUploadApproved(), "single");
      if (data.error) {
        setError(data.error);
        showToast(data.error, "error");
      } else {
        setResult(data);
        // Persist metadata via Next.js data-store so Google Sheets mode lists the row
        // even when Fly OCR still writes Airtable (dual-write not yet on Fly).
        let documentId = data.airtable_document_id;
        try {
          const registerResp = await fetch(`/api/matters/${encodeURIComponent(matterId)}/documents`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: data.filename ?? file.name,
              category: "uncategorized",
              documentId: data.airtable_document_id,
              ocrStatus: data.processing_status ?? "processed",
              fileType: file.type || undefined,
            }),
          });
          if (registerResp.ok) {
            const registered = (await registerResp.json()) as { document?: { id?: string } };
            if (registered.document?.id) documentId = registered.document.id;
          }
        } catch {
          // Non-fatal — Fly may still have written Airtable; list refresh will show what it can.
        }
        showToast(
          `Saved to this matter → Documents tab. "${data.filename ?? file.name}" is in the list above.`,
          "success",
        );
        onUploaded?.({ documentId, result: data, file });
        input.value = "";
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setError(message);
      showToast(message, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">Upload supporting document</h3>
      <p className="text-xs text-slate-600">
        PDF, DOCX, image, or text files upload here and appear immediately in the Documents list above.{" "}
        {documentStorageNote(matterId)}.
      </p>
      <UploadSupportingDocsHint context="matter" />
      {apiReachable === false ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          Document service is offline. Start the API stack to process uploads, or use the Intake tab when
          it is available.
        </p>
      ) : null}
      <form className="space-y-3" onSubmit={onSubmit}>
        <input
          accept=".pdf,.docx,.png,.jpg,.jpeg,.tif,.tiff,.txt,.md"
          className="w-full text-sm"
          name="file"
          type="file"
          required
        />
        <button
          type="submit"
          disabled={busy}
          className={`${btnPrimary} disabled:opacity-50`}
        >
          {busy ? "Uploading…" : "Upload to matter"}
        </button>
      </form>
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      {result ? (
        <div className="space-y-2">
          <p className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
            <span>
              <strong>{result.filename ?? "Document"}</strong> saved — scroll up to the Documents list to
              preview and verify.
            </span>
          </p>
          <UploadProgressTable
            items={[
              {
                name: result.filename ?? "upload",
                status: "done",
                result,
              },
            ]}
            matterId={matterId}
            filesByName={lastFile ? { [lastFile.name]: lastFile } : undefined}
          />
        </div>
      ) : null}
    </div>
  );
}
