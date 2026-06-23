"use client";

import { useState } from "react";

import {
  TierZeroBanner,
  tierRequiresManualApproval,
  UploadProgressTable,
  uploadDocument,
  type UploadResult,
} from "@/components/IntakeUploadShared";
import { btnPrimary } from "@/lib/ui-classes";

export function MatterDocumentUpload({
  matterId,
  onUploaded,
}: {
  matterId: string;
  onUploaded?: () => void;
}) {
  const [manualApproved, setManualApproved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [apiReachable, setApiReachable] = useState<boolean | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
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
    if (tierRequiresManualApproval() && !manualApproved) return;
    const input = e.currentTarget.elements.namedItem("file") as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    setBusy(true);
    setError(null);
    setResult(null);
    await checkApi();

    try {
      const data = await uploadDocument(matterId, file, manualApproved, "single");
      if (data.error) {
        setError(data.error);
      } else {
        setResult(data);
        onUploaded?.();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">Upload document</h3>
      {apiReachable === false ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          Document service is offline. Start the API stack to process uploads, or use the Intake tab when
          it is available.
        </p>
      ) : null}
      <TierZeroBanner approved={manualApproved} onApprovedChange={setManualApproved} />
      <form className="space-y-3" onSubmit={onSubmit}>
        <input
          accept=".pdf,.png,.jpg,.jpeg,.tif,.tiff,.txt"
          className="w-full text-sm"
          name="file"
          type="file"
          required
        />
        <button
          type="submit"
          disabled={busy || (tierRequiresManualApproval() && !manualApproved)}
          className={`${btnPrimary} disabled:opacity-50`}
        >
          {busy ? "Uploading…" : "Upload to matter"}
        </button>
      </form>
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      {result ? (
        <UploadProgressTable
          items={[
            {
              name: result.filename ?? "upload",
              status: "done",
              result,
            },
          ]}
        />
      ) : null}
    </div>
  );
}
