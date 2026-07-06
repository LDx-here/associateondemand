"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { useState } from "react";

const STORAGE_KEY = "aod-getting-started-dismissed";

const STEPS = [
  { n: 1, text: "Set up Firm Memory", href: "/templates#firm-memory" },
  { n: 2, text: "Submit an assignment", href: "/assignments/new" },
  { n: 3, text: "Upload case assessment on matter Documents", href: "/matters" },
  { n: 4, text: "Review deliverables in PM Inbox", href: "/inbox" },
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
    <section className="relative rounded-lg border border-sky-200 bg-sky-50/80 p-4">
      <button
        type="button"
        onClick={dismiss}
        className="absolute right-3 top-3 rounded p-1 text-sky-700 hover:bg-sky-100"
        aria-label="Dismiss getting started guide"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
      <h2 className="text-sm font-semibold text-sky-950">Getting started — overflow counsel</h2>
      <p className="mt-1 max-w-2xl text-xs text-sky-900">
        External firms submit assignments here; Recover My Value verifies every deliverable before
        you sign off. Four steps to your first completed brief:
      </p>
      <ol className="mt-3 grid gap-2 sm:grid-cols-2">
        {STEPS.map((step) => (
          <li key={step.n} className="text-sm text-sky-950">
            <span className="font-medium">{step.n}.</span>{" "}
            <Link href={step.href} className="font-medium underline-offset-2 hover:underline">
              {step.text}
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
