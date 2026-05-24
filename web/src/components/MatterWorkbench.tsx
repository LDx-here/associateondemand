"use client";

import { useCallback, useState } from "react";

import type {
  CaseAssessment,
  DocumentRow,
  LegalElementRow,
  Matter,
  Note,
  Task,
  TimelineEntry,
} from "@/lib/types";
import { prefillCommandPanel } from "@/lib/case-assessment";
import { AddTaskForm } from "./AddTaskForm";
import { CaseAssessmentEditor } from "./CaseAssessmentEditor";
import { MatterDeadlineForm } from "./MatterDeadlineForm";
import { NoteComposer } from "./NoteComposer";
import { StatusBadge } from "./StatusBadge";
import { TaskList } from "./TaskList";

const tabs = [
  "Overview",
  "Timeline",
  "Documents",
  "Legal Elements",
  "Case Assessment",
  "Next Steps",
] as const;

export function MatterWorkbench({
  matter,
  initialTasks,
  initialNotes,
  initialElements,
  initialTimeline,
  initialDocuments,
  initialAssessment,
}: {
  matter: Matter;
  initialTasks: Task[];
  initialNotes: Note[];
  initialElements: LegalElementRow[];
  initialTimeline: TimelineEntry[];
  initialDocuments: DocumentRow[];
  initialAssessment: CaseAssessment;
}) {
  const [tab, setTab] = useState<(typeof tabs)[number]>("Overview");
  const [tasks, setTasks] = useState(initialTasks);
  const [notes, setNotes] = useState(initialNotes);
  const [elements, setElements] = useState(initialElements);
  const [timeline, setTimeline] = useState(initialTimeline);
  const [documents] = useState(initialDocuments);
  const [deadline, setDeadline] = useState(matter.nextDeadline);
  const [refreshKey, setRefreshKey] = useState(0);

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

  return (
    <div className="space-y-4">
      <header className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">{matter.matterId}</h1>
            <p className="text-slate-600">{matter.clientName}</p>
          </div>
          <StatusBadge status={matter.status} />
        </div>
        <p className="mt-2 text-sm text-slate-600">{matter.summary}</p>
        {matter.vulnerabilityFlags.length ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {matter.vulnerabilityFlags.map((flag) => (
              <span key={flag} className="rounded-full bg-rose-50 px-2 py-0.5 text-xs text-rose-800 ring-1 ring-rose-200">
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
              tab === t ? "bg-sky-600 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
            }`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </nav>

      {tab === "Overview" ? (
        <div className="space-y-4">
          <dl className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm shadow-sm sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-slate-500">Case type</dt>
              <dd className="font-medium">{matter.caseType}</dd>
            </div>
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
              <dd>{matter.proceduralPosture}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Fidelity score</dt>
              <dd>{matter.fidelityScore}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Open tasks</dt>
              <dd>{tasks.filter((t) => t.status !== "Done").length}</dd>
            </div>
          </dl>
          <MatterDeadlineForm matterId={matter.matterId} initialDeadline={deadline} onUpdated={refresh} />
        </div>
      ) : null}

      {tab === "Timeline" ? (
        <ol className="space-y-2">
          {timeline.length ? (
            timeline.map((e) => (
              <li key={`${e.id}-${refreshKey}`} className="rounded-md border border-slate-200 bg-white p-3 text-sm shadow-sm">
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
                    <td className="px-4 py-3">{new Date(doc.uploadedAt).toLocaleDateString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-slate-500">
                    No documents on file. Upload arrives in Phase 3.
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
                      <div className="flex flex-col gap-1">
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
                        {row.nextAction.trim() ? (
                          <button
                            type="button"
                            className="text-left text-xs text-sky-700 underline"
                            onClick={() => prefillCommandPanel(row.nextAction.trim())}
                          >
                            Send to Command Panel
                          </button>
                        ) : null}
                      </div>
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

      {tab === "Case Assessment" ? (
        <CaseAssessmentEditor matterId={matter.matterId} initial={initialAssessment} />
      ) : null}

      {tab === "Next Steps" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <AddTaskForm matterId={matter.matterId} onCreated={refresh} />
          <TaskList matterId={matter.matterId} initialTasks={tasks} onUpdated={refresh} />
          <NoteComposer matterId={matter.matterId} onSaved={refresh} />
          <ul className="space-y-2 rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recent notes</p>
            {notes.length ? (
              notes.map((n) => (
                <li key={n.id} className="border-t border-slate-100 pt-2 first:border-0 first:pt-0">
                  <p className="text-xs text-slate-500">
                    {n.author} · {new Date(n.createdAt).toLocaleString()} · {n.type}
                  </p>
                  <p className="text-slate-800">{n.content}</p>
                </li>
              ))
            ) : (
              <li className="text-slate-500">No notes yet.</li>
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
