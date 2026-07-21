"use client";

import { Brain, CheckCircle2, Circle, Upload } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import {
  attorneyUploadApproved,
  uploadDocument,
} from "@/components/IntakeUploadShared";
import { useToast } from "@/components/Toast";
import {
  encodeFirmSampleCategory,
  FIRM_TEMPLATE_MATTER_ID,
  practiceAreaLabel,
} from "@/lib/assessment-documents";
import type { DocumentRow } from "@/lib/types";
import { btnPrimary } from "@/lib/ui-classes";
import { formatDate } from "@/lib/utils";

type FirmMemoryStatus = {
  templateCount: number;
  sampleCount: number;
  stylePreferenceCount: number;
  configured: boolean;
};

const PRACTICE_AREAS = ["immigration", "personal_injury"] as const;

function StepIcon({ done }: { done: boolean }) {
  return done ? (
    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
  ) : (
    <Circle className="h-4 w-4 shrink-0 text-violet-400" aria-hidden />
  );
}

const TONE_OPTIONS = [
  "Formal / court-ready",
  "Persuasive advocacy",
  "Concise bullet style",
  "Narrative storytelling",
];

const CITATION_OPTIONS = [
  "Bluebook with short-form cites",
  "Parenthetical cites only",
  "Footnotes",
  "Inline cites with pinpoints",
];

export function FirmMemorySetup() {
  const { showToast } = useToast();
  const [status, setStatus] = useState<FirmMemoryStatus | null>(null);
  const [samples, setSamples] = useState<DocumentRow[]>([]);
  const [area, setArea] = useState<(typeof PRACTICE_AREAS)[number]>("immigration");
  const [sampleBusy, setSampleBusy] = useState(false);
  const [styleBusy, setStyleBusy] = useState(false);
  const [firmName, setFirmName] = useState("");
  const [tone, setTone] = useState(TONE_OPTIONS[0]);
  const [citationFormat, setCitationFormat] = useState(CITATION_OPTIONS[0]);
  const [headerFormat, setHeaderFormat] = useState("MEMORANDUM / TO-FROM-DATE-RE block");

  const refresh = useCallback(async () => {
    const [statusResp, samplesResp] = await Promise.all([
      fetch("/api/firm-memory"),
      fetch("/api/firm-samples"),
    ]);
    const statusData = (await statusResp.json()) as FirmMemoryStatus;
    const samplesData = (await samplesResp.json()) as { samples?: DocumentRow[] };
    setStatus(statusData);
    setSamples(samplesData.samples ?? []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([fetch("/api/firm-memory"), fetch("/api/firm-samples")])
      .then(async ([statusResp, samplesResp]) => {
        const statusData = (await statusResp.json()) as FirmMemoryStatus;
        const samplesData = (await samplesResp.json()) as { samples?: DocumentRow[] };
        if (cancelled) return;
        setStatus(statusData);
        setSamples(samplesData.samples ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSampleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const input = e.currentTarget.elements.namedItem("sample-file") as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    setSampleBusy(true);
    try {
      const category = encodeFirmSampleCategory(area);
      const data = await uploadDocument(FIRM_TEMPLATE_MATTER_ID, file, attorneyUploadApproved(), "single", {
        documentCategory: category,
      });
      if (data.error) {
        showToast(data.error, "error");
        return;
      }
      const resp = await fetch("/api/firm-samples", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data.filename ?? file.name,
          practiceArea: area,
          airtableDocumentId: data.airtable_document_id,
        }),
      });
      if (!resp.ok) {
        const err = (await resp.json()) as { error?: string };
        showToast(err.error ?? "Sample save failed", "error");
        return;
      }
      showToast("Sample brief saved — feeds style alignment and sample discount eligibility.", "success");
      await refresh();
      input.value = "";
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Upload failed", "error");
    } finally {
      setSampleBusy(false);
    }
  }

  async function onSaveStyle(e: React.FormEvent) {
    e.preventDefault();
    setStyleBusy(true);
    try {
      const resp = await fetch("/api/firm-memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firmName: firmName.trim() || "Client firm",
          stylePreference: "Style preferences",
          tone,
          citationFormat,
          headerFormat,
          body: `Preferred tone: ${tone}\nCitation format: ${citationFormat}\nHeader format: ${headerFormat}`,
        }),
      });
      const data = (await resp.json()) as { error?: string };
      if (!resp.ok) {
        showToast(data.error ?? "Save failed", "error");
        return;
      }
      showToast("Style preferences saved to Firm Memory.", "success");
      await refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Save failed", "error");
    } finally {
      setStyleBusy(false);
    }
  }

  const step1Done = (status?.templateCount ?? 0) > 0;
  const step2Done = (status?.sampleCount ?? 0) > 0;
  const step3Done = (status?.stylePreferenceCount ?? 0) > 0;

  return (
    <section id="firm-memory" className="space-y-4 rounded-lg border border-violet-300 bg-violet-50/60 p-4">
      <div className="flex items-start gap-2">
        <Brain className="mt-0.5 h-5 w-5 text-violet-800" aria-hidden />
        <div>
          <h2 className="text-sm font-semibold text-violet-950">Firm Memory setup</h2>
          <p className="mt-0.5 text-xs text-violet-900">
            Teach AssociateOnDemand your firm&apos;s voice before your first overflow assignment.
            Complete all three steps so drafts read like your in-house associate — not generic AI.
          </p>
          {status && !status.configured ? (
            <p className="mt-2 text-xs font-medium text-amber-900">
              Firm Memory not configured yet — start with Step 1 below.
            </p>
          ) : null}
        </div>
      </div>

      <ol className="space-y-4">
        <li className="rounded-md border border-white bg-white p-3 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
            <StepIcon done={step1Done} />
            Step 1 — Upload firm assessment template
          </div>
          <p className="mt-1 text-xs text-slate-600">
            Upload your blank case assessment form once per practice area. Matters use it on the
            Documents tab.
          </p>
          <Link
            href="#firm-assessment-templates"
            className="mt-2 inline-block text-xs font-medium text-violet-800 underline-offset-2 hover:underline"
          >
            Go to firm assessment templates ↓
          </Link>
        </li>

        <li className="rounded-md border border-white bg-white p-3 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
            <StepIcon done={step2Done} />
            Step 2 — Upload 1–2 sample briefs
          </div>
          <p className="mt-1 text-xs text-slate-600">
            Prior work in your firm&apos;s style feeds drafting alignment and unlocks the sample
            discount at assignment intake.
          </p>
          {samples.length > 0 ? (
            <ul className="mt-2 space-y-1 text-xs text-emerald-800">
              {samples.map((s) => (
                <li key={s.id}>
                  {s.title} ({formatDate(s.uploadedAt)})
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-xs text-slate-500">No sample briefs on file yet.</p>
          )}
          <form className="mt-3 space-y-2" onSubmit={onSampleUpload}>
            <select
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={area}
              onChange={(e) => setArea(e.target.value as (typeof PRACTICE_AREAS)[number])}
            >
              {PRACTICE_AREAS.map((pa) => (
                <option key={pa} value={pa}>
                  {practiceAreaLabel(pa)}
                </option>
              ))}
            </select>
            <input
              accept=".pdf,.doc,.docx"
              className="w-full text-sm"
              name="sample-file"
              type="file"
              required
            />
            <button
              type="submit"
              disabled={sampleBusy}
              className={`${btnPrimary} inline-flex items-center gap-2 text-sm disabled:opacity-50`}
            >
              <Upload className="h-4 w-4" aria-hidden />
              {sampleBusy ? "Uploading…" : "Upload sample brief"}
            </button>
          </form>
        </li>

        <li className="rounded-md border border-white bg-white p-3 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
            <StepIcon done={step3Done} />
            Step 3 — Save style preferences
          </div>
          <p className="mt-1 text-xs text-slate-600">
            Tone, citation format, and headers persist to Strategy Patterns for future drafts. You can
            also refine Firm Memory by editing agent output on any matter → Save to Firm Memory.
          </p>
          <form className="mt-3 grid gap-3 sm:grid-cols-2" onSubmit={onSaveStyle}>
            <label className="block text-sm sm:col-span-2">
              <span className="text-slate-700">Firm name (optional)</span>
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={firmName}
                onChange={(e) => setFirmName(e.target.value)}
                placeholder="Smith & Jones LLP"
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-700">Tone</span>
              <select
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
              >
                {TONE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-slate-700">Citation format</span>
              <select
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={citationFormat}
                onChange={(e) => setCitationFormat(e.target.value)}
              >
                {CITATION_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="text-slate-700">Header / memo format</span>
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={headerFormat}
                onChange={(e) => setHeaderFormat(e.target.value)}
              />
            </label>
            <div className="sm:col-span-2">
              <button type="submit" disabled={styleBusy} className={`${btnPrimary} text-sm disabled:opacity-50`}>
                {styleBusy ? "Saving…" : "Save style preferences"}
              </button>
            </div>
          </form>
        </li>
      </ol>
    </section>
  );
}
