"use client";

import { useEffect, useState } from "react";

import type { TaskDetectionResult } from "@/lib/task-detection";
import { detectTaskFromNote } from "@/lib/task-detection";

const DEBOUNCE_MS = 380;

export function NoteComposer({ matterId, onSaved }: { matterId: string; onSaved?: () => void }) {
  const [content, setContent] = useState("");
  const [suggestion, setSuggestion] = useState<TaskDetectionResult | null>(null);
  const [dismissedForContent, setDismissedForContent] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => {
      const detected = detectTaskFromNote(content);
      const token = content.trim();
      if (detected && dismissedForContent === token) {
        setSuggestion(null);
        return;
      }
      setSuggestion(detected && dismissedForContent !== token ? detected : null);
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [content, dismissedForContent]);

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
      setDismissedForContent(null);
      onSaved?.();
    } finally {
      setBusy(false);
    }
  }

  function dismissBanner() {
    const token = content.trim();
    setDismissedForContent(token);
    setSuggestion(null);
  }

  async function createNoteAndTask() {
    if (!suggestion) return;
    setBusy(true);
    try {
      await fetch(`/api/matters/${matterId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, author: "Attorney" }),
      });
      await fetch(`/api/matters/${matterId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: suggestion.description,
          dueDate: suggestion.dueDateIso,
          priority: "Medium",
          isFilingDeadline: false,
        }),
      });
      setContent("");
      setSuggestion(null);
      setDismissedForContent(null);
      onSaved?.();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-4">
      <label className="text-sm font-medium text-slate-800">New note</label>
      {suggestion ? (
        <div
          role="status"
          className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950"
        >
          <p className="font-medium">Create a task?</p>
          <p className="mt-1">
            <span className="text-amber-900">{suggestion.description}</span>
            <span className="block pt-1 text-amber-800">
              Due: {suggestion.dueHint}
            </span>
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              disabled={busy || !content.trim()}
              onClick={() => void createNoteAndTask()}
            >
              Create Task
            </button>
            <button
              type="button"
              className="rounded-md border border-amber-300 bg-white px-2 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-50"
              disabled={busy}
              onClick={dismissBanner}
            >
              Dismiss
            </button>
          </div>
          <p className="mt-2 text-[0.65rem] text-amber-800">
            Create Task saves this note and adds a linked task. Dismiss hides the banner until you edit the note.
          </p>
        </div>
      ) : null}
      <textarea
        className="min-h-24 w-full rounded-md border border-slate-300 p-2 text-sm"
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
        }}
      />
      <button
        type="button"
        disabled={busy || !content.trim()}
        className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50"
        onClick={() => void saveNote()}
      >
        Save note
      </button>
    </div>
  );
}
