"use client";

import Link from "next/link";
import { useState } from "react";

import {
  attorneyUploadApproved,
  matterDocumentsHref,
  UploadProgressTable,
  UploadSupportingDocsHint,
  uploadDocument,
  type UploadResult,
} from "@/components/IntakeUploadShared";
import { useToast } from "@/components/Toast";

export default function IntakeUploadPage() {
  const { showToast } = useToast();
  const [matterId, setMatterId] = useState("AOD-1001");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [lastFile, setLastFile] = useState<File | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fileInput = form.elements.namedItem("file") as HTMLInputElement;
    const file = fileInput.files?.[0];
    if (!file) return;

    setLoading(true);
    setResult(null);
    setLastFile(file);
    try {
      const data = await uploadDocument(matterId, file, attorneyUploadApproved(), "single");
      setResult(data);
      if (data.error) {
        showToast(data.error, "error");
      } else {
        showToast(`Saved to Matter → ${matterId} → Documents.`, "success");
      }
    } catch (err) {
      setResult({ error: err instanceof Error ? err.message : "Upload failed" });
    } finally {
      setLoading(false);
    }
  }

  const filesByName = lastFile ? { [lastFile.name]: lastFile } : undefined;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Document intake</h1>
        <Link className="text-sm font-medium text-slate-800 underline-offset-2 hover:underline" href="/intake/batch">
          Batch upload →
        </Link>
      </div>

      <p className="rounded-lg border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-950">
        Prefer uploading from the matter workbench? Open{" "}
        <Link className="font-medium underline" href={matterDocumentsHref(matterId)}>
          Matter → {matterId} → Documents
        </Link>{" "}
        — that is the primary place for all matter files.
      </p>

      <form className="space-y-3 rounded-lg border border-slate-200 bg-white p-4" onSubmit={onSubmit}>
        <label className="block text-sm">
          Matter ID
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            value={matterId}
            onChange={(e) => setMatterId(e.target.value)}
          />
        </label>
        <UploadSupportingDocsHint context="matter" />
        <label className="block text-sm">
          File (PDF scan, photocopy, or image)
          <input
            accept=".pdf,.png,.jpg,.jpeg,.tif,.tiff,.txt"
            className="mt-1 w-full text-sm"
            name="file"
            type="file"
            required
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {loading ? "Running OCR pipeline…" : "Upload & extract"}
        </button>
      </form>

      {result?.error ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{result.error}</p>
      ) : null}
      {result && !result.error ? (
        <UploadProgressTable
          items={[
            {
              name: result.filename ?? lastFile?.name ?? "upload",
              status: "done",
              result,
            },
          ]}
          matterId={matterId}
          filesByName={filesByName}
        />
      ) : null}
    </div>
  );
}
