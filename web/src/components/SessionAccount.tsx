import { isAuthEnabledFlag, shouldEnforceAuth } from "@/lib/supabase/env";
import { getSupabaseSessionUser } from "@/lib/supabase/server";

export async function SessionAccount({
  compact = false,
  variant = "sidebar",
}: {
  compact?: boolean;
  variant?: "sidebar" | "header";
}) {
  const isHeader = variant === "header";

  if (!isAuthEnabledFlag()) {
    return (
      <span className={compact ? (isHeader ? "text-xs text-slate-500" : "text-xs text-slate-400") : "text-slate-700"}>
        Not enabled (local)
      </span>
    );
  }

  if (!shouldEnforceAuth()) {
    return (
      <span className={compact ? (isHeader ? "text-xs text-slate-500" : "text-xs text-slate-400") : "text-slate-700"}>
        Auth enabled; add Supabase keys
      </span>
    );
  }

  const session = await getSupabaseSessionUser();
  if (!session) {
    return compact ? (
      <a
        className={
          isHeader
            ? "text-xs font-medium text-sky-800 underline-offset-2 hover:underline"
            : "text-xs text-sky-300 underline-offset-2 hover:underline"
        }
        href="/login"
      >
        Sign in
      </a>
    ) : (
      <span className="text-slate-700">No active session. Sign in from the login page.</span>
    );
  }

  const label = session.name ? session.name.split(" ")[0] : session.email.split("@")[0];

  if (compact) {
    if (isHeader) {
      return (
        <div className="flex items-center gap-2">
          <p className="max-w-[8rem] truncate text-xs text-slate-700" title={session.email}>
            {label}
          </p>
          <form action="/api/auth/signout" method="post">
            <button
              type="submit"
              className="rounded border border-slate-300 px-2 py-0.5 text-[11px] text-slate-600 hover:bg-slate-50"
            >
              Sign out
            </button>
          </form>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <p className="truncate text-xs text-slate-300" title={session.email}>
          {label}
        </p>
        <form action="/api/auth/signout" method="post">
          <button
            type="submit"
            className="w-full rounded border border-slate-700 px-2 py-1 text-[11px] text-slate-300 hover:bg-slate-800"
          >
            Sign out
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-slate-800">Signed in as {session.name ? `${session.name} (${session.email})` : session.email}</span>
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
