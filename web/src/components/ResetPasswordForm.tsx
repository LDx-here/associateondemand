"use client";

import { useState } from "react";

import { formatAuthError } from "@/lib/supabase/auth-errors";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { btnPrimary } from "@/lib/ui-classes";

export function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);

  async function saveNewPassword(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);

    if (password.length < 8) {
      setMessage("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setMessage(formatAuthError(error.message));
        return;
      }
      setSuccess(true);
      setMessage("Password updated. Redirecting to dashboard…");
      window.setTimeout(() => {
        window.location.assign("/dashboard");
      }, 1200);
    } catch {
      setMessage("Supabase is not configured on this host.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={saveNewPassword}>
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-slate-700">New password</span>
        <input
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>

      <label className="block text-sm">
        <span className="mb-1 block font-medium text-slate-700">Confirm password</span>
        <input
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
      </label>

      {message ? (
        <p
          className={`text-sm ${success ? "text-emerald-800" : "text-rose-800"}`}
          role="alert"
        >
          {message}
        </p>
      ) : null}

      <button type="submit" disabled={busy || success} className={`${btnPrimary} w-full disabled:opacity-50`}>
        {busy ? "Saving…" : "Save new password"}
      </button>

      <a
        href="/login"
        className="block w-full text-center text-xs text-slate-600 underline-offset-2 hover:underline"
      >
        Back to sign in
      </a>
    </form>
  );
}
