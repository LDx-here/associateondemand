"use client";

import { ChevronDown, ChevronRight, FileCheck2, FileUp } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import {
  TierZeroBanner,
  tierRequiresManualApproval,
  UploadProgressTable,
  uploadDocument,
  type UploadResult,
} from "@/components/IntakeUploadShared";
import { useToast } from "@/components/Toast";
import { PracticeAreaFactGuide } from "@/components/PracticeAreaFactGuide";
import {
  CASE_ASSESSMENT_CATEGORY,
  defaultTemplateHref,
  findAssessmentTemplate,
  findCaseAssessmentDocument,
  matterPracticeArea,
  practiceAreaLabel,
  type AssessmentOcrPayload,
} from "@/lib/assessment-documents";
import type { DocumentRow, Matter } from "@/lib/types";
import { btnPrimary } from "@/lib/ui-classes";
import { formatDate } from "@/lib/utils";

async function registerCaseAssessmentDocument(
  matterId: string,
  payload: {
    title: string;
    airtableDocumentId?: string;
    ocrText?: string;
    facts?: AssessmentOcrPayload["facts"];
  },
): Promise<void> {
  const resp = await fetch(`/api/matters/${matterId}/case-assessment-document`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    const data = (await resp.json()) as { error?: string };
    throw new Error(data.error ?? "Could not register case assessment document");
  }
}

export function CaseAssessmentPanel({
  matter,
  documents,
  firmTemplates,
  onUpdated,
}: {
  matter: Matter;
  documents: DocumentRow[];
  firmTemplates: DocumentRow[];
  onUpdated?: () => void;
}) {
  const { showToast } = useToast();
  const [manualApproved, setManualApproved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [showQuickFacts, setShowQuickFacts] = useState(false);
  const [showExtracted, setShowExtracted] = useState(false);
  const [ocrPreview, setOcrPreview] = useState<AssessmentOcrPayload | null>(null);

  const practiceArea = matterPracticeArea(matter);
  const assessmentDoc = useMemo(() => findCaseAssessmentDocument(documents), [documents]);
  const firmTemplate = useMemo(
    () => findAssessmentTemplate(firmTemplates, practiceArea),
    [firmTemplates, practiceArea],
  );
  const staticTemplateHref = defaultTemplateHref(practiceArea);

  async function loadExtractedFacts() {
    if (ocrPreview) {
      setShowExtracted((v) => !v);
      return;
    }
    const resp = await fetch(`/api/matters/${matter.matterId}/case-assessment-document`);
    const data = (await resp.json()) as { payload?: AssessmentOcrPayload | null };
    if (data.payload) {
      setOcrPreview(data.payload);
      setShowExtracted(true);
    } else {
      showToast("No extracted text saved yet — re-upload the assessment if OCR ran offline.", "error");
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (tierRequiresManualApproval() && !manualApproved) return;
    const input = e.currentTarget.elements.namedItem("assessment-file") as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    setBusy(true);
    setError(null);
    setResult(null);

    try {
      const data = await uploadDocument(matter.matterId, file, manualApproved, "single", {
        documentCategory: CASE_ASSESSMENT_CATEGORY,
      });
      if (data.error) {
        setError(data.error);
        return;
      }
      setResult(data);
      await registerCaseAssessmentDocument(matter.matterId, {
        title: data.filename ?? file.name,
        airtableDocumentId: data.airtable_document_id,
        ocrText: data.text_preview,
        facts: data.facts,
      });
      showToast("Case assessment on file — feeds drafts.", "success");
      onUpdated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-4 rounded-lg border border-sky-200 bg-sky-50/60 p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <FileCheck2 className="mt-0.5 h-5 w-5 shrink-0 text-sky-800" aria-hidden />
          <div>
            <h2 className="text-sm font-semibold text-sky-950">Case assessment</h2>
            <p className="mt-0.5 text-xs text-sky-900">
              Upload your completed assessment form (PDF or photo). We OCR the scan and feed extracted
              facts into drafting — same workflow as scanning a paper intake form.
            </p>
          </div>
        </div>
        {assessmentDoc ? (
          <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-900 ring-1 ring-emerald-200">
            Assessment on file — feeds drafts
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-900 ring-1 ring-amber-200">
            No assessment uploaded
          </span>
        )}
      </div>

      {assessmentDoc ? (
        <div className="rounded-md border border-sky-200 bg-white p-3 text-sm">
          <p className="font-medium text-slate-900">{assessmentDoc.title}</p>
          <p className="mt-1 text-xs text-slate-500">
            Uploaded {formatDate(assessmentDoc.uploadedAt)}
            {assessmentDoc.ocrStatus ? ` · OCR ${assessmentDoc.ocrStatus}` : ""}
          </p>
          <button
            type="button"
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-sky-800 hover:underline"
            onClick={() => void loadExtractedFacts()}
          >
            {showExtracted ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            View extracted facts
          </button>
          {showExtracted && ocrPreview ? (
            <div className="mt-2 space-y-2 rounded border border-slate-100 bg-slate-50 p-2 text-xs text-slate-700">
              {ocrPreview.facts?.length ? (
                <ul className="list-disc space-y-1 pl-4">
                  {ocrPreview.facts.map((f, i) => (
                    <li key={`${f.fact_type}-${i}`}>
                      <span className="font-medium">{f.fact_type}:</span> {f.value}
                    </li>
                  ))}
                </ul>
              ) : null}
              {ocrPreview.ocrText ? (
                <p className="whitespace-pre-wrap border-t border-slate-200 pt-2">{ocrPreview.ocrText}</p>
              ) : (
                <p className="text-slate-500">No OCR text stored for this document.</p>
              )}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="space-y-3 rounded-md border border-dashed border-sky-300 bg-white p-4">
          <p className="text-sm text-slate-700">
            Use the same assessment PDF or worksheet you already use with clients. Upload the filled
            version here — not a web checklist.
          </p>
          {(firmTemplate || staticTemplateHref) && (
            <p className="text-xs text-slate-600">
              Need a blank form?{" "}
              {firmTemplate ? (
                <span className="font-medium text-sky-800">
                  Firm template on file: {firmTemplate.title}
                </span>
              ) : null}
              {staticTemplateHref ? (
                <a
                  href={staticTemplateHref}
                  download
                  className="font-medium text-sky-800 hover:underline"
                >
                  Download {practiceAreaLabel(practiceArea)} assessment template
                </a>
              ) : null}
              {" · "}
              <Link href="/templates#firm-assessment-templates" className="font-medium text-sky-800 hover:underline">
                Upload firm template once
              </Link>
            </p>
          )}
          <TierZeroBanner approved={manualApproved} onApprovedChange={setManualApproved} />
          <form className="space-y-3" onSubmit={onSubmit}>
            <input
              accept=".pdf,.png,.jpg,.jpeg,.tif,.tiff"
              className="w-full text-sm"
              name="assessment-file"
              type="file"
              required
            />
            <button
              type="submit"
              disabled={busy || (tierRequiresManualApproval() && !manualApproved)}
              className={`${btnPrimary} w-full disabled:opacity-50`}
            >
              {busy ? "Uploading & scanning…" : "Upload case assessment"}
            </button>
          </form>
          {error ? <p className="text-sm text-rose-700">{error}</p> : null}
          {result ? (
            <UploadProgressTable
              items={[{ name: result.filename ?? "upload", status: "done", result }]}
            />
          ) : null}
        </div>
      )}

      <div className="rounded-md border border-slate-200 bg-white">
        <button
          type="button"
          className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium text-slate-800"
          onClick={() => setShowQuickFacts((v) => !v)}
        >
          <span className="inline-flex items-center gap-2">
            <FileUp className="h-4 w-4 text-slate-500" aria-hidden />
            Or fill quick facts below (optional)
          </span>
          {showQuickFacts ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        {showQuickFacts ? (
          <div className="border-t border-slate-100 p-3">
            <p className="mb-3 text-xs text-slate-500">
              Prefer typing? Use this checklist when you do not have a scanned assessment. Document
              upload is the primary path.
            </p>
            <PracticeAreaFactGuide
              matterId={matter.matterId}
              caseType={matter.caseType}
              mode="workbench"
              compact
              onSaved={onUpdated}
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}
