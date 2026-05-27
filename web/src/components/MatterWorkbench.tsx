"use client";

import { FileText } from "lucide-react";
import { useCallback, useState } from "react";

import type {
  CalendarEvent,
  CaseAssessment,
  DocumentRow,
  LegalElementRow,
  Matter,
  Note,
  Task,
  TimelineEntry,
} from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { prefillCommandPanel } from "@/lib/case-assessment";
import { AddTaskForm } from "./AddTaskForm";
import { CaseAssessmentEditor } from "./CaseAssessmentEditor";
import { MatterDeadlineForm } from "./MatterDeadlineForm";
import { NoteComposer } from "./NoteComposer";
import { StatusBadge } from "./StatusBadge";
import { TaskList } from "./TaskList";

// BUILD_SPEC §7.3 tab order. Assessment is the default first tab.
const tabs = [
  "Assessment",
  "Timeline",
  "Notes",
  "Tasks",
  "Documents",
  "Legal Elements",
  "Events",
] as const;

type Tab = (typeof tabs)[number];

function assessmentBadge(value: string): string {
  const v = value.trim().toLowerCase();
  if (v.startsWith("strong")) return "bg-emerald-100 text-emerald-900 ring-emerald-200";
  if (v.startsWith("moderate")) return "bg-amber-100 text-amber-900 ring-amber-200";
  if (v.startsWith("weak")) return "bg-rose-100 text-rose-900 ring-rose-200";
  if (v.startsWith("at risk")) return "bg-rose-200 text-rose-950 ring-rose-300 font-semibold";
  if (v.startsWith("not applicable")) return "bg-slate-100 text-slate-600 ring-slate-200";
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

export function MatterWorkbench({
  matter,
  initialTasks,
  initialNotes,
  initialElements,
  initialTimeline,
  initialDocuments,
  initialAssessment,
  initialEvents = [],
}: {
  matter: Matter;
  initialTasks: Task[];
  initialNotes: Note[];
  initialElements: LegalElementRow[];
  initialTimeline: TimelineEntry[];
  initialDocuments: DocumentRow[];
  initialAssessment: CaseAssessment;
  initialEvents?: CalendarEvent[];
}) {
  const [tab, setTab] = useState<Tab>("Assessment");
  const [tasks, setTasks] = useState(initialTasks);
  const [notes, setNotes] = useState(initialNotes);
  const [elements, setElements] = useState(initialElements);
  const [timeline, setTimeline] = useState(initialTimeline);
  const [documents] = useState(initialDocuments);
  const [events] = useState(initialEvents);
  const [deadline, setDeadline] = useState(matter.nextDeadline);
  const [refreshKey, setRefreshKey] = useState(0);
  const [dispatchedActions, setDispatchedActions] = useState<Record<string, boolean>>({});

  const refresh = useCallback(async () => {
    const [t, n, tl, el, m] = await Promise.all([
      fetch(`/api/matters/${matter.matterId}/tasks`).then((r) => r.json()),
      fetch(`/api/matters/${matter.matterId}/notes`).then((r) => r.json()),
      fetch(`/api/matters/${matter.matterId}/timeline`).then((r) => r.json()),
      fetch(`/api/matters/${matter.matterId}/legal-elements`).then((r) => r.json()),
      fetch(`/api/matters/${matter.matterId}`).then((r) => r.json()),
    ]);
    setTasks(t.tasks);
    setNotes(n.notes);
    setTimeline(tl.timeline);
    setElements(el.rows);
    if (m.matter?.nextDeadline !== undefined) setDeadline(m.matter.nextDeadline);
    setRefreshKey((k) => k + 1);
  }, [matter.matterId]);

  async function saveElement(id: string) {
    const row = elements.find((r) => r.id === id);
    if (!row) return;
    const resp = await fetch(`/api/matters/${matter.matterId}/legal-elements`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(row),
    });
    if (resp.ok) {
      const { row: updated } = (await resp.json()) as { row: LegalElementRow };
      setElements((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    }
  }

  function dispatchNextAction(rowId: string, actionText: string) {
    if (!actionText.trim()) return;
    if (!window.confirm(`Dispatch this action?\n\n${actionText}`)) return;
    prefillCommandPanel(actionText);
    setDispatchedActions((prev) => ({ ...prev, [rowId]: true }));
  }

  return (
    <div className="space-y-4">
      <header className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">{matter.matterId}</h1>
            <p className="text-sm text-slate-600">
              {[matter.caseType, matter.proceduralPosture, matter.status]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <StatusBadge status={matter.status} />
        </div>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-slate-500">Assigned attorney</dt>
            <dd className="font-medium">{matter.assignedAttorney || "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Next deadline</dt>
            <dd className={`font-medium ${deadline ? "text-rose-700" : ""}`}>{deadline ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Procedural posture</dt>
            <dd>{matter.proceduralPosture || "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Fidelity score</dt>
            <dd>{matter.fidelityScore}</dd>
          </div>
        </dl>
        <p className="mt-2 text-sm text-slate-700">{matter.summary}</p>
        {matter.vulnerabilityFlags.length ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {matter.vulnerabilityFlags.map((flag) => (
              <span
                key={flag}
                className="rounded-full bg-rose-50 px-2 py-0.5 text-xs text-rose-800 ring-1 ring-rose-200"
              >
                {flag}
              </span>
            ))}
          </div>
        ) : null}
      </header>

      <nav className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              tab === t
                ? "bg-sky-600 text-white"
                : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
            }`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </nav>

      {tab === "Assessment" ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-4 py-3">
              <h2 className="font-medium text-slate-900">Case assessment</h2>
              <p className="text-xs text-slate-500">
                Element / Pathway · Assessment · Key Gap · Next Action (dispatchable).
              </p>
            </div>
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Element / Pathway</th>
                  <th className="px-3 py-2">Assessment</th>
                  <th className="px-3 py-2">Key gap</th>
                  <th className="px-3 py-2">Next action</th>
                </tr>
              </thead>
              <tbody>
                {elements.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                      No legal elements mapped yet.
                    </td>
                  </tr>
                ) : (
                  elements.map((row) => {
                    const dispatched = dispatchedActions[row.id];
                    return (
                      <tr key={row.id} className="border-t border-slate-100 align-top">
                        <td className="px-3 py-2 font-medium">{row.element}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs ring-1 ${assessmentBadge(row.assessment)}`}
                          >
                            {row.assessment || "Unknown"}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-slate-700">{row.keyGap || "—"}</td>
                        <td className="px-3 py-2">
                          <div className="flex flex-col gap-1">
                            <p className="text-slate-800">{row.nextAction || "—"}</p>
                            {row.nextAction.trim() ? (
                              <button
                                type="button"
                                disabled={dispatched}
                                onClick={() => dispatchNextAction(row.id, row.nextAction.trim())}
                                className={`self-start rounded-md px-2 py-1 text-xs font-medium ring-1 ${
                                  dispatched
                                    ? "bg-slate-100 text-slate-400 ring-slate-200"
                                    : "bg-sky-600 text-white ring-sky-600 hover:bg-sky-700"
                                }`}
                              >
                                {dispatched ? "Dispatched" : "Dispatch"}
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <CaseAssessmentEditor matterId={matter.matterId} initial={initialAssessment} />
          <MatterDeadlineForm matterId={matter.matterId} initialDeadline={deadline} onUpdated={refresh} />
        </div>
      ) : null}

      {tab === "Timeline" ? (
        <ol className="space-y-2">
          {timeline.length ? (
            timeline.map((e) => (
              <li
                key={`${e.id}-${refreshKey}`}
                className="rounded-md border border-slate-200 bg-white p-3 text-sm shadow-sm"
              >
                <p className="text-xs text-slate-500">
                  {new Date(e.timestamp).toLocaleString()} · {e.actor} · {e.kind.replace("_", " ")}
                </p>
                <p className="text-slate-800">{e.summary}</p>
              </li>
            ))
          ) : (
            <li className="rounded-md border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
              No timeline entries yet.
            </li>
          )}
        </ol>
      ) : null}

      {tab === "Notes" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <NoteComposer matterId={matter.matterId} onSaved={refresh} />
          <ul className="space-y-2 rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Notes ({notes.length})
            </p>
            {notes.length === 0 ? (
              <li className="text-slate-500">No notes yet.</li>
            ) : (
              notes.map((n) => (
                <li
                  key={n.id}
                  className={`border-t border-slate-100 pt-2 first:border-0 first:pt-0 ${
                    n.type === "Correction" ? "border-l-4 border-l-rose-500 pl-2" : ""
                  }`}
                >
                  <p className="text-xs text-slate-500">
                    {n.author} · {new Date(n.createdAt).toLocaleString()} · {n.type}
                  </p>
                  <p className="text-slate-800">{n.content}</p>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}

      {tab === "Tasks" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <AddTaskForm matterId={matter.matterId} onCreated={refresh} />
          <TaskList matterId={matter.matterId} initialTasks={tasks} onUpdated={refresh} />
        </div>
      ) : null}

      {tab === "Documents" ? (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Uploaded</th>
              </tr>
            </thead>
            <tbody>
              {documents.length ? (
                documents.map((doc) => (
                  <tr key={doc.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium">{doc.title}</td>
                    <td className="px-4 py-3">{doc.category}</td>
                    <td className="px-4 py-3 tabular-nums">{formatDate(doc.uploadedAt)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="px-4 py-10 text-center text-sm text-slate-500">
                    <span className="inline-flex flex-col items-center gap-2">
                      <FileText className="h-6 w-6 text-slate-400" aria-hidden />
                      <span className="font-medium text-slate-700">No documents on file.</span>
                      <span>Batch upload arrives via the Intake tab.</span>
                    </span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : null}

      {tab === "Legal Elements" ? (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Element</th>
                <th className="px-3 py-2">Assessment</th>
                <th className="px-3 py-2">Key gap</th>
                <th className="px-3 py-2">Next action</th>
              </tr>
            </thead>
            <tbody>
              {elements.length ? (
                elements.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100 align-top">
                    <td className="px-3 py-2 font-medium">{row.element}</td>
                    <td className="px-3 py-2">
                      <input
                        className="w-full rounded border border-slate-200 px-2 py-1 text-sm"
                        value={row.assessment}
                        onChange={(e) =>
                          setElements((prev) =>
                            prev.map((r) => (r.id === row.id ? { ...r, assessment: e.target.value } : r)),
                          )
                        }
                        onBlur={() => saveElement(row.id)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        className="w-full rounded border border-slate-200 px-2 py-1 text-sm"
                        value={row.keyGap}
                        onChange={(e) =>
                          setElements((prev) =>
                            prev.map((r) => (r.id === row.id ? { ...r, keyGap: e.target.value } : r)),
                          )
                        }
                        onBlur={() => saveElement(row.id)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        className="w-full rounded border border-slate-200 px-2 py-1 text-sm"
                        value={row.nextAction}
                        onChange={(e) =>
                          setElements((prev) =>
                            prev.map((r) => (r.id === row.id ? { ...r, nextAction: e.target.value } : r)),
                          )
                        }
                        onBlur={() => saveElement(row.id)}
                      />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                    No legal elements mapped yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : null}

      {tab === "Events" ? (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Description</th>
                <th className="px-3 py-2">Location</th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                    No events scheduled. Add Event form arrives once the Events Airtable table is wired (BUILD_SPEC §2 Table 7).
                  </td>
                </tr>
              ) : (
                events.map((ev) => (
                  <tr key={ev.id} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-medium">{ev.type}</td>
                    <td className="px-3 py-2">{new Date(ev.date).toLocaleString()}</td>
                    <td className="px-3 py-2">{ev.description}</td>
                    <td className="px-3 py-2">—</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
