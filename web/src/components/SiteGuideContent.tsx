import {
  Briefcase,
  CreditCard,
  FileDown,
  FilePlus2,
  Inbox,
  LayoutDashboard,
  LayoutTemplate,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { btnPrimary } from "@/lib/ui-classes";

type GuideSection = {
  id: string;
  title: string;
  icon: LucideIcon;
  summary: string;
  bullets: string[];
  cta?: { href: Route; label: string };
};

const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: "dashboard",
    title: "Dashboard",
    icon: LayoutDashboard,
    summary:
      "Your relief dashboard — see capacity you have already recovered, not a stress board of overdue tasks.",
    bullets: [
      "Hours saved, deliverables awaiting sign-off, and open overflow assignments.",
      "Quick actions to submit work, review inbox, open matters, or set up Firm Memory.",
      "Getting Started wizard walks new firms through Firm Memory → Assignment → Assessment → Review.",
      "Partner submission link — share with external firms so they can submit overflow work with quoted flat fees.",
    ],
    cta: { href: "/dashboard", label: "Open dashboard" },
  },
  {
    id: "assignments",
    title: "Assignments & partner submit",
    icon: FilePlus2,
    summary:
      "Send overflow capacity work to RMV — guided intake collects practice-specific facts so drafts start closer to done.",
    bullets: [
      "New assignment — pick a deliverable (AOS brief, research memo, hearing packet, etc.), add facts, attach samples.",
      "Intelligent intake guides field-by-field; sample uploads can reduce your flat fee.",
      "Partner funnel — external firms use your partner link (/partner/submit) to request work with scope and pricing.",
      "After submit, RMV dispatches agents; you track progress in Inbox and on the matter workbench.",
    ],
    cta: { href: "/assignments/new", label: "Submit assignment" },
  },
  {
    id: "inbox",
    title: "Inbox",
    icon: Inbox,
    summary:
      "Your overflow command center — assignment lanes plus agent alerts that need a human decision.",
    bullets: [
      "Assignment board: Submitted → In progress → Ready for review → Returned / Approved.",
      "Approve deliverables, request revisions, or resume work without leaving the workflow.",
      "Agent escalations — gaps, linter flags, or items needing guidance appear below the board.",
      "Badge in the header shows new submissions and open items.",
    ],
    cta: { href: "/inbox", label: "Open inbox" },
  },
  {
    id: "matters",
    title: "Matters",
    icon: Briefcase,
    summary:
      "Each overflow project lives on a matter workbench — documents, facts, timeline, and deliverable review in one place.",
    bullets: [
      "Overview — workflow strip shows what to do next; smart templates apply firm field maps.",
      "Documents — upload case assessment scans (PDF/photo); OCR feeds drafts and legal elements.",
      "Associate panel (right) — context-aware prompts: summarize facts, draft memos, run research.",
      "Deliverable review — approve or return revisions inline; export when ready.",
    ],
    cta: { href: "/matters", label: "Browse matters" },
  },
  {
    id: "templates",
    title: "Templates & Firm Memory",
    icon: LayoutTemplate,
    summary:
      "Teach RMV your firm's voice — samples and style preferences make overflow drafts read in-house.",
    bullets: [
      "Firm Memory wizard — upload prior work, set tone preferences, save style edits from agent output.",
      "Deliverable catalog — flat-fee ranges and turnaround for launch SKUs; links prefill intake.",
      "Firm assessment templates — blank forms per practice area for consistent assessment uploads.",
      "Incomplete Firm Memory? Dashboard and intake nudge you to finish setup before your first pilot.",
    ],
    cta: { href: "/templates#firm-memory", label: "Set up Firm Memory" },
  },
  {
    id: "export-billing",
    title: "Export & billing",
    icon: CreditCard,
    summary:
      "Phase 0 overflow counsel — partner firms are invoiced off-platform; no surprise checkout in the operator dashboard.",
    bullets: [
      "Export memos, citation packages, and AOS briefs from the matter workbench or Associate panel.",
      "Document linter runs before export; fix flagged issues before filing.",
      "Partner firms receive flat-fee invoices or Stripe Payment Links after scope is agreed (Phase 1 external funnel).",
      "Settings shows billing status, partner link, and Stripe connection (reserved for external checkout).",
    ],
    cta: { href: "/settings", label: "View billing settings" },
  },
];

export function SiteGuideContent({ showIntro = true }: { showIntro?: boolean }) {
  return (
    <div className="space-y-8">
      {showIntro ? (
        <section className="rounded-xl border border-sky-200 bg-sky-50/50 px-5 py-4 text-sm text-sky-950">
          <p className="font-medium">Overflow counsel for capacity relief</p>
          <p className="mt-1 text-sky-900">
            AssociateOnDemand is not a generic associate marketplace — it is verified overflow counsel
            that extends your team. Submit facts and samples; RMV returns associate-quality work in your
            firm&apos;s style. Year one: RMV verifies every deliverable.
          </p>
        </section>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {GUIDE_SECTIONS.map((section) => (
          <article
            key={section.id}
            id={section.id}
            className="scroll-mt-24 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                <section.icon className="h-5 w-5 text-slate-700" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold text-slate-900">{section.title}</h2>
                <p className="mt-1 text-sm text-slate-600">{section.summary}</p>
              </div>
            </div>
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              {section.bullets.map((bullet) => (
                <li key={bullet} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" aria-hidden />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
            {section.cta ? (
              <Link
                href={section.cta.href}
                className={`${btnPrimary} mt-4 inline-flex items-center gap-2 text-sm`}
              >
                {section.id === "templates" ? (
                  <Sparkles className="h-4 w-4" aria-hidden />
                ) : section.id === "export-billing" ? (
                  <FileDown className="h-4 w-4" aria-hidden />
                ) : (
                  <section.icon className="h-4 w-4" aria-hidden />
                )}
                {section.cta.label}
              </Link>
            ) : null}
          </article>
        ))}
      </div>

      <section className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
        <strong>Four-step overflow journey:</strong> Firm Memory → New assignment → Upload case assessment
        on Documents → Review in Inbox and export. Resume the onboarding wizard anytime from the
        dashboard.
      </section>
    </div>
  );
}
