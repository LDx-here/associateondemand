"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { CloseMatterButton } from "@/components/CloseMatterButton";
import { CaseActivityPanel } from "@/components/CaseActivityPanel";
import { LegalElementsPanel } from "@/components/LegalElementsPanel";
import { MatterOverviewPanel } from "@/components/MatterOverviewPanel";
import { MatterTasksPanel } from "@/components/MatterTasksPanel";
import { ProceduralTimelinePanel } from "@/components/ProceduralTimelinePanel";
import type {
  CalendarEvent,
  DocumentRow,
  LegalElementRow,
  Matter,
  Note,
  Task,
  TimelineEntry,
  InboxItem,
} from "@/lib/types";
import { btnSecondary, tabActive, tabInactive } from "@/lib/ui-classes";
import { MatterAssignmentReview } from "./MatterAssignmentReview";
import { MatterAgentAlertReview } from "./MatterAgentAlertReview";
import { MATTER_REVIEW_REFRESH_EVENT } from "@/lib/matter-review-events";
import { CaseAssessmentPanel } from "./CaseAssessmentPanel";
import { AssessmentOnFileChip } from "./AssessmentOnFileChip";
import { DraftingFactsCompletenessChip } from "./PracticeAreaFactGuide";
import { MatterStageChip } from "./MatterStageChip";
import { StatusBadge } from "./StatusBadge";
import { AttorneyInstructionsPanel } from "./AttorneyInstructionsPanel";
import { MatterWorkflowStrip } from "./MatterWorkflowStrip";
import { ResearchInputPanel } from "./ResearchInputPanel";
import type { UploadResult } from "./IntakeUploadShared";
import { MatterDocumentUpload, type DocumentUploadPayload } from "./MatterDocumentUpload";
import { cacheDocumentPreview, setBlobPreview } from "@/lib/document-preview-cache";
import { MatterDocumentsList } from "./MatterDocumentsList";
import { MatterHeaderEditModal } from "./MatterHeaderEditModal";

const tabs = [
  "Overview",
  "Documents",
  "Case activity",
  "Procedural timeline",
  "Legal elements",
  "Tasks",
] as const;

type Tab = (typeof tabs)[number];

function readInitialTabFromUrl(): Tab {
  if (typeof window === "undefined") return "Overview";
  const params = new URLSearchParams(window.location.search);
  const highlightDoc = params.get("highlightDoc")?.trim();
  const tabParam = params.get("tab")?.trim();
  if (highlightDoc) return "Documents";
  if (tabParam && tabs.includes(tabParam as Tab)) return tabParam as Tab;
  return "Overview";
}

function readInitialHighlightDocFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("highlightDoc")?.trim() || null;
}

export function MatterWorkbench({
  matter,
  initialTasks,
  initialNotes,
  initialElements,
  initialTimeline,
  initialDocuments,
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
  initialEvents?: CalendarEvent[];
  initialAssignments?: InboxItem[];
  initialAgentAlerts?: InboxItem[];
  demoMode?: boolean;
}) {
  const [tab, setTab] = useState<Tab>(readInitialTabFromUrl);
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
  const [firmTemplates, setFirmTemplates] = useState<DocumentRow[]>([]);
  const [highlightDocumentId, setHighlightDocumentId] = useState<string | null>(
    readInitialHighlightDocFromUrl,
  );
  const [uploadPreviews, setUploadPreviews] = useState<Record<string, UploadResult>>({});

  useEffect(() => {
    void fetch("/api/assessment-templates")
      .then((r) => r.json())
      .then((data: { templates?: DocumentRow[] }) => setFirmTemplates(data.templates ?? []))
      .catch(() => setFirmTemplates([]));
  }, [refreshKey]);

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
    if (m.matter) setMatterHeader(m.matter);
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

  async function handleDocumentUploaded(payload: DocumentUploadPayload) {
    const { documentId, result, file } = payload;
    if (documentId) {
      setUploadPreviews((prev) => ({ ...prev, [documentId]: result }));
      cacheDocumentPreview(matter.matterId, documentId, {
        postgresDocumentId: result.document_id,
        filename: result.filename,
      });
      if (file) {
        setBlobPreview(matter.matterId, documentId, file);
      }
      setHighlightDocumentId(documentId);
    }
    await refresh();
    setTab("Documents");
  }

  const activityNotes = notes.filter((n) => n.type !== "Procedural" && n.type !== "Facts");

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
          <div className="flex flex-wrap items-center gap-2">
            <MatterStageChip assignments={assignments} />
            <AssessmentOnFileChip
              matterId={matterHeader.matterId}
              documents={documents}
              onUploadAssessment={() => setTab("Documents")}
            />
            <DraftingFactsCompletenessChip
              matterId={matterHeader.matterId}
              caseType={matterHeader.caseType}
              onCompleteFacts={() => setTab("Documents")}
            />
            <Link href={`/assignments/new?matterId=${matterHeader.matterId}`} className={btnSecondary}>
              New assignment
            </Link>
            <button type="button" className={btnSecondary} onClick={() => setEditOpen(true)}>
              Edit matter
            </button>
            <CloseMatterButton matter={matterHeader} onStatusChanged={setMatterHeader} />
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

      <MatterWorkflowStrip notes={notes} documents={documents} assignments={assignments} showNextAction />

      <AttorneyInstructionsPanel
        matterId={matter.matterId}
        initialInstructions={notes.find((n) => n.type === "Instructions")?.content ?? ""}
        onSaved={refresh}
      />

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
        onViewAgentNote={() => setTab("Case activity")}
        caseType={matterHeader.caseType}
        onCompleteFacts={() => setTab("Documents")}
      />

      <nav className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${tab === t ? tabActive : tabInactive}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </nav>

      {tab === "Overview" ? (
        <MatterOverviewPanel
          matter={matterHeader}
          documents={documents}
          events={events}
          demoMode={demoMode}
        />
      ) : null}

      {tab === "Documents" ? (
        <div className="space-y-4">
          <MatterDocumentsList
            matterId={matter.matterId}
            documents={documents}
            highlightId={highlightDocumentId}
            uploadPreviews={uploadPreviews}
          />
          <MatterDocumentUpload matterId={matter.matterId} onUploaded={handleDocumentUploaded} />
          <CaseAssessmentPanel
            matter={matterHeader}
            documents={documents}
            firmTemplates={firmTemplates}
            onUpdated={refresh}
            onAssessmentUploaded={handleDocumentUploaded}
          />
          <ResearchInputPanel
            matterId={matter.matterId}
            researchNoteCount={notes.filter((n) => n.type === "Research").length}
            onSaved={refresh}
          />
        </div>
      ) : null}

      {tab === "Case activity" ? (
        <CaseActivityPanel
          matterId={matter.matterId}
          timeline={timeline}
          notes={activityNotes}
          refreshKey={refreshKey}
          onRefresh={refresh}
        />
      ) : null}

      {tab === "Procedural timeline" ? <ProceduralTimelinePanel matterId={matter.matterId} /> : null}

      {tab === "Legal elements" ? (
        <LegalElementsPanel
          matter={matterHeader}
          documents={documents}
          elements={elements}
          onElementsChange={setElements}
          onRefresh={refresh}
        />
      ) : null}

      {tab === "Tasks" ? (
        <MatterTasksPanel
          matterId={matter.matterId}
          caseType={matterHeader.caseType}
          initialTasks={tasks}
          onUpdated={refresh}
        />
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
