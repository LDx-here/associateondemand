"use client";

import { Check, Circle } from "lucide-react";

import type { DocumentRow, InboxItem, Note } from "@/lib/types";
import { CASE_ASSESSMENT_CATEGORY } from "@/lib/assessment-documents";

type StepId = "intake" | "documents" | "draft" | "review" | "export";

type Step = {
  id: StepId;
  label: string;
  done: boolean;
  current: boolean;
};

function deriveSteps(
  notes: Note[],
  documents: DocumentRow[],
  assignments: InboxItem[],
): Step[] {
  const hasFacts = notes.some((n) => n.type === "Facts" || n.type === "Manual");
  const hasAssignment = assignments.length > 0;
  const hasAssessment =
    documents.some((d) => d.category === CASE_ASSESSMENT_CATEGORY) ||
    notes.some((n) => n.type === "Assessment Document");
  const hasDocuments = documents.length > 0 || hasAssessment;
  const hasAgentOutput = notes.some((n) => n.type === "Agent" || n.type === "Research");

  const active = assignments.find((a) =>
    ["Submitted", "In progress", "Ready for review", "Returned"].includes(a.status),
  );
  const approved = assignments.some((a) => a.status === "Approved");

  const intakeDone = hasAssignment || hasFacts;
  const documentsDone = hasDocuments;
  const draftDone =
    hasAgentOutput ||
    assignments.some((a) => ["In progress", "Ready for review", "Returned", "Approved"].includes(a.status));
  const reviewDone = assignments.some((a) => ["Ready for review", "Approved"].includes(a.status));
  const exportDone = approved;

  let current: StepId = "intake";
  if (exportDone) current = "export";
  else if (reviewDone) current = "review";
  else if (draftDone) current = "draft";
  else if (documentsDone) current = "documents";
  else if (intakeDone) current = "documents";

  if (active?.status === "Ready for review") current = "review";
  else if (active?.status === "In progress") current = "draft";
  else if (active?.status === "Submitted") current = "intake";

  return [
    { id: "intake", label: "Intake", done: intakeDone, current: current === "intake" },
    { id: "documents", label: "Documents", done: documentsDone, current: current === "documents" },
    { id: "draft", label: "Draft", done: draftDone, current: current === "draft" },
    { id: "review", label: "Review", done: reviewDone, current: current === "review" },
    { id: "export", label: "Export", done: exportDone, current: current === "export" },
  ];
}

export function MatterWorkflowStrip({
  notes,
  documents,
  assignments,
}: {
  notes: Note[];
  documents: DocumentRow[];
  assignments: InboxItem[];
}) {
  const steps = deriveSteps(notes, documents, assignments);

  return (
    <nav
      aria-label="Matter workflow"
      className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs"
    >
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center gap-1">
          {index > 0 ? <span className="text-slate-300">→</span> : null}
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${
              step.current
                ? "bg-slate-900 font-medium text-white"
                : step.done
                  ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
                  : "bg-white text-slate-500 ring-1 ring-slate-200"
            }`}
          >
            {step.done && !step.current ? (
              <Check className="h-3 w-3" aria-hidden />
            ) : (
              <Circle className="h-3 w-3" aria-hidden />
            )}
            {step.label}
          </span>
        </div>
      ))}
    </nav>
  );
}
