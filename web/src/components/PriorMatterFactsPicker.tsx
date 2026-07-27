"use client";

import { useEffect, useState } from "react";

import { cloneFromPriorMatter } from "@/lib/fact-template";
import type { DraftingFactsPayload } from "@/lib/practice-area-facts";
import { btnSecondary } from "@/lib/ui-classes";

type TemplateRow = {
  matterId: string;
  title: string;
  deliverableId?: string;
  updatedAt?: string;
  completenessPercent: number;
};

type Props = {
  matterId: string;
  caseType: string;
  deliverableId?: string;
  onApply: (payload: DraftingFactsPayload) => void;
};

export function PriorMatterFactsPicker({ matterId, caseType, deliverableId, onApply }: Props) {
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const q = deliverableId ? `?deliverable=${encodeURIComponent(deliverableId)}` : "";
    void fetch(`/api/matters/fact-templates${q}`)
      .then((r) => r.json())
      .then((data: { templates?: TemplateRow[] }) => {
        if (cancelled) return;
        setTemplates((data.templates ?? []).filter((t) => t.matterId !== matterId));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [matterId, deliverableId]);

  async function applyTemplate(sourceMatterId: string) {
    setBusy(sourceMatterId);
    try {
      const resp = await fetch(`/api/matters/${sourceMatterId}/drafting-facts`);
      const data = (await resp.json()) as { facts?: DraftingFactsPayload | null };
      if (!data.facts) return;
      const cloned = cloneFromPriorMatter(data.facts, sourceMatterId, matterId, caseType, {
        keepParagraphSelections: true,
      });
      onApply(cloned);
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return <p className="text-xs text-slate-500">Loading prior matter templates…</p>;
  }
  if (templates.length === 0) return null;

  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-xs font-medium text-slate-700">Reuse from prior matter</p>
      <p className="mt-0.5 text-xs text-slate-500">
        Copies checklist structure + library variant picks — not client names or A-numbers.
      </p>
      <ul className="mt-2 space-y-1">
        {templates.slice(0, 4).map((t) => (
          <li key={t.matterId} className="flex items-center justify-between gap-2 text-xs">
            <span className="truncate text-slate-700">
              {t.matterId} · {t.title} ({t.completenessPercent}% facts)
            </span>
            <button
              type="button"
              className={btnSecondary}
              disabled={busy === t.matterId}
              onClick={() => void applyTemplate(t.matterId)}
            >
              {busy === t.matterId ? "Applying…" : "Use template"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
