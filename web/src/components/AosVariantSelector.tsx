"use client";

import { ChevronDown, ChevronRight, Lightbulb, Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  AOS_SECTION_LABELS,
  detectNovelCombinationAlerts,
  substituteAosSlots,
  type AosLibraryResponse,
  type AosSectionKey,
  type AosVariant,
  type AosVariantGroup,
} from "@/lib/aos-library";
import { cn } from "@/lib/utils";

type FactValue = string | string[] | undefined;

type Props = {
  fields: Record<string, FactValue>;
  selections: Record<string, string>;
  onSelect: (key: AosSectionKey, value: string | null) => void;
  onCaseThemeSelect?: (text: string) => void;
};

const SECTION_ORDER: { key: AosSectionKey; source: keyof AosLibraryResponse; hint: string }[] = [
  {
    key: "section_a",
    source: "equity",
    hint: "The client's single strongest equity — leads Argument §A.",
  },
  {
    key: "section_d_adverse",
    source: "adverse",
    hint: "How the adverse factor is framed as proportionality — Argument §D.",
  },
  {
    key: "section_e_balancing",
    source: "balancing",
    hint: "The weighing of equities against the adverse factor — Argument §E.",
  },
];

function readField(fields: Record<string, FactValue>, id: string): string {
  const v = fields[id];
  if (Array.isArray(v)) return v.filter(Boolean).join("; ");
  return (v ?? "").toString().trim();
}

/** Keys the attorney narrative signals should recommend, for a "Recommended" badge. */
function recommendedKeys(fields: Record<string, FactValue>): Set<string> {
  const blob = [
    readField(fields, "caseTheme"),
    readField(fields, "sectionAHeading"),
    readField(fields, "sectionAFacts"),
    readField(fields, "sectionBFacts"),
    readField(fields, "positiveEquities"),
    readField(fields, "adverseFacts"),
    readField(fields, "clientStatus"),
  ]
    .join(" ")
    .toLowerCase();
  const keys = new Set<string>();
  if (/autis/.test(blob)) keys.add("caregiver_autistic_dependent");
  if (/spouse|husband|wife|marriage|married/.test(blob)) keys.add("usc_spouse_marriage");
  if (/child|son|daughter|minor/.test(blob)) keys.add("parent_usc_minor_children");
  if (/disab|wheelchair|caregiv/.test(blob)) keys.add("caregiver_disabled_dependent_general");
  if (/without inspection|\bewi\b|crossed the border/.test(blob)) keys.add("entry_without_inspection");
  if (/removal|deport/.test(blob)) keys.add("prior_removal_old");
  if (/overstay|unlawful presence|out of status/.test(blob)) {
    keys.add("simple_overstay");
    keys.add("balancing_caregiver_vs_overstay");
    keys.add("balancing_standard");
  }
  if (/pastor|deacon|elder|founder|community leader/.test(blob)) keys.add("balancing_community_pillar");
  return keys;
}

function VariantCard({
  variant,
  selected,
  recommended,
  preview,
  onSelect,
}: {
  variant: AosVariant;
  selected: boolean;
  recommended: boolean;
  preview: string;
  onSelect: () => void;
}) {
  const [open, setOpen] = useState(false);
  const excerpt = preview.length > 220 ? `${preview.slice(0, 220).trim()}…` : preview;
  return (
    <div
      className={cn(
        "rounded-lg border bg-white transition",
        selected ? "border-indigo-400 ring-1 ring-indigo-300" : "border-slate-200 hover:border-slate-300",
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex w-full items-start gap-3 px-3 py-2.5 text-left"
        aria-pressed={selected}
      >
        <span
          className={cn(
            "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
            selected ? "border-indigo-500 bg-indigo-500" : "border-slate-300 bg-white",
          )}
          aria-hidden
        >
          {selected ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-slate-900">{variant.label}</span>
            {recommended ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-600/20">
                <Sparkles className="h-3 w-3" aria-hidden />
                Recommended
              </span>
            ) : null}
          </span>
          {variant.description ? (
            <span className="mt-0.5 block text-xs text-slate-500">{variant.description}</span>
          ) : null}
          {!open ? (
            <span className="mt-1 block text-xs leading-relaxed text-slate-600 line-clamp-2">{excerpt}</span>
          ) : null}
        </span>
      </button>
      <div className="border-t border-slate-100 px-3 py-1.5">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-700 hover:text-indigo-900"
          aria-expanded={open}
        >
          {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          {open ? "Hide preview" : "Show live preview"}
        </button>
        {open ? (
          <p className="mt-1.5 whitespace-pre-wrap text-xs leading-relaxed text-slate-700">{preview}</p>
        ) : null}
      </div>
    </div>
  );
}

function VariantSection({
  title,
  hint,
  groups,
  selectedId,
  recommended,
  fields,
  onSelect,
}: {
  title: string;
  hint: string;
  groups: AosVariantGroup[];
  selectedId: string | null;
  recommended: Set<string>;
  fields: Record<string, FactValue>;
  onSelect: (value: string | null) => void;
}) {
  const flat = useMemo(() => groups.flatMap((g) => g.variants), [groups]);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-600">{title}</h4>
          <p className="mt-0.5 text-xs text-slate-500">{hint}</p>
        </div>
        {selectedId ? (
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="text-[11px] font-medium text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline"
          >
            Clear
          </button>
        ) : null}
      </div>
      {flat.length === 0 ? (
        <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
          No library variants for this section.
        </p>
      ) : (
        <div className="space-y-2">
          {flat.map((variant) => (
            <VariantCard
              key={variant.id}
              variant={variant}
              selected={selectedId === variant.id}
              recommended={recommended.has(variant.key)}
              preview={substituteAosSlots(variant.paragraph, fields)}
              onSelect={() => onSelect(selectedId === variant.id ? null : variant.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function AosVariantSelector({ fields, selections, onSelect, onCaseThemeSelect }: Props) {
  const [library, setLibrary] = useState<AosLibraryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [themesOpen, setThemesOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/aos/library")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: AosLibraryResponse) => {
        if (!cancelled) setLibrary(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load variant library.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const alerts = useMemo(() => detectNovelCombinationAlerts(fields), [fields]);
  const recommended = useMemo(() => recommendedKeys(fields), [fields]);
  const currentTheme = readField(fields, "caseTheme");

  const selectSection = useCallback(
    (key: AosSectionKey, value: string | null) => onSelect(key, value),
    [onSelect],
  );

  if (error) {
    return (
      <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        Could not load the argument-variant library ({error}). Facts still draft with automatic variant
        selection from the paragraph library.
      </section>
    );
  }

  if (!library) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">
        Loading argument variants…
      </section>
    );
  }

  const groupsBySection: Record<AosSectionKey, AosVariantGroup[]> = {
    section_a: library.equity,
    section_d_adverse: library.adverse,
    section_e_balancing: library.balancing,
  };

  return (
    <section className="space-y-5 rounded-lg border border-indigo-100 bg-indigo-50/40 p-4">
      <div>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Sparkles className="h-4 w-4 text-indigo-600" aria-hidden />
          Choose argument variants
        </h3>
        <p className="mt-0.5 text-xs text-slate-600">
          Attorney-reviewed paragraph variants from the AOS library. Your picks feed the same drafting path
          (library FILL) — the associate keeps PRESERVE law verbatim. Leave a section on{" "}
          <em>auto</em> to let the generator choose from the facts.
        </p>
      </div>

      {alerts.length ? (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <div
              key={alert}
              className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950"
            >
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
              <span>{alert}</span>
            </div>
          ))}
        </div>
      ) : null}

      {onCaseThemeSelect && library.caseThemes.length ? (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setThemesOpen((o) => !o)}
            className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-600 hover:text-slate-900"
            aria-expanded={themesOpen}
          >
            {themesOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            Suggested case themes ({library.caseThemes.length})
          </button>
          {themesOpen ? (
            <div className="space-y-1.5">
              {library.caseThemes.map((theme, i) => {
                const filled = substituteAosSlots(theme.text, fields);
                const active = currentTheme === filled;
                return (
                  <button
                    key={`${theme.group}-${i}`}
                    type="button"
                    onClick={() => onCaseThemeSelect(filled)}
                    className={cn(
                      "block w-full rounded-md border px-3 py-2 text-left text-xs italic leading-relaxed transition",
                      active
                        ? "border-indigo-400 bg-white text-slate-900 ring-1 ring-indigo-300"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900",
                    )}
                  >
                    “{filled}”
                  </button>
                );
              })}
              <p className="text-[11px] text-slate-500">
                Selecting a theme fills the Case theme field above — edit it freely afterward.
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-5">
        {SECTION_ORDER.map(({ key, hint }) => (
          <VariantSection
            key={key}
            title={AOS_SECTION_LABELS[key]}
            hint={hint}
            groups={groupsBySection[key]}
            selectedId={selections[key] ?? null}
            recommended={recommended}
            fields={fields}
            onSelect={(value) => selectSection(key, value)}
          />
        ))}
      </div>
    </section>
  );
}
