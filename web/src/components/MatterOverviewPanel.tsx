"use client";

import { LayoutDashboard } from "lucide-react";

import { CaseAssessmentSummary } from "@/components/CaseAssessmentSummary";
import { MatterEventsPanel } from "@/components/MatterEventsPanel";
import { TemplateApplyPanel } from "@/components/TemplateApplyPanel";
import type { CalendarEvent, DocumentRow, Matter } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export function MatterOverviewPanel({
  matter,
  documents,
  events,
  demoMode,
}: {
  matter: Matter;
  documents: DocumentRow[];
  events: CalendarEvent[];
  demoMode?: boolean;
}) {
  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
          <LayoutDashboard className="h-4 w-4" aria-hidden />
          Matter overview
        </h3>
        <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-slate-500">Case type</dt>
            <dd className="font-medium">{matter.caseType || "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Posture</dt>
            <dd>{matter.proceduralPosture ?? matter.posture ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Status</dt>
            <dd>{matter.status || "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Next deadline</dt>
            <dd className={matter.nextDeadline ? "font-medium text-rose-700" : ""}>
              {matter.nextDeadline ? formatDate(matter.nextDeadline) : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Court / judge</dt>
            <dd>{[matter.court, matter.judge].filter(Boolean).join(" · ") || "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Documents on file</dt>
            <dd>{documents.length}</dd>
          </div>
        </dl>
        {matter.summary ? <p className="mt-3 text-sm text-slate-700">{matter.summary}</p> : null}
      </section>

      <CaseAssessmentSummary matter={matter} documents={documents} />

      <TemplateApplyPanel matter={matter} compact />

      {events.length > 0 ? (
        <section>
          <h3 className="mb-2 text-sm font-semibold text-slate-900">Upcoming calendar</h3>
          <MatterEventsPanel matterId={matter.matterId} initialEvents={events} demoMode={demoMode ?? false} />
        </section>
      ) : null}
    </div>
  );
}
