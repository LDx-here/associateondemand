"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import {
  attorneyUploadApproved,
  matterDocumentsHref,
  UploadProgressTable,
  UploadSupportingDocsHint,
  uploadDocument,
  type UploadResult,
} from "@/components/IntakeUploadShared";

type QueueItem = {
  name: string;
  status: "pending" | "uploading" | "done" | "error";
  result?: UploadResult;
};

export default function IntakeBatchPage() {
  const [matterId, setMatterId] = useState("AOD-1001");
  const [loading, setLoading] = useState(false);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [filesByName, setFilesByName] = useState<Record<string, File>>({});

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const form = e.currentTarget;
    const fileInput = form.elements.namedItem("files") as HTMLInputElement;
    const files = Array.from(fileInput.files ?? []);
    if (!files.length) return;

    setLoading(true);
    setFilesByName(Object.fromEntries(files.map((f) => [f.name, f])));
    const initial: QueueItem[] = files.map((f) => ({ name: f.name, status: "pending" }));
    setQueue(initial);

    for (let i = 0; i < files.length; i++) {
      setQueue((prev) =>
        prev.map((item, idx) => (idx === i ? { ...item, status: "uploading" } : item)),
      );
      try {
        const data = await uploadDocument(matterId, files[i], attorneyUploadApproved(), "batch");
        setQueue((prev) =>
          prev.map((item, idx) =>
            idx === i
              ? { ...item, status: data.error ? "error" : "done", result: data }
              : item,
          ),
        );
      } catch (err) {
        setQueue((prev) =>
          prev.map((item, idx) =>
            idx === i
              ? {
                  ...item,
                  status: "error",
                  result: { error: err instanceof Error ? err.message : "Upload failed" },
                }
              : item,
          ),
        );
      }
    }
    setLoading(false);
  }

  const doneCount = queue.filter((q) => q.status === "done").length;
  const lastDoneDocId = useMemo(() => {
    for (let i = queue.length - 1; i >= 0; i--) {
      const id = queue[i]?.result?.airtable_document_id;
      if (queue[i]?.status === "done" && id) return id;
    }
    return undefined;
  }, [queue]);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Batch document intake</h1>
        <Link className="text-sm font-medium text-slate-800 underline-offset-2 hover:underline" href="/intake/upload">
          Single upload →
        </Link>
      </div>

      <p className="rounded-lg border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-950">
        Files upload to{" "}
        <Link className="font-medium underline" href={matterDocumentsHref(matterId, lastDoneDocId)}>
          Matter → {matterId} → Documents
        </Link>
        . Use the matter Documents tab for day-to-day uploads.
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
          Files
          <input
            accept=".pdf,.png,.jpg,.jpeg,.tif,.tiff,.txt"
            className="mt-1 w-full text-sm"
            multiple
            name="files"
            type="file"
            required
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {loading ? `Processing ${doneCount}/${queue.length}…` : "Upload batch"}
        </button>
      </form>

      <UploadProgressTable items={queue} matterId={matterId} filesByName={filesByName} />
    </div>
  );
}
