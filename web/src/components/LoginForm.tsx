"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { btnPrimary } from "@/lib/ui-classes";

export function LoginForm() {
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/dashboard";
  const callbackError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"password" | "magic">("password");
  const [message, setMessage] = useState<string | null>(
    callbackError === "auth_callback" ? "Sign-in link expired or invalid. Try again." : null,
  );
  const [busy, setBusy] = useState(false);

  async function signInWithPassword(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setMessage(error.message);
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
    setMessage(null);
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
        setMessage(error.message);
        return;
      }
      setMessage("Check your email for a sign-in link.");
    } catch {
      setMessage("Supabase is not configured on this host.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="space-y-4"
      onSubmit={mode === "password" ? signInWithPassword : sendMagicLink}
    >
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
          <span className="mb-1 block font-medium text-slate-700">Password</span>
          <input
            type="password"
            required
            autoComplete="current-password"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
      ) : (
        <p className="text-xs text-slate-600">
          We will email a one-time sign-in link. No password required for this method.
        </p>
      )}

      {message ? (
        <p className="text-sm text-rose-800" role="alert">
          {message}
        </p>
      ) : null}

      <button type="submit" disabled={busy} className={`${btnPrimary} w-full disabled:opacity-50`}>
        {busy ? "Working…" : mode === "password" ? "Sign in" : "Send magic link"}
      </button>

      <button
        type="button"
        className="w-full text-center text-xs text-slate-600 underline-offset-2 hover:underline"
        onClick={() => setMode(mode === "password" ? "magic" : "password")}
      >
        {mode === "password" ? "Use email magic link instead" : "Use email and password instead"}
      </button>
    </form>
  );
}
