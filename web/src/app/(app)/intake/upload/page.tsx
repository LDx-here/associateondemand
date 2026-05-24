"use client";

import Link from "next/link";
import { useState } from "react";

import {
  TierZeroBanner,
  tierRequiresManualApproval,
  uploadDocument,
  type UploadResult,
} from "@/components/IntakeUploadShared";

export default function IntakeUploadPage() {
  const [matterId, setMatterId] = useState("AOD-1001");
  const [manualApproved, setManualApproved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (tierRequiresManualApproval() && !manualApproved) {
      setResult({ error: "Check the tier 0 manual approval box before uploading." });
      return;
    }
    const form = e.currentTarget;
    const fileInput = form.elements.namedItem("file") as HTMLInputElement;
    const file = fileInput.files?.[0];
    if (!file) return;

    setLoading(true);
    setResult(null);
    try {
      const data = await uploadDocument(matterId, file, manualApproved, "single");
      setResult(data);
    } catch (err) {
      setResult({ error: err instanceof Error ? err.message : "Upload failed" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Document intake</h1>
        <Link className="text-sm text-sky-700 hover:underline" href="/intake/batch">
          Batch upload →
        </Link>
      </div>

      <TierZeroBanner approved={manualApproved} onApprovedChange={setManualApproved} />

      <form className="space-y-3 rounded-lg border border-slate-200 bg-white p-4" onSubmit={onSubmit}>
        <label className="block text-sm">
          Matter ID
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            value={matterId}
            onChange={(e) => setMatterId(e.target.value)}
          />
        </label>
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
          disabled={loading || (tierRequiresManualApproval() && !manualApproved)}
          className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
        >
          {loading ? "Running OCR pipeline…" : "Upload & extract"}
        </button>
      </form>

      {result ? (
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
          {result.error ? (
            <p className="text-red-700">{result.error}</p>
          ) : (
            <>
              <p className="font-medium text-emerald-800">
                {result.processing_status} · {result.ocr_method} · confidence{" "}
                {Math.round((result.confidence ?? 0) * 100)}%
              </p>
              <p className="mt-1 text-slate-600">
                Category: {result.category} · {result.facts_extracted ?? 0} fact(s)
              </p>
              {result.obsidian_path ? (
                <p className="mt-1 text-slate-600">Obsidian: {result.obsidian_path}</p>
              ) : null}
              {result.facts?.length ? (
                <ul className="mt-2 list-inside list-disc text-slate-700">
                  {result.facts.map((f) => (
                    <li key={`${f.fact_type}-${f.value}`}>
                      {f.fact_type}: {f.value}
                    </li>
                  ))}
                </ul>
              ) : null}
              {result.text_preview ? (
                <pre className="mt-3 max-h-40 overflow-auto rounded bg-slate-50 p-2 text-xs">
                  {result.text_preview}
                </pre>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
