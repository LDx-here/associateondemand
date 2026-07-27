"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { AosVariantSelector } from "@/components/AosVariantSelector";
import { PriorMatterFactsPicker } from "@/components/PriorMatterFactsPicker";
import type { AosSectionKey } from "@/lib/aos-library";
import {
  applyAosExtractToPayload,
  extractAosFactsFromSummary,
  heuristicExtractAosFacts,
} from "@/lib/aos-fact-extract";
import {
  mergeFollowUpAnswers,
  runAosFactScorecard,
  type ScorecardQuestion,
} from "@/lib/aos-fact-scorecard";
import { useToast } from "@/components/Toast";
import {
  deliverableFactGuideTitle,
  draftingFactsCompleteness,
  emptyDraftingFacts,
  fieldsForDeliverable,
  isImmigrationPracticeArea,
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
  const [extractBusy, setExtractBusy] = useState(false);
  const [pasteSummary, setPasteSummary] = useState("");
  const [extractMode, setExtractMode] = useState<string | null>(null);
  const [followUpDrafts, setFollowUpDrafts] = useState<Record<string, string>>({});
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
  const isAos = activeDeliverableId === "aos-discretionary-brief";
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

  const scorecard = useMemo(() => {
    if (!isAos) return null;
    return runAosFactScorecard(payload);
  }, [payload, isAos]);

  async function runExtract(useHeuristicOnly = false) {
    const text = pasteSummary.trim();
    if (!text) {
      showToast("Paste a client fact summary first.", "error");
      return;
    }
    setExtractBusy(true);
    try {
      const result = useHeuristicOnly
        ? { ...heuristicExtractAosFacts(text), llmAvailable: false }
        : await extractAosFactsFromSummary(text);
      const { payload: next, filledFieldIds } = applyAosExtractToPayload(payload, result, {
        overwrite: false,
      });
      const withNotes = result.additionalNotes
        ? {
            ...next,
            additionalNotes: [next.additionalNotes, result.additionalNotes].filter(Boolean).join("\n\n"),
          }
        : next;
      setPayload(withNotes);
      onChange?.(withNotes);
      setExtractMode(
        result.extractionMode === "llm"
          ? "Smart extract (Anthropic)"
          : result.llmAvailable === false
            ? "Heuristic extract — add ANTHROPIC_API_KEY on Fly for smarter mapping"
            : "Heuristic extract",
      );
      showToast(
        `Extracted ${filledFieldIds.length} field${filledFieldIds.length === 1 ? "" : "s"} — review before saving.`,
        filledFieldIds.length ? "success" : "error",
      );
    } catch {
      showToast("Extract failed.", "error");
    } finally {
      setExtractBusy(false);
    }
  }

  function applyFollowUpAnswers() {
    const next = mergeFollowUpAnswers(payload, followUpDrafts);
    setPayload(next);
    onChange?.(next);
    setFollowUpDrafts({});
    showToast("Follow-up answers merged into facts.", "success");
  }

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

  const setParagraphSelection = useCallback(
    (key: AosSectionKey, value: string | null) => {
      patchPayload((prev) => {
        const nextSelections = { ...(prev.paragraphSelections ?? {}) };
        if (value) nextSelections[key] = value;
        else delete nextSelections[key];
        return { ...prev, paragraphSelections: nextSelections };
      });
    },
    [patchPayload],
  );

  const setCaseTheme = useCallback(
    (text: string) => {
      patchPayload((prev) => ({ ...prev, fields: { ...prev.fields, caseTheme: text } }));
    },
    [patchPayload],
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

  const areaLabel = isImmigrationPracticeArea(payload.practiceArea) ? "Immigration" : "Personal injury";
  const identityDefs = defs.filter((d) => !d.stage || d.stage === "identity");
  const architectureDefs = defs.filter((d) => d.stage === "architecture");
  const factorDefs = defs.filter((d) => d.stage === "factors");
  // Progressive-disclosure staging isn't AOS-only — any deliverable whose
  // schema uses `stage` (PI Demand Letter, asylum, family-based) gets the
  // same guided Identity → Architecture → Factors layout. Only the
  // paragraph-variant library (step 4) stays AOS-specific.
  const hasStagedFields = architectureDefs.length > 0 || factorDefs.length > 0;
  const unstagedDefs = hasStagedFields ? [] : defs;

  function renderField(def: FactFieldDef) {
    return (
      <label
        key={def.id}
        className={`block text-sm ${def.kind === "textarea" || def.kind === "checkboxes" ? "sm:col-span-2" : ""}`}
      >
        <span className="text-slate-700">
          {def.label}
          {def.required ? <span className="text-rose-600"> *</span> : null}
        </span>
        {def.feedsSection ? (
          <span className="mt-0.5 block text-xs text-sky-700">Feeds: {def.feedsSection}</span>
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
    );
  }

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

      {matterId && isAos ? (
        <PriorMatterFactsPicker
          matterId={matterId}
          caseType={caseType}
          deliverableId={activeDeliverableId}
          onApply={(next) => {
            setPayload(next);
            onChange?.(next);
            showToast("Prior matter template applied — add this client's facts.", "success");
          }}
        />
      ) : null}

      {isAos ? (
        <div className="space-y-2 rounded-md border border-violet-200 bg-violet-50/60 p-3">
          <label className="block text-sm">
            <span className="font-medium text-violet-950">Paste client fact summary</span>
            <span className="mt-0.5 block text-xs text-violet-900/80">
              Attorney notes, intake email, or declaration excerpt — we map into the checklist below.
            </span>
            <textarea
              className="mt-2 w-full rounded-md border border-violet-200 bg-white px-3 py-2 text-sm"
              rows={compact ? 4 : 5}
              value={pasteSummary}
              onChange={(e) => setPasteSummary(e.target.value)}
              placeholder="Applicant entered on B-2 in 2019… U.S. citizen daughter petitioner… primary equity is care for autistic grandson…"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={btnPrimary}
              disabled={extractBusy || !pasteSummary.trim()}
              onClick={() => void runExtract(false)}
            >
              {extractBusy ? "Extracting…" : "Extract facts"}
            </button>
            <button
              type="button"
              className={btnSecondary}
              disabled={extractBusy || !pasteSummary.trim()}
              onClick={() => void runExtract(true)}
            >
              Heuristic only
            </button>
          </div>
          {extractMode ? (
            <p className="text-xs text-violet-900/90">{extractMode}</p>
          ) : (
            <p className="text-xs text-violet-900/70">
              Smart extract uses Anthropic on Fly when configured; heuristic mode always works offline.
            </p>
          )}
        </div>
      ) : null}

      {isAos && scorecard && scorecard.questions.length > 0 ? (
        <ScorecardPanel
          questions={scorecard.questions}
          drafts={followUpDrafts}
          onDraftChange={(id, value) => setFollowUpDrafts((prev) => ({ ...prev, [id]: value }))}
          onApply={applyFollowUpAnswers}
        />
      ) : null}

      {isAos ? (
        <div className="rounded-md border border-indigo-100 bg-indigo-50/70 px-3 py-2 text-xs text-indigo-950">
          <p className="font-medium">AOS brief architecture</p>
          <p className="mt-0.5 text-indigo-900/90">
            Start with identity and petition history. Then add attorney-authored case architecture
            (theme + Section A/B/adverse headings). PRESERVE legal standard comes from your firm template;
            these facts fill FILL sections.
          </p>
        </div>
      ) : null}

      {hasStagedFields ? (
        <div className="space-y-6">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">1. Identity</h4>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">{identityDefs.map(renderField)}</div>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              2. Case architecture (attorney-authored)
            </h4>
            <p className="mt-1 text-xs text-slate-500">
              Theme and section headings cannot be auto-generated — they require legal judgment.
            </p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">{architectureDefs.map(renderField)}</div>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              3. Factors &amp; supporting detail
            </h4>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">{factorDefs.map(renderField)}</div>
          </div>
          {isAos ? (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                4. Choose argument variants
              </h4>
              <div className="mt-3">
                <AosVariantSelector
                  fields={payload.fields}
                  selections={payload.paragraphSelections ?? {}}
                  onSelect={setParagraphSelection}
                  onCaseThemeSelect={setCaseTheme}
                />
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">{unstagedDefs.map(renderField)}</div>
      )}

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

function ScorecardPanel({
  questions,
  drafts,
  onDraftChange,
  onApply,
}: {
  questions: ScorecardQuestion[];
  drafts: Record<string, string>;
  onDraftChange: (id: string, value: string) => void;
  onApply: () => void;
}) {
  const hasAnswers = questions.some((q) => drafts[q.id]?.trim());
  return (
    <div className="space-y-3 rounded-md border border-amber-200 bg-amber-50/70 p-3">
      <div>
        <p className="text-sm font-medium text-amber-950">Associate follow-ups</p>
        <p className="text-xs text-amber-900/80">
          Substantive gaps detected — answer to strengthen the brief before drafting.
        </p>
      </div>
      <ol className="list-decimal space-y-3 pl-4 text-sm text-amber-950">
        {questions.map((q) => (
          <li key={q.id}>
            <p>{q.question}</p>
            <p className="mt-0.5 text-xs text-amber-800/80">{q.reason}</p>
            <textarea
              className="mt-1 w-full rounded border border-amber-200 bg-white px-2 py-1 text-sm"
              rows={2}
              value={drafts[q.id] ?? ""}
              onChange={(e) => onDraftChange(q.id, e.target.value)}
              placeholder="Your answer…"
            />
          </li>
        ))}
      </ol>
      {hasAnswers ? (
        <div className="flex justify-end">
          <button type="button" className={btnSecondary} onClick={onApply}>
            Merge answers into facts
          </button>
        </div>
      ) : null}
    </div>
  );
}
