"use client";

import { FileSearch, Save } from "lucide-react";
import { useState } from "react";

import { useToast } from "@/components/Toast";

type Props = {
  matterId: string;
  researchNoteCount?: number;
  onSaved?: () => void;
};

export function ResearchInputPanel({ matterId, researchNoteCount = 0, onSaved }: Props) {
  const { showToast } = useToast();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    const body = content.trim();
    if (!body) {
      showToast("Paste Westlaw or research output before saving.", "error");
      return;
    }
    const header = title.trim() ? `## ${title.trim()}\n\n` : "";
    setBusy(true);
    try {
      const resp = await fetch(`/api/matters/${matterId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: `${header}${body}`,
          author: "Attorney",
          type: "Research",
        }),
      });
      if (!resp.ok) {
        const data = (await resp.json()) as { error?: string };
        showToast(data.error ?? "Could not save research", "error");
        return;
      }
      showToast("Research saved — included in drafting and PM dispatch context.", "success");
      setTitle("");
      setContent("");
      onSaved?.();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-lg border border-indigo-200 bg-indigo-50/40 p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FileSearch className="h-4 w-4 text-indigo-700" aria-hidden />
          <h2 className="text-sm font-semibold text-slate-900">Research inputs</h2>
        </div>
        {researchNoteCount > 0 ? (
          <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[0.65rem] font-medium text-indigo-900">
            {researchNoteCount} on file
          </span>
        ) : null}
      </div>
      <p className="mb-3 text-xs text-slate-600">
        Paste Westlaw, Lexis, or manual research here. Saved as a Research note and fed into drafting
        and research agents on dispatch.
      </p>
      <input
        type="text"
        className="mb-2 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
        placeholder="Optional label (e.g. Westlaw — extreme hardship cases)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <textarea
        className="min-h-32 w-full rounded-md border border-slate-300 bg-white p-2 font-mono text-xs leading-relaxed"
        placeholder="Paste research output, headnotes, case summaries, or statute excerpts…"
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      <button
        type="button"
        disabled={busy || !content.trim()}
        className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-indigo-800 px-3 py-2 text-sm text-white hover:bg-indigo-900 disabled:opacity-50"
        onClick={() => void save()}
      >
        <Save className="h-3.5 w-3.5" aria-hidden />
        {busy ? "Saving…" : "Save research"}
      </button>
    </section>
  );
}
