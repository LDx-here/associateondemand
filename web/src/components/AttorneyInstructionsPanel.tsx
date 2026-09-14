"use client";

import { BookOpen, Save } from "lucide-react";
import { useState } from "react";

import { useToast } from "@/components/Toast";

type Props = {
  matterId: string;
  initialInstructions?: string;
  onSaved?: () => void;
};

export function AttorneyInstructionsPanel({ matterId, initialInstructions = "", onSaved }: Props) {
  const { showToast } = useToast();
  const [content, setContent] = useState(initialInstructions);
  const [busy, setBusy] = useState(false);

  async function save() {
    const trimmed = content.trim();
    if (!trimmed) {
      showToast("Add instructions before saving.", "error");
      return;
    }
    setBusy(true);
    try {
      const resp = await fetch(`/api/matters/${matterId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: trimmed,
          author: "Attorney",
          type: "Instructions",
        }),
      });
      if (!resp.ok) {
        const data = (await resp.json()) as { error?: string };
        showToast(data.error ?? "Could not save instructions", "error");
        return;
      }
      showToast("Attorney instructions saved — agents will follow these on dispatch.", "success");
      onSaved?.();
    } finally {
      setBusy(false);
    }
  }

  return (
    // Collapsed by default: these only reach AI drafts, and they sat open above
    // the tabs on every matter while drafting falls back to templates.
    <details className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-semibold text-slate-900">
        <BookOpen className="h-4 w-4 text-slate-600" aria-hidden />
        Instructions for AI drafts
        {initialInstructions.trim() ? (
          <span className="text-xs font-normal text-slate-500">· on file</span>
        ) : null}
      </summary>
      <div className="border-t border-slate-100 px-4 pb-4 pt-3">
      <p className="mb-3 text-xs text-slate-600">
        Persistent guidance for this matter — tone, structure, citations to emphasize, or items to avoid.
        Included in every agent dispatch.
      </p>
      <textarea
        className="min-h-24 w-full rounded-md border border-slate-300 p-2 text-sm"
        placeholder="Example: Lead with extreme hardship to USC spouse; cite Matter of Cervantes-Gonzalez; do not mention prior voluntary departure."
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      <button
        type="button"
        disabled={busy || !content.trim()}
        className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50"
        onClick={() => void save()}
      >
        <Save className="h-3.5 w-3.5" aria-hidden />
        {busy ? "Saving…" : "Save instructions"}
      </button>
      </div>
    </details>
  );
}
