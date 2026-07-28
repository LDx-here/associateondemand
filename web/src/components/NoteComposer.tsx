"use client";

import { useEffect, useState } from "react";

import type { TaskDetectionResult } from "@/lib/task-detection";
import { detectTaskFromNote } from "@/lib/task-detection";
import type { WorkActivity } from "@/lib/work-entry";
import {
  DEFAULT_MINUTES,
  QUICK_MINUTES,
  WORK_ACTIVITIES,
  toBillableHours,
} from "@/lib/work-entry";

const DEBOUNCE_MS = 380;

export function NoteComposer({ matterId, onSaved }: { matterId: string; onSaved?: () => void }) {
  const [content, setContent] = useState("");
  const [suggestion, setSuggestion] = useState<TaskDetectionResult | null>(null);
  const [dismissedForContent, setDismissedForContent] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [activity, setActivity] = useState<WorkActivity | null>(null);
  const [minutes, setMinutes] = useState<number | null>(null);
  const [billable, setBillable] = useState(true);

  /** Picking the activity fills the time too — one tap logs a complete entry. */
  function pickActivity(next: WorkActivity) {
    if (activity === next) {
      setActivity(null);
      setMinutes(null);
      return;
    }
    setActivity(next);
    setMinutes((current) => current ?? DEFAULT_MINUTES[next]);
  }

  function resetWork() {
    setActivity(null);
    setMinutes(null);
    setBillable(true);
  }

  const workPayload =
    activity && minutes ? { activity, minutes, billable } : undefined;

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
        body: JSON.stringify({ content, author: "Attorney", work: workPayload }),
      });
      setContent("");
      setSuggestion(null);
      setDismissedForContent(null);
      resetWork();
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

      <div className="space-y-2 rounded-md border border-dashed border-slate-200 bg-slate-50/60 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-medium text-slate-700">Log time (optional)</p>
          {activity && minutes ? (
            <button
              type="button"
              className="text-[0.7rem] text-slate-500 underline hover:text-slate-800"
              onClick={resetWork}
            >
              Clear
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {WORK_ACTIVITIES.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={activity === option}
              className={
                activity === option
                  ? "rounded-full bg-slate-900 px-2.5 py-1 text-xs font-medium text-white"
                  : "rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-700 hover:border-slate-400"
              }
              onClick={() => pickActivity(option)}
            >
              {option}
            </button>
          ))}
        </div>

        {activity ? (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {QUICK_MINUTES.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={minutes === option}
                className={
                  minutes === option
                    ? "rounded-md bg-sky-800 px-2.5 py-1 text-xs font-medium text-white"
                    : "rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-700 hover:border-sky-300"
                }
                onClick={() => setMinutes(option)}
              >
                {toBillableHours(option)}
              </button>
            ))}
            <label className="ml-1 flex items-center gap-1.5 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={!billable}
                onChange={(e) => setBillable(!e.target.checked)}
              />
              No charge
            </label>
          </div>
        ) : null}

        {activity && minutes ? (
          <p className="text-[0.7rem] text-slate-600">
            Saves as <span className="font-medium text-slate-800">{activity}</span> —{" "}
            {toBillableHours(minutes)} hr{billable ? "" : " (no charge)"}.
          </p>
        ) : (
          <p className="text-[0.7rem] text-slate-500">
            Pick an activity to log this as billable work. Time fills in automatically.
          </p>
        )}
      </div>

      <button
        type="button"
        disabled={busy || !content.trim()}
        className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50"
        onClick={() => void saveNote()}
      >
        {activity && minutes ? `Save note + ${toBillableHours(minutes)} hr` : "Save note"}
      </button>
    </div>
  );
}
