"use client";

import {
  Calendar,
  ClipboardList,
  FileText,
  Gavel,
  MessageSquare,
  ScrollText,
} from "lucide-react";
import Link from "next/link";
import { Fragment, useCallback, useEffect, useState } from "react";

import { EmptyState } from "@/components/EmptyState";
import type {
  CalendarEvent,
  CaseAssessment,
  DocumentRow,
  LegalElementRow,
  Matter,
  Note,
  Task,
  TimelineEntry,
  InboxItem,
} from "@/lib/types";
import { btnPrimary, btnSecondary, tabActive, tabInactive } from "@/lib/ui-classes";
import { formatDate } from "@/lib/utils";
import type { AgentCommandResult } from "@/lib/agent-dispatch";
import { dispatchAgentCommand } from "@/lib/agent-dispatch";
import { prefillCommandPanel } from "@/lib/case-assessment";
import { AddTaskForm } from "./AddTaskForm";
import { EditableOutputMemo } from "./EditableOutputMemo";
import { MatterAssignmentReview } from "./MatterAssignmentReview";
import { MatterAgentAlertReview } from "./MatterAgentAlertReview";
import { MATTER_REVIEW_REFRESH_EVENT } from "@/lib/matter-review-events";
import { CaseAssessmentEditor } from "./CaseAssessmentEditor";
import { MatterDeadlineForm } from "./MatterDeadlineForm";
import { MatterEventsPanel } from "./MatterEventsPanel";
import { NoteComposer } from "./NoteComposer";
import { StatusBadge } from "./StatusBadge";
import { MatterDocumentUpload } from "./MatterDocumentUpload";
import { MatterHeaderEditModal } from "./MatterHeaderEditModal";
import { TaskList } from "./TaskList";
import { AgentResultPanel } from "./AgentResultPanel";

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
  initialAssignments = [],
  initialAgentAlerts = [],
  demoMode = false,
}: {
  matter: Matter;
  initialTasks: Task[];
  initialNotes: Note[];
  initialElements: LegalElementRow[];
  initialTimeline: TimelineEntry[];
  initialDocuments: DocumentRow[];
  initialAssessment: CaseAssessment;
  initialEvents?: CalendarEvent[];
  initialAssignments?: InboxItem[];
  initialAgentAlerts?: InboxItem[];
  demoMode?: boolean;
}) {
  const [tab, setTab] = useState<Tab>("Assessment");
  const [matterHeader, setMatterHeader] = useState(matter);
  const [editOpen, setEditOpen] = useState(false);
  const [tasks, setTasks] = useState(initialTasks);
  const [notes, setNotes] = useState(initialNotes);
  const [elements, setElements] = useState(initialElements);
  const [timeline, setTimeline] = useState(initialTimeline);
  const [documents, setDocuments] = useState(initialDocuments);
  const [events] = useState(initialEvents);
  const [deadline, setDeadline] = useState(matter.nextDeadline);
  const [refreshKey, setRefreshKey] = useState(0);
  const [reviewRefreshKey, setReviewRefreshKey] = useState(0);
  const [assignments, setAssignments] = useState(initialAssignments);
  const [agentAlerts, setAgentAlerts] = useState(initialAgentAlerts);
  const [dispatchedActions, setDispatchedActions] = useState<Record<string, boolean>>({});
  const [lastAgentResult, setLastAgentResult] = useState<AgentCommandResult | null>(null);
  const [timelineKinds, setTimelineKinds] = useState<Set<TimelineEntry["kind"]>>(
    () => new Set(["note", "task_created", "task_completed", "document", "event", "agent"]),
  );
  const [expandedTimelineId, setExpandedTimelineId] = useState<string | null>(null);
  const [expandedElementId, setExpandedElementId] = useState<string | null>(null);
  const [newElementName, setNewElementName] = useState("");

  const refresh = useCallback(async () => {
    const [t, n, tl, el, m, docs, asgn, alerts] = await Promise.all([
      fetch(`/api/matters/${matter.matterId}/tasks`).then((r) => r.json()),
      fetch(`/api/matters/${matter.matterId}/notes`).then((r) => r.json()),
      fetch(`/api/matters/${matter.matterId}/timeline`).then((r) => r.json()),
      fetch(`/api/matters/${matter.matterId}/legal-elements`).then((r) => r.json()),
      fetch(`/api/matters/${matter.matterId}`).then((r) => r.json()),
      fetch(`/api/matters/${matter.matterId}/documents`).then((r) => r.json()),
      fetch(`/api/matters/${matter.matterId}/assignments`).then((r) => r.json()),
      fetch(`/api/matters/${matter.matterId}/agent-alerts`).then((r) => r.json()),
    ]);
    setTasks(t.tasks);
    setNotes(n.notes);
    setTimeline(tl.timeline);
    setElements(el.rows);
    setDocuments(docs.documents ?? []);
    if (asgn.assignments) setAssignments(asgn.assignments);
    if (alerts.alerts) setAgentAlerts(alerts.alerts);
    if (m.matter?.nextDeadline !== undefined) setDeadline(m.matter.nextDeadline);
    setRefreshKey((k) => k + 1);
    setReviewRefreshKey((k) => k + 1);
  }, [matter.matterId]);

  useEffect(() => {
    function onReviewRefresh(event: Event) {
      const detail = (event as CustomEvent<{ matterId?: string }>).detail;
      if (detail?.matterId === matter.matterId) {
        void refresh();
      }
    }
    window.addEventListener(MATTER_REVIEW_REFRESH_EVENT, onReviewRefresh);
    return () => window.removeEventListener(MATTER_REVIEW_REFRESH_EVENT, onReviewRefresh);
  }, [matter.matterId, refresh]);

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

  async function addElement() {
    const name = newElementName.trim();
    if (!name) return;
    const resp = await fetch(`/api/matters/${matter.matterId}/legal-elements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ elementName: name }),
    });
    if (resp.ok) {
      const { row } = (await resp.json()) as { row: LegalElementRow };
      setElements((prev) => [...prev, row]);
      setNewElementName("");
    }
  }

  const filteredTimeline = timeline.filter((e) => timelineKinds.has(e.kind));

  function toggleTimelineKind(kind: TimelineEntry["kind"]) {
    setTimelineKinds((prev) => {
      const next = new Set(prev);
      if (next.has(kind)) next.delete(kind);
      else next.add(kind);
      return next;
    });
  }

  async function dispatchNextAction(rowId: string, actionText: string) {
    if (!actionText.trim()) return;
    if (!window.confirm(`Dispatch this action to PM?\n\n${actionText}`)) return;
    setDispatchedActions((prev) => ({ ...prev, [rowId]: true }));
    prefillCommandPanel(`pm: ${actionText}`, true);
    try {
      const result = await dispatchAgentCommand(`pm: ${actionText}`, matter.matterId);
      if (result.type === "agent") {
        setLastAgentResult(result);
      }
    } catch {
      // Command panel shows offline stub from API route
    }
  }

  return (
    <div className="space-y-4">
      <header className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">{matterHeader.matterId}</h1>
            <p className="text-sm text-slate-600">
              {[matterHeader.caseType, matterHeader.proceduralPosture ?? matterHeader.posture, matterHeader.status]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/assignments/new?matterId=${matterHeader.matterId}`} className={btnSecondary}>
              New assignment
            </Link>
            <button type="button" className={btnSecondary} onClick={() => setEditOpen(true)}>
              Edit matter
            </button>
            <StatusBadge status={matterHeader.status} />
          </div>
        </div>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-slate-500">Assigned attorney</dt>
            <dd className="font-medium">{matterHeader.assignedAttorney || "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Next deadline</dt>
            <dd className={`font-medium ${deadline ? "text-rose-700" : ""}`}>{deadline ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Procedural posture</dt>
            <dd>{matterHeader.proceduralPosture ?? matterHeader.posture ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Court / judge</dt>
            <dd>{[matterHeader.court, matterHeader.judge].filter(Boolean).join(" · ") || "—"}</dd>
          </div>
        </dl>
        <p className="mt-2 text-sm text-slate-700">{matterHeader.summary}</p>
        {matterHeader.vulnerabilityFlags.length ? (
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

      <MatterAgentAlertReview
        matterId={matter.matterId}
        initialAlerts={agentAlerts}
        demoMode={demoMode}
        refreshKey={reviewRefreshKey}
        onResolved={refresh}
      />

      <MatterAssignmentReview
        matterId={matter.matterId}
        initialAssignments={assignments}
        notes={notes}
        demoMode={demoMode}
        refreshKey={reviewRefreshKey}
        onAssignmentUpdated={refresh}
        onViewAgentNote={() => setTab("Notes")}
      />

      <nav className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              tab === t ? tabActive : tabInactive
            }`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </nav>

      {tab === "Assessment" ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">
            <div>
              <p className="font-semibold text-sky-900">AOS discretionary factors workbook</p>
              <p className="mt-0.5 text-xs text-sky-900">
                Case Intake → Brief Development Matrix → Case Theme → Legal Framework. Complete in Excel,
                then draft with{" "}
                <code className="rounded bg-sky-100 px-1">draft aos discretionary brief</code> in the
                Associate panel.
              </p>
            </div>
            <a
              className={btnSecondary}
              download
              href="/templates/AOS_Discretionary_Factors_Case_Assessment_Tool.xlsx"
            >
              Download .xlsx
            </a>
          </div>
          <CaseAssessmentEditor matterId={matter.matterId} initial={initialAssessment} />
          <MatterDeadlineForm matterId={matter.matterId} initialDeadline={deadline} onUpdated={refresh} />
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-4 py-3">
              <h2 className="font-medium text-slate-900">Legal element pathway matrix</h2>
              <p className="mt-1 text-xs text-slate-500">
                Extend pathway rows below. Structured posture, deadlines, and overall notes stay in Case assessment sections above.
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
                    <td colSpan={4} className="p-0">
                      <EmptyState
                        icon={Gavel}
                        title="No legal elements yet."
                        description="Map elements in the Legal Elements tab or import from your case assessment."
                      />
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
                                    : `${btnPrimary} ring-slate-800`
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
          {lastAgentResult ? (
            <div className="fixed bottom-4 right-4 z-20 w-full max-w-sm sm:max-w-md">
              <div className="rounded-lg border border-slate-300 bg-white/95 p-3 shadow-lg backdrop-blur">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Latest PM / research dispatch
                  </p>
                  <button
                    type="button"
                    className="text-[0.7rem] text-slate-500 hover:text-slate-700"
                    onClick={() => setLastAgentResult(null)}
                  >
                    Dismiss
                  </button>
                </div>
                <AgentResultPanel result={lastAgentResult} variant="compact" />
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === "Timeline" ? (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2 text-xs">
            {(["note", "task_created", "task_completed", "document", "event", "agent"] as const).map(
              (kind) => (
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
              ),
            )}
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
                    onClick={() =>
                      setExpandedTimelineId((id) => (id === e.id ? null : e.id))
                    }
                  >
                    <p className="text-xs text-slate-500">
                      {new Date(e.timestamp).toLocaleString()} · {e.actor} ·{" "}
                      {e.kind.replace("_", " ")}
                    </p>
                    <p className="text-slate-800">{e.summary}</p>
                  </button>
                  {expandedTimelineId === e.id ? (
                    <p className="mt-2 border-t border-slate-100 pt-2 text-xs text-slate-600">
                      {e.summary}
                    </p>
                  ) : null}
                </li>
              ))
            ) : (
            <li className="list-none">
              <EmptyState
                icon={ScrollText}
                title="No timeline entries yet."
                description="Notes, tasks, and agent actions will appear here as the matter progresses."
              />
            </li>
          )}
          </ol>
        </div>
      ) : null}

      {tab === "Notes" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <NoteComposer matterId={matter.matterId} onSaved={refresh} />
          <ul className="space-y-2 rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Notes ({notes.length})
            </p>
            {notes.length === 0 ? (
              <li className="list-none">
                <EmptyState
                  icon={MessageSquare}
                  title="No notes yet."
                  description="Add the first note for this matter using the composer."
                />
              </li>
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
                  {n.type === "Agent" ? (
                    <EditableOutputMemo
                      content={n.content}
                      matterId={matter.matterId}
                      noteId={n.id}
                      saveMode="note"
                      onSaved={({ content }) => {
                        setNotes((prev) => prev.map((row) => (row.id === n.id ? { ...row, content } : row)));
                      }}
                    />
                  ) : (
                    <p className="text-slate-800">{n.content}</p>
                  )}
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
        <div className="space-y-4">
          <MatterDocumentUpload matterId={matter.matterId} onUploaded={refresh} />
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">OCR</th>
                  <th className="px-4 py-3">PII tier</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Uploaded</th>
                </tr>
              </thead>
              <tbody>
                {documents.length ? (
                  documents.map((doc) => (
                    <tr key={doc.id} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-medium">{doc.title}</td>
                      <td className="px-4 py-3">{doc.category || "—"}</td>
                      <td className="px-4 py-3">{doc.ocrStatus || "—"}</td>
                      <td className="px-4 py-3">{doc.piiTier ?? "—"}</td>
                      <td className="px-4 py-3">{doc.fileType || "—"}</td>
                      <td className="px-4 py-3 tabular-nums">{formatDate(doc.uploadedAt)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-0">
                    <EmptyState
                      icon={FileText}
                      title="No documents yet."
                      description="Upload files from the Intake tab to attach them to this matter."
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        </div>
      ) : null}

      {tab === "Legal Elements" ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
            <label className="flex min-w-[12rem] flex-1 flex-col text-sm">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Add element
              </span>
              <input
                className="mt-1 rounded border border-slate-200 px-2 py-1.5"
                value={newElementName}
                onChange={(e) => setNewElementName(e.target.value)}
                placeholder="e.g. Persecution on account of membership"
              />
            </label>
            <button type="button" className={btnPrimary} onClick={() => void addElement()}>
              Add
            </button>
          </div>
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Element</th>
                  <th className="px-3 py-2">Assessment</th>
                  <th className="px-3 py-2">Key gap</th>
                  <th className="px-3 py-2">Next action</th>
                  <th className="px-3 py-2 w-20">Details</th>
                </tr>
              </thead>
              <tbody>
                {elements.length ? (
                  elements.map((row) => (
                    <Fragment key={row.id}>
                      <tr className="border-t border-slate-100 align-top">
                        <td className="px-3 py-2 font-medium">{row.element}</td>
                        <td className="px-3 py-2">
                          <input
                            className="w-full rounded border border-slate-200 px-2 py-1 text-sm"
                            value={row.assessment}
                            onChange={(e) =>
                              setElements((prev) =>
                                prev.map((r) =>
                                  r.id === row.id ? { ...r, assessment: e.target.value } : r,
                                ),
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
                                prev.map((r) =>
                                  r.id === row.id ? { ...r, nextAction: e.target.value } : r,
                                ),
                              )
                            }
                            onBlur={() => saveElement(row.id)}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            className="text-xs font-medium text-sky-700 hover:underline"
                            onClick={() =>
                              setExpandedElementId((id) => (id === row.id ? null : row.id))
                            }
                          >
                            {expandedElementId === row.id ? "Hide" : "Show"}
                          </button>
                        </td>
                      </tr>
                      {expandedElementId === row.id ? (
                        <tr key={`${row.id}-detail`} className="border-t border-slate-50 bg-slate-50/50">
                          <td colSpan={5} className="px-3 py-3 text-xs text-slate-700">
                            <p>
                              <span className="font-semibold">Supporting facts: </span>
                              {row.supportingFacts?.trim() || "None recorded."}
                            </p>
                            <p className="mt-2">
                              <span className="font-semibold">Supporting cases: </span>
                              {row.supportingCases?.trim() || "None recorded."}
                            </p>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="p-0">
                    <EmptyState
                      icon={ClipboardList}
                      title="No legal elements yet."
                      description="Edit assessments inline here or start from the Assessment tab."
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        </div>
      ) : null}

      {tab === "Events" ? (
        <MatterEventsPanel matterId={matter.matterId} initialEvents={events} demoMode={demoMode} />
      ) : null}

      {editOpen ? (
        <MatterHeaderEditModal
          matter={matterHeader}
          onClose={() => setEditOpen(false)}
          onSaved={(updated) => {
            setMatterHeader(updated);
            if (updated.nextDeadline !== undefined) setDeadline(updated.nextDeadline);
          }}
        />
      ) : null}
    </div>
  );
}
