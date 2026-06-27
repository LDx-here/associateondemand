"use client";

import { useState } from "react";

import type { Task } from "@/lib/types";
import { btnPrimary, btnSecondary } from "@/lib/ui-classes";

export function TaskCompleteModal({
  task,
  onClose,
  onComplete,
}: {
  task: Task;
  onClose: () => void;
  onComplete: () => void;
}) {
  const [completionDocs, setCompletionDocs] = useState("");
  const [completionNote, setCompletionNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const resp = await fetch(`/api/tasks/${task.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completionDocs, completionNote, completedBy: "Attorney" }),
      });
      if (!resp.ok) {
        setError((await resp.text()) || "Failed to complete task");
        return;
      }
      onComplete();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md space-y-3 rounded-lg border border-slate-200 bg-white p-5 shadow-xl">
        <h3 className="text-lg font-semibold text-slate-900">Complete task</h3>
        <p className="text-sm text-slate-700">{task.description}</p>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Documents (optional)</span>
          <input
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={completionDocs}
            onChange={(e) => setCompletionDocs(e.target.value)}
            placeholder="e.g. I-130 receipt, filing confirmation"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Completion note (optional)</span>
          <textarea
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            rows={3}
            value={completionNote}
            onChange={(e) => setCompletionNote(e.target.value)}
          />
        </label>
        {error ? <p className="text-sm text-rose-700">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <button type="button" className={btnSecondary} onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className={`${btnPrimary} bg-emerald-700 hover:bg-emerald-600`} onClick={() => void submit()} disabled={busy}>
            {busy ? "Saving…" : "Mark complete"}
          </button>
        </div>
      </div>
    </div>
  );
}
