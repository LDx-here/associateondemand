"use client";

import { ChevronDown, ChevronRight, ClipboardCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  buildCaseAssessmentSummaryRows,
  elementFactCounts,
  findCaseAssessmentDocument,
  matterPracticeArea,
  normalizeExtractedFacts,
  type AssessmentOcrPayload,
} from "@/lib/assessment-documents";
import type { DraftingFactsPayload } from "@/lib/practice-area-facts";
import type { DocumentRow, Matter } from "@/lib/types";

function statusChip(status: string): string {
  switch (status) {
    case "verified":
      return "bg-emerald-100 text-emerald-900 ring-emerald-200";
    case "manual":
      return "bg-sky-100 text-sky-900 ring-sky-200";
    case "needs_review":
      return "bg-amber-100 text-amber-900 ring-amber-200";
    default:
      return "bg-slate-100 text-slate-700 ring-slate-200";
  }
}

function statusText(status: string): string {
  switch (status) {
    case "verified":
      return "Verified";
    case "manual":
      return "Attorney entered";
    case "needs_review":
      return "Needs review";
    default:
      return "Missing";
  }
}

export function CaseAssessmentSummary({
  matter,
  documents,
}: {
  matter: Matter;
  documents: DocumentRow[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [fetchedPayload, setFetchedPayload] = useState<AssessmentOcrPayload | null>(null);
  const [draftingFacts, setDraftingFacts] = useState<DraftingFactsPayload | null>(null);

  const assessmentDoc = useMemo(() => findCaseAssessmentDocument(documents), [documents]);
  const assessmentDocId = assessmentDoc?.id ?? null;
  const practiceArea = matterPracticeArea(matter);
  const payload = assessmentDoc ? fetchedPayload : null;

  useEffect(() => {
    if (!assessmentDocId) {
      setFetchedPayload(null);
      return;
    }
    void fetch(`/api/matters/${matter.matterId}/case-assessment-document`)
      .then((r) => r.json())
      .then((data: { payload?: AssessmentOcrPayload | null }) => setFetchedPayload(data.payload ?? null))
      .catch(() => setFetchedPayload(null));
  }, [matter.matterId, assessmentDocId]);

  useEffect(() => {
    void fetch(`/api/matters/${matter.matterId}/drafting-facts`)
      .then((r) => r.json())
      .then((data: { facts?: DraftingFactsPayload | null }) => setDraftingFacts(data.facts ?? null))
      .catch(() => setDraftingFacts(null));
  }, [matter.matterId]);

  const rows = useMemo(
    () =>
      buildCaseAssessmentSummaryRows({
        payload,
        caseType: matter.caseType,
        deliverableId: draftingFacts?.deliverableId ?? payload?.deliverableId ?? "aos-discretionary-brief",
        draftingFields: draftingFacts?.fields,
      }),
    [payload, matter.caseType, draftingFacts],
  );

  const elementCounts = useMemo(
    () => elementFactCounts(normalizeExtractedFacts(payload?.facts)),
    [payload?.facts],
  );

  const captured = rows.filter((r) => r.status !== "missing").length;
  const hasContent = Boolean(assessmentDoc || draftingFacts || payload?.ocrText);

  if (!hasContent) return null;

  return (
    <section className="rounded-lg border border-slate-200 bg-slate-50/80 p-3">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
          <ClipboardCheck className="h-4 w-4 text-sky-800" aria-hidden />
          Case assessment summary
          <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
            {captured}/{rows.length} elements
          </span>
        </span>
        {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
      <p className="mt-1 text-xs text-slate-600">
        {practiceAreaLabel(practiceArea)} · from uploaded scan + saved facts · feeds agent prompts
      </p>
      {elementCounts.length > 0 ? (
        <p className="mt-1 text-xs text-slate-600">
          Supporting facts by element:{" "}
          {elementCounts.map((e) => `${e.element} (${e.verified}/${e.count} verified)`).join(" · ")}
        </p>
      ) : null}

      {expanded ? (
        <div className="mt-3 overflow-x-auto rounded-md border border-slate-200 bg-white">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-slate-50 text-[0.65rem] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">Element</th>
                <th className="px-3 py-2">Draft section</th>
                <th className="px-3 py-2">Value</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const value = row.attorneyValue ?? row.extractedValue ?? "—";
                return (
                  <tr key={row.fieldId} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-medium text-slate-800">{row.label}</td>
                    <td className="px-3 py-2 text-slate-600">{row.feedsSection ?? "—"}</td>
                    <td className="max-w-xs truncate px-3 py-2 text-slate-700" title={value}>
                      {value}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[0.65rem] font-medium ring-1 ${statusChip(row.status)}`}
                      >
                        {statusText(row.status)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

function practiceAreaLabel(area: string): string {
  if (area === "immigration") return "Immigration";
  if (area === "personal_injury") return "Personal injury";
  return "General";
}
