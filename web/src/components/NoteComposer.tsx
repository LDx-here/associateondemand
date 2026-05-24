"use client";

import { useState } from "react";

import { suggestTaskFromNote } from "@/lib/task-detection";

export function NoteComposer({ matterId, onSaved }: { matterId: string; onSaved?: () => void }) {
  const [content, setContent] = useState("");
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function saveNote() {
    setBusy(true);
    try {
      await fetch(`/api/matters/${matterId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, author: "Attorney" }),
      });
      setContent("");
      setSuggestion(null);
      onSaved?.();
    } finally {
      setBusy(false);
    }
  }

  function onBlurSuggest() {
    setSuggestion(suggestTaskFromNote(content));
  }

  async function acceptSuggestion() {
    if (!suggestion) return;
    await fetch(`/api/matters/${matterId}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: suggestion, priority: "Medium", isFilingDeadline: false }),
    });
    setSuggestion(null);
    onSaved?.();
  }

  return (
    <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-4">
      <label className="text-sm font-medium text-slate-800">New note</label>
      <textarea
        className="min-h-24 w-full rounded-md border border-slate-300 p-2 text-sm"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onBlur={onBlurSuggest}
      />
      {suggestion ? (
        <div className="rounded-md bg-amber-50 p-2 text-xs text-amber-900">
          Suggested task: {suggestion}{" "}
          <button type="button" className="ml-2 underline" onClick={acceptSuggestion}>
            Create task
          </button>
        </div>
      ) : null}
      <button
        type="button"
        disabled={busy || !content.trim()}
        className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50"
        onClick={saveNote}
      >
        Save note
      </button>
    </div>
  );
}
