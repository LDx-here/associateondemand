"use client";

import { ScrollText } from "lucide-react";
import { useState } from "react";

import { CaseNarrativePanel } from "@/components/CaseNarrativePanel";
import { EmptyState } from "@/components/EmptyState";
import { NoteComposer } from "@/components/NoteComposer";
import { EditableOutputMemo } from "@/components/EditableOutputMemo";
import type { Note, TimelineEntry } from "@/lib/types";
import { rollUpWork, toBillableHours } from "@/lib/work-entry";

export function CaseActivityPanel({
  matterId,
  caseType,
  matterTitle,
  timeline,
  notes,
  refreshKey,
  onRefresh,
}: {
  matterId: string;
  caseType: string;
  matterTitle?: string;
  timeline: TimelineEntry[];
  notes: Note[];
  refreshKey: number;
  onRefresh: () => void;
}) {
  const [timelineKinds, setTimelineKinds] = useState<Set<TimelineEntry["kind"]>>(
    () => new Set(["note", "task_created", "task_completed", "document", "event", "agent"]),
  );
  const [expandedTimelineId, setExpandedTimelineId] = useState<string | null>(null);
  const matterWork = rollUpWork(notes);

  const filteredTimeline = timeline.filter((e) => timelineKinds.has(e.kind));

  function toggleTimelineKind(kind: TimelineEntry["kind"]) {
    setTimelineKinds((prev) => {
      const next = new Set(prev);
      if (next.has(kind)) next.delete(kind);
      else next.add(kind);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <CaseNarrativePanel notes={notes} matterTitle={matterTitle} />
      <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Chronological activity</p>
        <div className="flex flex-wrap gap-2 text-xs">
          {(["note", "task_created", "task_completed", "document", "event", "agent"] as const).map((kind) => (
            <button
              key={kind}
              type="button"
              className={`rounded-full px-2 py-0.5 ring-1 ${
                timelineKinds.has(kind)
                  ? "bg-slate-800 text-white ring-slate-800"
                  : "bg-white text-slate-600 ring-slate-300"
              }`}
              onClick={() => toggleTimelineKind(kind)}
            >
              {kind.replace("_", " ")}
            </button>
          ))}
        </div>
        <ol className="space-y-2">
          {filteredTimeline.length ? (
            filteredTimeline.map((e) => (
              <li
                key={`${e.id}-${refreshKey}`}
                className="rounded-md border border-slate-200 bg-white p-3 text-sm shadow-sm"
              >
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => setExpandedTimelineId((id) => (id === e.id ? null : e.id))}
                >
                  <p className="text-xs text-slate-500">
                    {new Date(e.timestamp).toLocaleString()} · {e.actor} · {e.kind.replace("_", " ")}
                  </p>
                  <p className="text-slate-800">{e.summary}</p>
                </button>
                {expandedTimelineId === e.id ? (
                  <p className="mt-2 border-t border-slate-100 pt-2 text-xs text-slate-600">{e.summary}</p>
                ) : null}
              </li>
            ))
          ) : (
            <li className="list-none">
              <EmptyState
                icon={ScrollText}
                title="No activity yet."
                description="Notes, uploads, tasks, and agent runs appear here chronologically."
              />
            </li>
          )}
        </ol>
      </div>

      <div className="space-y-3">
        <NoteComposer matterId={matterId} caseType={caseType} onSaved={onRefresh} />
        <ul className="space-y-2 rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Case notes ({notes.length})</p>
            {matterWork.entryCount > 0 ? (
              <p className="text-xs text-slate-600">
                <span className="font-semibold text-slate-900">
                  {toBillableHours(matterWork.billableMinutes)} hr
                </span>{" "}
                billable on this matter
                {matterWork.nonBillableMinutes > 0
                  ? ` · ${toBillableHours(matterWork.nonBillableMinutes)} hr no charge`
                  : ""}
              </p>
            ) : null}
          </div>
          {notes.length === 0 ? (
            <li className="text-xs text-slate-500">No notes yet.</li>
          ) : (
            notes.map((n) => (
              <li
                key={n.id}
                className={`border-t border-slate-100 pt-2 first:border-0 first:pt-0 ${
                  n.type === "Correction" ? "border-l-4 border-l-rose-500 pl-2" : ""
                }`}
              >
                <p className="text-xs text-slate-500">
                  {n.author} · {new Date(n.createdAt).toLocaleString()}
                  {/* The activity badge below already says what this was — "Manual" adds nothing. */}
                  {n.activity && n.minutes ? "" : ` · ${n.type}`}
                  {n.activity && n.minutes ? (
                    <span
                      className={
                        n.billable === false
                          ? "ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[0.65rem] font-medium text-slate-600"
                          : "ml-1.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[0.65rem] font-medium text-emerald-900"
                      }
                    >
                      {n.activity} · {toBillableHours(n.minutes)} hr
                      {n.billable === false ? " (no charge)" : ""}
                    </span>
                  ) : null}
                </p>
                {n.type === "Agent" ? (
                  <EditableOutputMemo
                    content={n.content}
                    matterId={matterId}
                    noteId={n.id}
                    saveMode="note"
                    onSaved={() => onRefresh()}
                  />
                ) : (
                  <p className="text-slate-800">{n.content}</p>
                )}
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
    </div>
  );
}
