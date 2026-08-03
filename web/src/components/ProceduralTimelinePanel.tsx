"use client";

import { Gavel, Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { EmptyState } from "@/components/EmptyState";
import { useToast } from "@/components/Toast";
import {
  emptyProceduralTimeline,
  newProceduralStep,
  type ProceduralStep,
  type ProceduralTimelinePayload,
} from "@/lib/procedural-timeline";
import { btnPrimary, btnSecondary } from "@/lib/ui-classes";

const inputClass = "w-full rounded border border-slate-200 px-2 py-1.5 text-sm";

export function ProceduralTimelinePanel({ matterId }: { matterId: string }) {
  const { showToast } = useToast();
  const [payload, setPayload] = useState<ProceduralTimelinePayload>(() => emptyProceduralTimeline(matterId));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Show the loading state immediately (same render) when switching matters,
  // rather than synchronously inside the effect below.
  const [prevMatterId, setPrevMatterId] = useState(matterId);
  if (matterId !== prevMatterId) {
    setPrevMatterId(matterId);
    setLoading(true);
  }

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const resp = await fetch(`/api/matters/${matterId}/procedural-timeline`);
        const data = (await resp.json()) as { timeline?: ProceduralTimelinePayload | null };
        if (cancelled) return;
        setPayload(data.timeline ?? emptyProceduralTimeline(matterId));
        setDirty(false);
      } catch {
        if (!cancelled) setPayload(emptyProceduralTimeline(matterId));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [matterId]);

  function updateStep(id: string, patch: Partial<ProceduralStep>) {
    setPayload((prev) => ({
      ...prev,
      steps: prev.steps.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }));
    setDirty(true);
  }

  function addStep() {
    setPayload((prev) => ({ ...prev, steps: [...prev.steps, newProceduralStep()] }));
    setDirty(true);
  }

  function removeStep(id: string) {
    setPayload((prev) => ({ ...prev, steps: prev.steps.filter((s) => s.id !== id) }));
    setDirty(true);
  }

  async function save() {
    setSaving(true);
    try {
      const resp = await fetch(`/api/matters/${matterId}/procedural-timeline`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timeline: payload }),
      });
      if (!resp.ok) {
        const data = (await resp.json()) as { error?: string };
        throw new Error(data.error ?? "Save failed");
      }
      showToast("Procedural timeline saved.", "success");
      setDirty(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not save timeline", "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Loading procedural timeline…</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Procedural timeline</h3>
          <p className="text-xs text-slate-600">
            Court filings, agency receipts, and where the case sits in process — not agent activity.
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" className={`${btnSecondary} text-xs`} onClick={addStep}>
            <Plus className="mr-1 inline h-3.5 w-3.5" aria-hidden />
            Add step
          </button>
          <button
            type="button"
            className={`${btnPrimary} text-xs disabled:opacity-50`}
            disabled={saving || !dirty}
            onClick={() => void save()}
          >
            <Save className="mr-1 inline h-3.5 w-3.5" aria-hidden />
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {payload.steps.length === 0 ? (
        <EmptyState
          icon={Gavel}
          title="No procedural steps recorded."
          description="Add filings, hearing dates, or agency milestones as the case moves through process."
        />
      ) : (
        <ul className="space-y-2">
          {payload.steps.map((step, index) => (
            <li key={step.id} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Step {index + 1}
                </span>
                <button
                  type="button"
                  className="text-xs text-rose-700 hover:underline"
                  onClick={() => removeStep(step.id)}
                  aria-label="Remove step"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="block text-xs sm:col-span-2">
                  <span className="font-medium text-slate-600">Filing / milestone</span>
                  <input
                    className={inputClass}
                    value={step.filingName}
                    placeholder="e.g. I-485 filed, NTA served, BIA appeal"
                    onChange={(e) => updateStep(step.id, { filingName: e.target.value })}
                  />
                </label>
                <label className="block text-xs">
                  <span className="font-medium text-slate-600">Date</span>
                  <input
                    type="date"
                    className={inputClass}
                    value={step.dateFiled?.slice(0, 10) ?? ""}
                    onChange={(e) => updateStep(step.id, { dateFiled: e.target.value })}
                  />
                </label>
                <label className="block text-xs">
                  <span className="font-medium text-slate-600">Court / status</span>
                  <input
                    className={inputClass}
                    value={step.courtOrStatus}
                    placeholder="e.g. USCIS · pending · EOIR master calendar"
                    onChange={(e) => updateStep(step.id, { courtOrStatus: e.target.value })}
                  />
                </label>
                <label className="block text-xs sm:col-span-2">
                  <span className="font-medium text-slate-600">Notes</span>
                  <textarea
                    className={`${inputClass} min-h-[3rem]`}
                    value={step.notes}
                    onChange={(e) => updateStep(step.id, { notes: e.target.value })}
                  />
                </label>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
