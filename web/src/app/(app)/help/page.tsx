import Link from "next/link";

import { SiteGuideContent } from "@/components/SiteGuideContent";

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">How this works</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Plain-English guide to each area of the overflow counsel platform — capacity relief, not
            another task list.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="text-sm font-medium text-slate-700 underline-offset-2 hover:underline"
        >
          ← Back to dashboard
        </Link>
      </header>

      <SiteGuideContent />
    </div>
  );
}
