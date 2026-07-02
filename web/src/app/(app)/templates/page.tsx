import Link from "next/link";
import { CheckCircle2, Wrench } from "lucide-react";

import {
  TEMPLATE_CATALOG,
  TIER_DESCRIPTIONS,
  TIER_LABELS,
  templatesByTier,
  type DeliverableTier,
} from "@/lib/template-catalog";
import { btnSecondary } from "@/lib/ui-classes";

const TIER_ORDER: DeliverableTier[] = ["template", "research", "custom"];

export default function TemplateCatalogPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Template catalog</h1>
        <p className="text-sm text-slate-600">
          {TEMPLATE_CATALOG.length} deliverables mapped to the firm&apos;s template labor model. Template
          and research tier work is ready to assign today; custom tier needs one-time setup labor.
        </p>
      </header>

      {TIER_ORDER.map((tier) => {
        const entries = templatesByTier(tier);
        if (!entries.length) return null;
        return (
          <section key={tier} className="space-y-3">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                {TIER_LABELS[tier]}
              </h2>
              <p className="text-xs text-slate-500">{TIER_DESCRIPTIONS[tier]}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {entries.map((entry) => (
                <article
                  key={entry.id}
                  className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <header className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">{entry.name}</h3>
                    {entry.status === "ready" ? (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                        <CheckCircle2 className="h-3 w-3" aria-hidden /> Ready
                      </span>
                    ) : (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 ring-1 ring-inset ring-amber-600/20">
                        <Wrench className="h-3 w-3" aria-hidden /> Custom build
                      </span>
                    )}
                  </header>
                  <p className="text-sm text-slate-600">{entry.description}</p>
                  <p className="text-xs text-slate-500">Agent: {entry.agent}</p>
                  {entry.commandExample ? (
                    <code className="rounded bg-slate-50 px-2 py-1 text-xs text-slate-700">
                      {entry.commandExample}
                    </code>
                  ) : null}
                  <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
                    <Link href={`/assignments/new?deliverable=${entry.id}`} className={btnSecondary}>
                      Start assignment
                    </Link>
                    {entry.skillDoc ? (
                      <span className="text-[11px] text-slate-400">{entry.skillDoc}</span>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
