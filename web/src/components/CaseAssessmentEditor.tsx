"use client";

import { useState } from "react";

import type { CaseAssessment } from "@/lib/types";
import { prefillCommandPanel } from "@/lib/case-assessment";

function Field({
  label,
  value,
  onChange,
  rows = 2,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  const Tag = rows > 1 ? "textarea" : "input";
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
      <Tag
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        value={value}
        rows={rows > 1 ? rows : undefined}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

export function CaseAssessmentEditor({
  matterId,
  initial,
}: {
  matterId: string;
  initial: CaseAssessment;
}) {
  const [data, setData] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const resp = await fetch(`/api/matters/${matterId}/case-assessment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!resp.ok) {
        const err = (await resp.json()) as { error?: string };
        setMessage(err.error ?? "Save failed");
        return;
      }
      setMessage("Case assessment saved.");
    } finally {
      setSaving(false);
    }
  }

  function patch<K extends keyof CaseAssessment>(key: K, value: CaseAssessment[K]) {
    setData((prev) => ({ ...prev, [key]: value }));
  }

  function patchAction(index: number, value: string) {
    setData((prev) => {
      const actions = [...prev.immediateActions] as CaseAssessment["immediateActions"];
      actions[index] = value;
      return { ...prev, immediateActions: actions };
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-900">A — Procedural posture & history</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Court / agency" value={data.courtAgency} onChange={(v) => patch("courtAgency", v)} />
          <Field label="Judge / officer" value={data.judgeOfficer} onChange={(v) => patch("judgeOfficer", v)} />
          <Field label="Current stage" value={data.currentStage} onChange={(v) => patch("currentStage", v)} />
          <Field label="Deadline risk" value={data.deadlineRisk} onChange={(v) => patch("deadlineRisk", v)} />
          <Field label="Filing history" value={data.filingHistory} onChange={(v) => patch("filingHistory", v)} rows={3} />
          <Field
            label="Representations on record"
            value={data.representationsOnRecord}
            onChange={(v) => patch("representationsOnRecord", v)}
            rows={3}
          />
          <Field label="Vulnerability" value={data.vulnerability} onChange={(v) => patch("vulnerability", v)} rows={2} />
          <Field
            label="Additional deadlines"
            value={data.additionalDeadlines}
            onChange={(v) => patch("additionalDeadlines", v)}
            rows={2}
          />
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-900">B — Claim basis & assessment</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Claim type" value={data.claimType} onChange={(v) => patch("claimType", v)} />
          <Field label="Legal standard" value={data.legalStandard} onChange={(v) => patch("legalStandard", v)} rows={2} />
          <Field
            label="Claim elements"
            value={data.claimElementsNotes}
            onChange={(v) => patch("claimElementsNotes", v)}
            rows={4}
          />
          <Field label="Documents in file" value={data.documentsInFile} onChange={(v) => patch("documentsInFile", v)} rows={4} />
          <Field
            label="Areas to strengthen"
            value={data.areasToStrengthen}
            onChange={(v) => patch("areasToStrengthen", v)}
            rows={3}
          />
          <Field
            label="Overall assessment"
            value={data.overallAssessment}
            onChange={(v) => patch("overallAssessment", v)}
            rows={3}
          />
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-900">C — Next steps & follow-ups</h3>
        <div className="mt-3 space-y-3">
          {data.immediateActions.map((action, i) => (
            <div key={i} className="flex flex-wrap items-end gap-2">
              <div className="min-w-[200px] flex-1">
                <Field
                  label={`Immediate action ${i + 1}`}
                  value={action}
                  onChange={(v) => patchAction(i, v)}
                  rows={2}
                />
              </div>
              {action.trim() ? (
                <button
                  type="button"
                  className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-medium text-sky-800 hover:bg-sky-100"
                  onClick={() => prefillCommandPanel(action.trim())}
                >
                  Send to Command Panel
                </button>
              ) : null}
            </div>
          ))}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Last client contact"
              value={data.lastClientContact}
              onChange={(v) => patch("lastClientContact", v)}
            />
            <Field
              label="Next scheduled contact"
              value={data.nextScheduledContact}
              onChange={(v) => patch("nextScheduledContact", v)}
            />
            <Field
              label="Outstanding client tasks"
              value={data.outstandingClientTasks}
              onChange={(v) => patch("outstandingClientTasks", v)}
              rows={2}
            />
            <Field
              label="Attorney review needed"
              value={data.attorneyReviewNeeded}
              onChange={(v) => patch("attorneyReviewNeeded", v)}
              rows={2}
            />
            <Field
              label="Strategy questions"
              value={data.strategyQuestions}
              onChange={(v) => patch("strategyQuestions", v)}
              rows={2}
            />
            <Field label="Reminders" value={data.reminders} onChange={(v) => patch("reminders", v)} rows={2} />
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-900">Audit sign-off</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Reviewed by" value={data.reviewedBy} onChange={(v) => patch("reviewedBy", v)} />
          <Field label="Review date" value={data.reviewDate} onChange={(v) => patch("reviewDate", v)} />
          <Field label="Referred to" value={data.referredTo} onChange={(v) => patch("referredTo", v)} />
          <Field
            label="Escalation required?"
            value={data.escalationRequired}
            onChange={(v) => patch("escalationRequired", v)}
          />
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={saving}
          className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
          onClick={save}
        >
          {saving ? "Saving…" : "Save case assessment"}
        </button>
        {message ? <p className="text-sm text-slate-600">{message}</p> : null}
      </div>
    </div>
  );
}
