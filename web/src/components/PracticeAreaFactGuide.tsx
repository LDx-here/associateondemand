"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useToast } from "@/components/Toast";
import {
  deliverableFactGuideTitle,
  draftingFactsCompleteness,
  emptyDraftingFacts,
  fieldsForDeliverable,
  mergeFactsForDispatch,
  type DraftingFactsPayload,
  type FactFieldDef,
} from "@/lib/practice-area-facts";
import { btnPrimary, btnSecondary } from "@/lib/ui-classes";

function CompletenessBar({ filled, total, percent }: { filled: number; total: number; percent: number }) {
  const tone =
    percent >= 80 ? "bg-emerald-500" : percent >= 50 ? "bg-amber-500" : "bg-rose-500";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-slate-600">
        <span>
          Key facts captured: {filled}/{total}
        </span>
        <span className="font-medium">{percent}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
        <div className={`h-full rounded-full transition-all ${tone}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function FieldInput({
  def,
  value,
  onChange,
}: {
  def: FactFieldDef;
  value: string | string[];
  onChange: (next: string | string[]) => void;
}) {
  if (def.kind === "checkboxes" && def.options) {
    const selected = Array.isArray(value) ? value : [];
    return (
      <div className="mt-2 space-y-2">
        {def.options.map((opt) => (
          <label key={opt} className="flex items-start gap-2 text-sm text-slate-800">
            <input
              type="checkbox"
              className="mt-1"
              checked={selected.includes(opt)}
              onChange={(e) => {
                if (e.target.checked) onChange([...selected, opt]);
                else onChange(selected.filter((x) => x !== opt));
              }}
            />
            <span>{opt}</span>
          </label>
        ))}
      </div>
    );
  }
  if (def.kind === "textarea") {
    return (
      <textarea
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        rows={3}
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  return (
    <input
      type={def.kind === "date" ? "date" : "text"}
      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
      value={typeof value === "string" ? value : ""}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

type Props = {
  matterId?: string;
  caseType: string;
  /** Catalog deliverable id — enables deliverable-aware fact prompts. */
  deliverableId?: string;
  /** Intake mode: no save button, parent owns state via onChange */
  mode?: "workbench" | "intake";
  initialPayload?: DraftingFactsPayload | null;
  freeformFacts?: string;
  onFreeformChange?: (value: string) => void;
  onChange?: (payload: DraftingFactsPayload) => void;
  onSaved?: () => void;
  compact?: boolean;
};

export function PracticeAreaFactGuide({
  matterId,
  caseType,
  deliverableId,
  mode = "workbench",
  initialPayload,
  freeformFacts = "",
  onFreeformChange,
  onChange,
  onSaved,
  compact = false,
}: Props) {
  const { showToast } = useToast();
  const [payload, setPayload] = useState<DraftingFactsPayload>(
    () => initialPayload ?? emptyDraftingFacts(matterId ?? "draft", caseType, deliverableId),
  );
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(mode === "intake");
  const intakeSyncKey =
    mode === "intake" ? `${matterId ?? "draft"}::${caseType}::${deliverableId ?? ""}` : "";
  const [lastIntakeKey, setLastIntakeKey] = useState(intakeSyncKey);

  if (mode === "intake" && intakeSyncKey !== lastIntakeKey) {
    setLastIntakeKey(intakeSyncKey);
    const next = emptyDraftingFacts(matterId ?? "draft", caseType, deliverableId);
    setPayload(next);
    onChange?.(next);
  }

  const activeDeliverableId = deliverableId ?? payload.deliverableId;
  const defs = useMemo(
    () => fieldsForDeliverable(activeDeliverableId, payload.practiceArea),
    [activeDeliverableId, payload.practiceArea],
  );
  const completeness = useMemo(
    () => draftingFactsCompleteness(payload, activeDeliverableId),
    [payload, activeDeliverableId],
  );
  const guideTitle = deliverableFactGuideTitle(activeDeliverableId);
  const mergedPreview = useMemo(
    () => mergeFactsForDispatch(payload, freeformFacts),
    [payload, freeformFacts],
  );

  const patchPayload = useCallback(
    (updater: (prev: DraftingFactsPayload) => DraftingFactsPayload) => {
      setPayload((prev) => {
        const next = updater(prev);
        onChange?.(next);
        return next;
      });
    },
    [onChange],
  );

  useEffect(() => {
    if (mode !== "workbench" || !matterId) return;
    let cancelled = false;
    void fetch(`/api/matters/${matterId}/drafting-facts`)
      .then((r) => r.json())
      .then((data: { facts?: DraftingFactsPayload | null }) => {
        if (cancelled) return;
        if (data.facts) {
          setPayload(data.facts);
          onChange?.(data.facts);
        } else {
          const empty = emptyDraftingFacts(matterId, caseType, deliverableId);
          setPayload(empty);
          onChange?.(empty);
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
    return () => {
      cancelled = true;
    };
  }, [matterId, caseType, deliverableId, mode, onChange]);

  async function save() {
    if (!matterId) return;
    setBusy(true);
    try {
      const resp = await fetch(`/api/matters/${matterId}/drafting-facts`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ facts: payload }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        showToast(data.error || "Could not save facts.", "error");
        return;
      }
      if (data.facts) setPayload(data.facts);
      showToast("Facts saved — agents will use these on the next draft.", "success");
      onSaved?.();
    } catch {
      showToast("Network error saving facts.", "error");
    } finally {
      setBusy(false);
    }
  }

  if (payload.practiceArea === "generic") {
    return (
      <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">Facts for drafting</h3>
        <p className="text-sm text-slate-600">
          No guided checklist for this case type yet — use the freeform summary below.
        </p>
        {onFreeformChange ? (
          <label className="block text-sm">
            <span className="text-slate-700">What should the associate know?</span>
            <textarea
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              rows={compact ? 4 : 6}
              value={freeformFacts}
              onChange={(e) => onFreeformChange(e.target.value)}
              placeholder="Procedural posture, key facts, deadlines, and what the deliverable needs to accomplish."
            />
          </label>
        ) : null}
      </section>
    );
  }

  if (mode === "workbench" && !loaded) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">
        Loading fact checklist…
      </div>
    );
  }

  const areaLabel = payload.practiceArea === "immigration" ? "Immigration" : "Personal injury";

  return (
    <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Facts for drafting</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            {guideTitle ? `${guideTitle} · ` : ""}
            {areaLabel} checklist — each answer feeds a specific section of your deliverable.
          </p>
        </div>
        <CompletenessBar {...completeness} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {defs.map((def) => (
          <label
            key={def.id}
            className={`block text-sm ${def.kind === "textarea" || def.kind === "checkboxes" ? "sm:col-span-2" : ""}`}
          >
            <span className="text-slate-700">
              {def.label}
              {def.required ? <span className="text-rose-600"> *</span> : null}
            </span>
            {def.feedsSection ? (
              <span className="mt-0.5 block text-xs text-sky-700">
                Feeds: {def.feedsSection}
              </span>
            ) : null}
            {def.hint ? <span className="mt-0.5 block text-xs text-slate-400">{def.hint}</span> : null}
            <FieldInput
              def={def}
              value={payload.fields[def.id] ?? (def.kind === "checkboxes" ? [] : "")}
              onChange={(next) =>
                patchPayload((prev) => ({
                  ...prev,
                  fields: { ...prev.fields, [def.id]: next },
                }))
              }
            />
          </label>
        ))}
      </div>

      <label className="block text-sm">
        <span className="text-slate-700">Anything else the associate should know?</span>
        <textarea
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          rows={compact ? 2 : 3}
          value={payload.additionalNotes ?? ""}
          onChange={(e) =>
            patchPayload((prev) => ({ ...prev, additionalNotes: e.target.value }))
          }
          placeholder="Optional — nuance, deadlines, or context not covered above."
        />
      </label>

      {mode === "intake" && onFreeformChange ? (
        <label className="block text-sm">
          <span className="text-slate-700">Freeform summary (optional if checklist is complete)</span>
          <textarea
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            rows={4}
            value={freeformFacts}
            onChange={(e) => onFreeformChange(e.target.value)}
            placeholder="Add narrative detail, procedural history, or deliverable-specific instructions."
          />
          <span className="mt-1 block text-xs text-slate-400">
            Combined length: {mergedPreview.length} characters
          </span>
        </label>
      ) : null}

      {mode === "workbench" ? (
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
          <button type="button" className={btnSecondary} disabled={busy} onClick={() => void save()}>
            {busy ? "Saving…" : "Save facts for drafting"}
          </button>
        </div>
      ) : null}
    </section>
  );
}

/** Compact completeness chip for headers and review panels. */
export function DraftingFactsCompletenessChip({
  caseType,
  matterId,
  onCompleteFacts,
}: {
  caseType: string;
  matterId: string;
  onCompleteFacts?: () => void;
}) {
  const [completeness, setCompleteness] = useState<{ filled: number; total: number; percent: number } | null>(
    null,
  );

  useEffect(() => {
    void fetch(`/api/matters/${matterId}/drafting-facts`)
      .then((r) => r.json())
      .then((data: { facts?: DraftingFactsPayload | null }) => {
        if (data.facts) setCompleteness(draftingFactsCompleteness(data.facts));
        else setCompleteness(draftingFactsCompleteness(emptyDraftingFacts(matterId, caseType)));
      })
      .catch(() => setCompleteness(null));
  }, [matterId, caseType]);

  if (!completeness || completeness.total === 0) return null;
  if (completeness.percent >= 80) {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200">
        Facts {completeness.filled}/{completeness.total} ready
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onCompleteFacts}
      className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-900 ring-1 ring-amber-200 hover:bg-amber-100"
    >
      Complete facts on Documents tab ({completeness.filled}/{completeness.total}) →
    </button>
  );
}
