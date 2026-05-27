import { isAuthEnabledFlag, shouldEnforceAuth } from "@/lib/supabase/env";
import { getSupabaseSessionUser } from "@/lib/supabase/server";

export async function SessionAccount() {
  if (!isAuthEnabledFlag()) {
    return <span className="text-slate-700">Not enabled (local development)</span>;
  }

  if (!shouldEnforceAuth()) {
    return (
      <span className="text-slate-700">
        Enabled in config; add Supabase URL and anon key to complete setup.
      </span>
    );
  }

  const session = await getSupabaseSessionUser();
  if (!session) {
    return <span className="text-slate-700">No active session. Sign in from the login page.</span>;
  }

  const label = session.name ? `${session.name} (${session.email})` : session.email;

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-slate-800">Signed in as {label}</span>
      <form action="/api/auth/signout" method="post">
        <button
          type="submit"
          className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
