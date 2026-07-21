"use client";

import { CheckCircle2, CircleAlert, Save } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { useToast } from "@/components/Toast";
import {
  factDisplayValue,
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
  onSaved,
}: {
  matterId: string;
  payload: AssessmentOcrPayload | null;
  onSaved?: () => void;
}) {
  const { showToast } = useToast();
  const [facts, setFacts] = useState<ExtractedFactRecord[]>(() =>
    normalizeExtractedFacts(initialPayload?.facts),
  );
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setFacts(normalizeExtractedFacts(initialPayload?.facts));
    setDirty(false);
  }, [initialPayload]);

  const stats = factVerificationStats(facts);

  const updateFact = useCallback((id: string, patch: Partial<ExtractedFactRecord>) => {
    setFacts((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
    setDirty(true);
  }, []);

  async function save(verifiedBy = "Attorney") {
    if (!initialPayload) return;
    setSaving(true);
    try {
      const resp = await fetch(`/api/matters/${matterId}/case-assessment-document`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payload: {
            ...initialPayload,
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

  if (!initialPayload?.facts?.length && facts.length === 0) {
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
            Edit values and mark verified before drafting.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
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

      <ul className="space-y-2">
        {facts.map((fact) => {
          const display = factDisplayValue(fact);
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
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                  {fact.fact_type.replace(/_/g, " ")}
                </span>
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
              {fact.confidence != null ? (
                <p className="mt-1 text-[0.65rem] text-slate-500">
                  Extraction confidence {Math.round(fact.confidence * 100)}% (heuristic, not legal accuracy)
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
      <p className="text-[0.65rem] text-slate-500">
        Status: {facts.map((f) => `${f.fact_type}=${statusLabel(f)}`).join(" · ")}
      </p>
    </div>
  );
}
