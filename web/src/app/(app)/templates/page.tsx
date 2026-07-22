import { FlaskConical } from "lucide-react";
import Link from "next/link";

import { DeliverableTemplateCatalog } from "@/components/DeliverableTemplateCatalog";
import { FirmAssessmentTemplates } from "@/components/FirmAssessmentTemplates";
import { FirmMemoryBadge } from "@/components/FirmMemoryBadge";
import { FirmMemorySetup } from "@/components/FirmMemorySetup";
import { SmartTemplatesCatalog } from "@/components/SmartTemplatesCatalog";
import { billingNoteForPartnerFirm } from "@/lib/deliverable-catalog";
import { btnPrimary } from "@/lib/ui-classes";

export default function TemplateCatalogPage() {
  const billingNote = billingNoteForPartnerFirm();
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Deliverable catalog</h1>
          <p className="text-sm text-slate-600">
            Browse deliverables with flat-fee ranges, template source, preview, and replace/edit controls.
            Phase 0 launch SKUs are highlighted. {billingNote}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <FirmMemoryBadge linked showStatus />
            <Link
              href="#firm-memory"
              className="text-xs font-medium text-violet-800 underline-offset-2 hover:underline"
            >
              Set up Firm Memory →
            </Link>
            <Link
              href="/knowledge-map#firm-knowledge"
              className="text-xs font-medium text-sky-800 underline-offset-2 hover:underline"
            >
              Browse knowledge map →
            </Link>
          </div>
        </div>
        <Link href="/assignments/new" className={btnPrimary}>
          New assignment
        </Link>
      </header>

      <FirmMemorySetup />

      <SmartTemplatesCatalog />

      <FirmAssessmentTemplates />

      <DeliverableTemplateCatalog />

      <section className="rounded-lg border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-600">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <FlaskConical className="h-3.5 w-3.5" aria-hidden />
          Research & custom notes
        </div>
        <p className="mt-2">
          Research-tier SKUs (mass audit, legal mapping) and custom deliverables are drafted from SKILL
          docs until you upload a firm sample above. Upload PDF/DOCX per SKU to pin structure for future
          matters.
        </p>
      </section>
    </div>
  );
}
