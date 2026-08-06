import { FlaskConical } from "lucide-react";
import Link from "next/link";

import { DeliverableTemplateCatalog } from "@/components/DeliverableTemplateCatalog";
import { FirmAssessmentTemplates } from "@/components/FirmAssessmentTemplates";
import { FirmMemoryBadge } from "@/components/FirmMemoryBadge";
import { SmartTemplatesCatalog } from "@/components/SmartTemplatesCatalog";
import { INTERNAL_ASSIGNMENT_BILLING_NOTE } from "@/lib/deliverable-catalog";
import { btnPrimary } from "@/lib/ui-classes";

export default function TemplateCatalogPage() {
  const billingNote = INTERNAL_ASSIGNMENT_BILLING_NOTE;
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Templates</h1>
          <p className="text-sm text-slate-600">
            Browse by practice area → open preview → see structure mapping (CREAC roles + which facts feed
            each section). {billingNote}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <FirmMemoryBadge linked showStatus />
            <Link
              href="/firm-memory"
              className="text-xs font-medium text-violet-800 underline-offset-2 hover:underline"
            >
              Firm Memory (voice / style) →
            </Link>
            <Link
              href="/settings#firm-profile"
              className="text-xs font-medium text-slate-700 underline-offset-2 hover:underline"
            >
              Firm letterhead →
            </Link>
            <Link
              href="/help#templates"
              className="text-xs font-medium text-sky-800 underline-offset-2 hover:underline"
            >
              How this works →
            </Link>
          </div>
        </div>
        <Link href="/assignments/new" className={btnPrimary}>
          New assignment
        </Link>
      </header>

      <DeliverableTemplateCatalog />

      <SmartTemplatesCatalog />

      <FirmAssessmentTemplates />

      <section className="rounded-lg border border-violet-200 bg-violet-50/50 p-4 text-sm text-violet-950">
        <p className="font-medium">Firm Memory lives in Settings</p>
        <p className="mt-1 text-violet-900/90">
          Tone samples and style prefs are no longer set up on this page. Configure voice at{" "}
          <Link href="/firm-memory" className="font-medium underline-offset-2 hover:underline">
            Firm Memory
          </Link>{" "}
          or{" "}
          <Link href="/settings#firm-memory" className="font-medium underline-offset-2 hover:underline">
            Settings → Firm Memory
          </Link>
          . Templates here cover DOCX structure and smart fields only.
        </p>
      </section>

      <section className="rounded-lg border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-600">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <FlaskConical className="h-3.5 w-3.5" aria-hidden />
          Research & custom notes
        </div>
        <p className="mt-2">
          Research-tier SKUs and custom deliverables use SKILL docs until you upload a firm sample. Open
          preview on a card to inspect structure mapping, then Replace template to pin your DOCX/PDF.
        </p>
      </section>
    </div>
  );
}
