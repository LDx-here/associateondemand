import { Suspense } from "react";

import { ResetPasswordForm } from "@/components/ResetPasswordForm";
import { isAuthEnabledFlag, shouldEnforceAuth } from "@/lib/supabase/env";

export default function ResetPasswordPage() {
  const authFlag = isAuthEnabledFlag();
  const configured = shouldEnforceAuth();

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 px-6 py-24">
      <header>
        <p className="text-sm font-semibold text-slate-700">AssociateOnDemand</p>
        <h1 className="text-2xl font-semibold text-slate-900">Set a new password</h1>
        <p className="mt-2 text-sm text-slate-600">
          Open this page from the reset link in your email, then choose a new password.
        </p>
      </header>

      {!authFlag ? (
        <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          Sign-in is off for local development. Open the dashboard directly.
        </p>
      ) : !configured ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          Auth is enabled but Supabase is not configured on this host.
        </p>
      ) : (
        <Suspense fallback={<p className="text-sm text-slate-500">Loading…</p>}>
          <ResetPasswordForm />
        </Suspense>
      )}
    </main>
  );
}
