import Link from "next/link";

import { btnPrimaryMd } from "@/lib/ui-classes";

export default function PhaseZeroHome() {
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-8 bg-slate-50 px-6 text-slate-900">
      <div className="flex max-w-xl flex-col gap-3 text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-600">Recover My Value</p>
        <h1 className="text-3xl font-semibold">Your firm operating system is online.</h1>
        <p className="text-base text-slate-600">
          Dashboard, matters, case assessment, timeline, command search, intake, knowledge map, and eImmigration import are wired.
          Connect Airtable or use bundled sample data.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link className={btnPrimaryMd} href="/dashboard">
          Open dashboard
        </Link>
        <Link className="rounded-md border border-slate-300 px-5 py-2 text-sm font-medium text-slate-800 hover:bg-white" href="/login">
          Login placeholder
        </Link>
      </div>

      <p className="max-w-md text-center text-xs text-slate-500">
        See the local development runbook in the repository for setup steps.
      </p>
    </main>
  );
}
