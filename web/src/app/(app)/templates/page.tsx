import { FileCheck2, FlaskConical, Hammer } from "lucide-react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { DELIVERABLE_CATALOG, type DeliverableCatalogEntry } from "@/lib/deliverable-catalog";
import type { AssignmentTier } from "@/lib/types";
import { btnPrimary } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

const TIER_META: Record<
  AssignmentTier,
  { heading: string; description: string; icon: LucideIcon; badgeClass: string }
> = {
  Template: {
    heading: "Template-ready",
    description:
      "A firm workbook or DOCX template already exists. The agent fills it from your facts and an attorney signs off — fastest turnaround.",
    icon: FileCheck2,
    badgeClass: "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
  },
  Research: {
    heading: "Research & audit",
    description:
      "Fully agent-drafted research, mass audits, and legal-element mapping with citation verification built in.",
    icon: FlaskConical,
    badgeClass: "bg-sky-50 text-sky-800 ring-sky-600/20",
  },
  Custom: {
    heading: "Custom build",
    description:
      "No template yet. The first assignment includes one-time setup labor to build the template; it graduates to Template tier for future matters of the same type.",
    icon: Hammer,
    badgeClass: "bg-amber-50 text-amber-900 ring-amber-600/20",
  },
};

const TIER_ORDER: AssignmentTier[] = ["Template", "Research", "Custom"];

function DeliverableCard({ entry }: { entry: DeliverableCatalogEntry }) {
  return (
    <article className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">{entry.name}</h3>
        <p className="mt-1 text-sm text-slate-600">{entry.description}</p>
      </div>
      <p className="text-xs font-medium text-slate-500">Typical turnaround: {entry.turnaround}</p>
      <div className="mt-auto flex items-center justify-between gap-2 pt-2">
        {entry.skillDoc ? (
          <span className="text-[11px] text-slate-400">SKILL wired</span>
        ) : (
          <span className="text-[11px] text-slate-400">Scoped at intake</span>
        )}
        <Link href={`/assignments/new?deliverable=${entry.id}`} className={btnPrimary}>
          Start assignment
        </Link>
      </div>
    </article>
  );
}

export default function TemplateCatalogPage() {
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Deliverable catalog</h1>
          <p className="text-sm text-slate-600">
            Browse template-ready deliverables, research &amp; audit work, and custom builds. Start an
            assignment directly from any card.
          </p>
        </div>
        <Link href="/assignments/new" className={btnPrimary}>
          New assignment
        </Link>
      </header>

      {TIER_ORDER.map((tier) => {
        const meta = TIER_META[tier];
        const Icon = meta.icon;
        const entries = DELIVERABLE_CATALOG.filter((d) => d.tier === tier);
        return (
          <section key={tier} className="space-y-3">
            <div className="flex items-center gap-2">
              <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset", meta.badgeClass)}>
                <Icon className="h-3.5 w-3.5" aria-hidden />
                {meta.heading}
              </span>
              <span className="text-xs text-slate-400">{entries.length} deliverable{entries.length === 1 ? "" : "s"}</span>
            </div>
            <p className="max-w-3xl text-sm text-slate-600">{meta.description}</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {entries.map((entry) => (
                <DeliverableCard key={entry.id} entry={entry} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
