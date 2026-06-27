"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatAuthError } from "@/lib/supabase/auth-errors";
import { btnPrimary } from "@/lib/ui-classes";

type LoginMode = "password" | "magic" | "forgot";

export function LoginForm() {
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/dashboard";
  const callbackError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<LoginMode>("password");
  const [message, setMessage] = useState<string | null>(
    callbackError === "auth_callback" ? "Sign-in link expired or invalid. Try again." : null,
  );
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);

  function resetFeedback() {
    setMessage(null);
    setSuccess(false);
  }

  async function signInWithPassword(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    resetFeedback();
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setMessage(formatAuthError(error.message));
        return;
      }
      const dest = nextPath.startsWith("/") ? nextPath : "/dashboard";
      window.location.assign(dest);
    } catch {
      setMessage("Supabase is not configured on this host.");
    } finally {
      setBusy(false);
    }
  }

  async function sendMagicLink(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    resetFeedback();
    try {
      const supabase = createSupabaseBrowserClient();
      const origin = window.location.origin;
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
        },
      });
      if (error) {
        setMessage(formatAuthError(error.message));
        return;
      }
      setSuccess(true);
      setMessage("Check your email for a sign-in link.");
    } catch {
      setMessage("Supabase is not configured on this host.");
    } finally {
      setBusy(false);
    }
  }

  async function sendPasswordReset(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    resetFeedback();
    try {
      const supabase = createSupabaseBrowserClient();
      const origin = window.location.origin;
      const resetNext = encodeURIComponent("/auth/reset-password");
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/auth/callback?next=${resetNext}`,
      });
      if (error) {
        setMessage(formatAuthError(error.message));
        return;
      }
      setSuccess(true);
      setMessage("Check your email for a password reset link.");
    } catch {
      setMessage("Supabase is not configured on this host.");
    } finally {
      setBusy(false);
    }
  }

  const onSubmit =
    mode === "password" ? signInWithPassword : mode === "magic" ? sendMagicLink : sendPasswordReset;

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-slate-700">Email</span>
        <input
          type="email"
          required
          autoComplete="email"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>

      {mode === "password" ? (
        <label className="block text-sm">
          <span className="mb-1 flex items-center justify-between">
            <span className="font-medium text-slate-700">Password</span>
            <button
              type="button"
              className="text-xs text-slate-600 underline-offset-2 hover:underline"
              onClick={() => {
                resetFeedback();
                setMode("forgot");
              }}
            >
              Forgot password?
            </button>
          </span>
          <input
            type="password"
            required
            autoComplete="current-password"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
      ) : mode === "magic" ? (
        <p className="text-xs text-slate-600">
          We will email a one-time sign-in link. No password required for this method.
        </p>
      ) : (
        <p className="text-xs text-slate-600">
          We will email a link to set a new password. If you only use magic links today, this is how
          you create a password for next time.
        </p>
      )}

      {message ? (
        <p
          className={`text-sm ${success ? "text-emerald-800" : "text-rose-800"}`}
          role="alert"
        >
          {message}
        </p>
      ) : null}

      <button type="submit" disabled={busy} className={`${btnPrimary} w-full disabled:opacity-50`}>
        {busy
          ? "Working…"
          : mode === "password"
            ? "Sign in"
            : mode === "magic"
              ? "Send magic link"
              : "Send reset link"}
      </button>

      {mode === "forgot" ? (
        <button
          type="button"
          className="w-full text-center text-xs text-slate-600 underline-offset-2 hover:underline"
          onClick={() => {
            resetFeedback();
            setMode("password");
          }}
        >
          Back to sign in
        </button>
      ) : (
        <button
          type="button"
          className="w-full text-center text-xs text-slate-600 underline-offset-2 hover:underline"
          onClick={() => {
            resetFeedback();
            setMode(mode === "password" ? "magic" : "password");
          }}
        >
          {mode === "password" ? "Use email magic link instead" : "Use email and password instead"}
        </button>
      )}
    </form>
  );
}
