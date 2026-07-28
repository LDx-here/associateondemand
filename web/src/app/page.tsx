import Link from "next/link";
import { redirect } from "next/navigation";

import { shouldEnforceAuth } from "@/lib/supabase/env";
import { getSupabaseSessionUser } from "@/lib/supabase/server";
import { btnPrimaryMd } from "@/lib/ui-classes";

/**
 * Evaluated once at build time (module scope in a server component), so this
 * is the moment this deployment was built — not the time of the request.
 */
const BUILD_STAMP = new Date().toLocaleString("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Chicago",
});

const COMMIT_SHA = (process.env.VERCEL_GIT_COMMIT_SHA ?? "").slice(0, 7);

export default async function PhaseZeroHome() {
  const authOn = shouldEnforceAuth();
  const user = authOn ? await getSupabaseSessionUser() : null;

  if (authOn && user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-8 bg-slate-50 px-6 text-slate-900">
      <div className="flex max-w-xl flex-col gap-3 text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-600">Recover My Value</p>
        <h1 className="text-3xl font-semibold">Kingdom Counsel Firm — case system</h1>
        <p className="text-base text-slate-600">
          Immigration and personal injury matters, guided fact intake, drafting, deadlines, and
          time capture — in one place.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {authOn && !user ? (
          <>
            <Link className={btnPrimaryMd} href="/login">
              Sign in to open dashboard
            </Link>
          </>
        ) : (
          <>
            <Link className={btnPrimaryMd} href="/dashboard">
              Open dashboard
            </Link>
            {!authOn ? (
              <Link
                className="rounded-md border border-slate-300 px-5 py-2 text-sm font-medium text-slate-800 hover:bg-white"
                href="/login"
              >
                Sign in
              </Link>
            ) : null}
          </>
        )}
      </div>

      {/*
        Build stamp — the signed-out landing page is the only thing visible
        without credentials, so it never appeared to change no matter what
        shipped. This makes "did my deploy actually land?" answerable at a
        glance instead of requiring vercel inspect.
      */}
      <p className="max-w-md text-center text-xs text-slate-500">
        Last deployed {BUILD_STAMP}
        {COMMIT_SHA ? ` · ${COMMIT_SHA}` : ""}
      </p>
    </main>
  );
}
