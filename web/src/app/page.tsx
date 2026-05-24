import Link from "next/link";

export default function PhaseZeroHome() {
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-8 bg-slate-50 px-6 text-slate-900">
      <div className="flex max-w-xl flex-col gap-3 text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-sky-700">AssociateOnDemand</p>
        <h1 className="text-3xl font-semibold">Your firm operating system is online.</h1>
        <p className="text-base text-slate-600">
          Dashboard, matters, case assessment, timeline, command search, intake, knowledge map, and eImmigration import are wired.
          Connect Airtable or use bundled demo data.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          className="rounded-md bg-sky-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-sky-700"
          href="/dashboard"
        >
          Open dashboard
        </Link>
        <Link className="rounded-md border border-slate-300 px-5 py-2 text-sm font-medium text-slate-800 hover:bg-white" href="/login">
          Login placeholder
        </Link>
        <a
          className="rounded-md border border-slate-300 px-5 py-2 text-sm font-medium text-slate-800 hover:bg-white"
          href="http://localhost:8000/health"
          rel="noreferrer"
          target="_blank"
        >
          API health check
        </a>
      </div>

      <p className="max-w-md text-center text-xs text-slate-500">
        Read <code className="rounded bg-slate-200 px-1 py-0.5">FILE-MAP.md</code> and <code className="rounded bg-slate-200 px-1 py-0.5">brain/README.md</code>{" "}
        for where to park case notes while the full Needles-style grid comes online.
      </p>
    </main>
  );
}
