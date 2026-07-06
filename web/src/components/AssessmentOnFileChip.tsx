"use client";

import { useEffect, useState } from "react";

import {
  findCaseAssessmentDocument,
  type AssessmentOcrPayload,
} from "@/lib/assessment-documents";
import type { DocumentRow } from "@/lib/types";

export function AssessmentOnFileChip({
  matterId,
  documents,
  onUploadAssessment,
}: {
  matterId: string;
  documents: DocumentRow[];
  onUploadAssessment?: () => void;
}) {
  const [hasOcr, setHasOcr] = useState(false);
  const assessmentDoc = findCaseAssessmentDocument(documents);

  useEffect(() => {
    if (!assessmentDoc) {
      setHasOcr(false);
      return;
    }
    void fetch(`/api/matters/${matterId}/case-assessment-document`)
      .then((r) => r.json())
      .then((data: { payload?: AssessmentOcrPayload | null }) => {
        setHasOcr(Boolean(data.payload?.ocrText || data.payload?.facts?.length));
      })
      .catch(() => setHasOcr(false));
  }, [matterId, assessmentDoc?.id]);

  if (assessmentDoc) {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200">
        Assessment on file{hasOcr ? " — feeds drafts" : ""}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onUploadAssessment}
      className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-900 ring-1 ring-amber-200 hover:bg-amber-100"
    >
      Upload assessment →
    </button>
  );
}
