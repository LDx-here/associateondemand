"use client";

import Link from "next/link";
import { ArrowRight, X } from "lucide-react";
import { useState } from "react";

const STORAGE_KEY = "aod-getting-started-dismissed";

const STEPS = [
  {
    n: 1,
    title: "Firm Memory",
    detail: "Upload style samples so overflow counsel matches your voice.",
    href: "/templates#firm-memory",
  },
  {
    n: 2,
    title: "Submit assignment",
    detail: "Pick a deliverable, add facts, and send capacity work to RMV.",
    href: "/assignments/new",
  },
  {
    n: 3,
    title: "Upload case assessment",
    detail: "On the matter Documents tab — scan feeds agent drafts.",
    href: "/matters",
  },
  {
    n: 4,
    title: "Review deliverable",
    detail: "Approve or return revisions from Inbox when RMV marks ready.",
    href: "/inbox",
  },
] as const;

function readBannerVisible(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== "1";
  } catch {
    return true;
  }
}

export function GettingStartedBanner() {
  const [visible, setVisible] = useState(readBannerVisible);

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <section className="relative rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <button
        type="button"
        onClick={dismiss}
        className="absolute right-3 top-3 rounded p-1 text-slate-500 hover:bg-slate-100"
        aria-label="Dismiss getting started guide"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
      <h2 className="text-base font-semibold text-slate-900">Getting started — overflow counsel</h2>
      <p className="mt-1 max-w-3xl text-sm text-slate-600">
        Four steps from first login to a signed-off deliverable. RMV verifies every output before you
        sign off — capacity relief, not another inbox of overdue tasks.
      </p>
      <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step) => (
          <li
            key={step.n}
            className="rounded-lg border border-slate-100 bg-slate-50/80 p-3"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Step {step.n}
            </p>
            <p className="mt-1 text-sm font-medium text-slate-900">{step.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">{step.detail}</p>
            <Link
              href={step.href}
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-sky-800 hover:underline"
            >
              Go
              <ArrowRight className="h-3 w-3" aria-hidden />
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
