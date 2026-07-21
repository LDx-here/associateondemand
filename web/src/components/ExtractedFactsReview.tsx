"use client";

import { CheckCircle2, CircleAlert, RefreshCw, Save, Sparkles } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { useToast } from "@/components/Toast";
import {
  factDisplayLabel,
  factDisplayValue,
  groupFactsByLegalElement,
  normalizeExtractedFacts,
  type AssessmentOcrPayload,
  type ExtractedFactRecord,
} from "@/lib/assessment-documents";
import { factVerificationStats } from "@/lib/extraction-confidence";
import { btnPrimary, btnSecondary } from "@/lib/ui-classes";
import { formatDate } from "@/lib/utils";

function statusLabel(fact: ExtractedFactRecord): string {
  return fact.verified ? "Verified" : "Needs review";
}

export function ExtractedFactsReview({
  matterId,
  payload: initialPayload,
  caseType,
  practiceArea,
  deliverableId,
  onSaved,
}: {
  matterId: string;
  payload: AssessmentOcrPayload | null;
  caseType?: string;
  practiceArea?: string;
  deliverableId?: string;
  onSaved?: () => void;
}) {
  const { showToast } = useToast();
  const [payload, setPayload] = useState(initialPayload);
  const [facts, setFacts] = useState<ExtractedFactRecord[]>(() =>
    normalizeExtractedFacts(initialPayload?.facts),
  );
  const [saving, setSaving] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [prevInitialPayload, setPrevInitialPayload] = useState(initialPayload);

  if (initialPayload !== prevInitialPayload) {
    setPrevInitialPayload(initialPayload);
    setPayload(initialPayload);
    setFacts(normalizeExtractedFacts(initialPayload?.facts));
    setDirty(false);
  }

  const stats = factVerificationStats(facts);
  const grouped = useMemo(() => groupFactsByLegalElement(facts), [facts]);

  const updateFact = useCallback((id: string, patch: Partial<ExtractedFactRecord>) => {
    setFacts((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
    setDirty(true);
  }, []);

  async function save(verifiedBy = "Attorney") {
    if (!payload) return;
    setSaving(true);
    try {
      const resp = await fetch(`/api/matters/${matterId}/case-assessment-document`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payload: {
            ...payload,
            facts,
          },
          verifiedBy,
        }),
      });
      if (!resp.ok) {
        const data = (await resp.json()) as { error?: string };
        throw new Error(data.error ?? "Save failed");
      }
      showToast("Extracted facts saved — verified values feed drafts.", "success");
      setDirty(false);
      onSaved?.();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not save facts", "error");
    } finally {
      setSaving(false);
    }
  }

  async function reanalyzeWithAi() {
    if (!payload) return;
    setReanalyzing(true);
    try {
      const resp = await fetch(`/api/matters/${matterId}/enrich-facts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseType,
          practiceArea,
          deliverableId,
          force: true,
        }),
      });
      const data = (await resp.json()) as { payload?: AssessmentOcrPayload; error?: string };
      if (!resp.ok) {
        throw new Error(data.error ?? "Re-analysis failed");
      }
      if (data.payload) {
        setPayload(data.payload);
        setFacts(normalizeExtractedFacts(data.payload.facts));
        setDirty(false);
        showToast("Facts re-mapped to legal elements with AI.", "success");
        onSaved?.();
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not re-analyze facts", "error");
    } finally {
      setReanalyzing(false);
    }
  }

  function markAllVerified() {
    const now = new Date().toISOString();
    setFacts((prev) =>
      prev.map((f) => ({
        ...f,
        verified: true,
        verifiedBy: "Attorney",
        verifiedAt: now,
      })),
    );
    setDirty(true);
  }

  if (!payload?.facts?.length && facts.length === 0) {
    return (
      <p className="text-xs text-slate-500">
        No structured facts extracted yet. Upload a clearer scan or fill quick facts below.
      </p>
    );
  }

  return (
    <div className="space-y-3 rounded-md border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Extracted facts — attorney review</h3>
          <p className="text-xs text-slate-600">
            {stats.verified}/{stats.total} verified
            {stats.total > 0 ? ` (${stats.percent}%)` : ""}
            {" · "}
            Mapped to legal elements · edit values before drafting.
          </p>
          {payload?.enrichmentWarning ? (
            <p className="mt-1 text-xs text-amber-800">{payload.enrichmentWarning}</p>
          ) : payload?.enrichmentSummary ? (
            <p className="mt-1 text-xs text-slate-500">{payload.enrichmentSummary}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={`${btnSecondary} text-xs`}
            disabled={reanalyzing}
            onClick={() => void reanalyzeWithAi()}
          >
            {reanalyzing ? (
              <RefreshCw className="mr-1 inline h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <Sparkles className="mr-1 inline h-3.5 w-3.5" aria-hidden />
            )}
            {reanalyzing ? "Analyzing…" : "Re-analyze with AI"}
          </button>
          <button type="button" className={`${btnSecondary} text-xs`} onClick={markAllVerified}>
            Mark all verified
          </button>
          <button
            type="button"
            className={`${btnPrimary} text-xs disabled:opacity-50`}
            disabled={saving || !dirty}
            onClick={() => void save()}
          >
            <Save className="mr-1 inline h-3.5 w-3.5" aria-hidden />
            {saving ? "Saving…" : "Save review"}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {grouped.map(({ element, facts: groupFacts }) => (
          <section key={element} className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-sky-900">{element}</h4>
            <ul className="space-y-2">
              {groupFacts.map((fact) => {
                const display = factDisplayValue(fact);
                const label = factDisplayLabel(fact);
                return (
                  <li
                    key={fact.id}
                    className={`rounded-md border p-2 text-sm ${
                      fact.verified
                        ? "border-emerald-200 bg-emerald-50/40"
                        : "border-amber-200 bg-amber-50/30"
                    }`}
                  >
                    <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-slate-800">{label}</span>
                        {fact.legalElement && fact.legalElement !== element ? (
                          <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[0.65rem] font-medium text-sky-900 ring-1 ring-sky-200">
                            {fact.legalElement}
                          </span>
                        ) : null}
                      </div>
                      <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs">
                        <input
                          type="checkbox"
                          checked={Boolean(fact.verified)}
                          onChange={(e) =>
                            updateFact(fact.id!, {
                              verified: e.target.checked,
                              verifiedBy: e.target.checked ? "Attorney" : undefined,
                              verifiedAt: e.target.checked ? new Date().toISOString() : undefined,
                            })
                          }
                        />
                        {fact.verified ? (
                          <span className="inline-flex items-center gap-1 text-emerald-800">
                            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                            Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-900">
                            <CircleAlert className="h-3.5 w-3.5" aria-hidden />
                            Needs review
                          </span>
                        )}
                      </label>
                    </div>
                    <input
                      className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                      value={fact.editedValue ?? fact.value}
                      onChange={(e) =>
                        updateFact(fact.id!, {
                          editedValue: e.target.value,
                          verified: false,
                          verifiedBy: undefined,
                          verifiedAt: undefined,
                        })
                      }
                    />
                    {fact.elementFit ? (
                      <p className="mt-1 text-xs text-slate-700">
                        <span className="font-medium">Why it matters: </span>
                        {fact.elementFit}
                      </p>
                    ) : null}
                    {fact.context ? (
                      <p className="mt-1 text-[0.65rem] text-slate-500">
                        Source: {fact.context.slice(0, 200)}
                        {fact.context.length > 200 ? "…" : ""}
                      </p>
                    ) : null}
                    {fact.confidence != null ? (
                      <p className="mt-1 text-[0.65rem] text-slate-500">
                        Extraction confidence {Math.round(fact.confidence * 100)}% (heuristic, not legal
                        accuracy)
                      </p>
                    ) : null}
                    {fact.verified && fact.verifiedAt ? (
                      <p className="mt-1 text-[0.65rem] text-emerald-800">
                        Verified by {fact.verifiedBy ?? "Attorney"} · {formatDate(fact.verifiedAt)}
                      </p>
                    ) : display !== fact.value && fact.value ? (
                      <p className="mt-1 text-[0.65rem] text-slate-500">OCR original: {fact.value}</p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
      <p className="text-[0.65rem] text-slate-500">
        Status: {facts.map((f) => `${factDisplayLabel(f)}=${statusLabel(f)}`).join(" · ")}
      </p>
    </div>
  );
}
