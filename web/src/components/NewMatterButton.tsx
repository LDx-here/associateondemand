"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  demoMode?: boolean;
};

export function NewMatterButton({ demoMode }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [caseType, setCaseType] = useState("Asylum");
  const [country, setCountry] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/matters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, caseType, country: country || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Create failed");
      setOpen(false);
      setTitle("");
      setCountry("");
      router.push(`/matters/${data.matter.matterId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
      >
        New matter
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={submit}
            className="w-full max-w-md space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-lg"
          >
            <h2 className="text-lg font-semibold text-slate-900">New matter</h2>
            {demoMode ? (
              <p className="text-sm text-amber-700">Demo mode — matter saved to local seed only.</p>
            ) : null}
            <label className="block text-sm">
              <span className="text-slate-700">Title</span>
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                placeholder="Short matter description (no client PII)"
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-700">Case type</span>
              <select
                value={caseType}
                onChange={(e) => setCaseType(e.target.value)}
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
              >
                {["Asylum", "Withholding", "CAT", "Motion to Reopen", "Appeal", "Other"].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-slate-700">Country (optional)</span>
              <input
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
              />
            </label>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50"
              >
                {busy ? "Creating…" : "Create"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
