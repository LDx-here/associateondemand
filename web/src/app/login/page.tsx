import { Suspense } from "react";

import { LoginForm } from "@/components/LoginForm";
import { isAuthEnabledFlag, shouldEnforceAuth } from "@/lib/supabase/env";

export default function LoginPage() {
  const authFlag = isAuthEnabledFlag();
  const configured = shouldEnforceAuth();

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 px-6 py-24">
      <header>
        <p className="text-sm font-semibold text-slate-700">AssociateOnDemand</p>
        <h1 className="text-2xl font-semibold text-slate-900">Sign in</h1>
        <p className="mt-2 text-sm text-slate-600">
          Firm access uses Supabase Auth. Matters and tasks remain in Airtable.
        </p>
      </header>

      {!authFlag ? (
        <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          Sign-in is off for local development (<code className="text-xs">AOD_AUTH_ENABLED=false</code>
          ). Open the dashboard directly.
        </p>
      ) : !configured ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          Auth is enabled but Supabase URL and anon key are missing. Add them to{" "}
          <code className="text-xs">web/.env.local</code> (see <code className="text-xs">.env.local.example</code>
          ).
        </p>
      ) : (
        <Suspense fallback={<p className="text-sm text-slate-500">Loading sign-in…</p>}>
          <LoginForm />
        </Suspense>
      )}
    </main>
  );
}
