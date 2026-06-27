"use client";

import { useState } from "react";

import type { Matter } from "@/lib/types";
import { btnPrimary, btnSecondary } from "@/lib/ui-classes";

const inputClass = "w-full rounded-md border border-slate-300 px-3 py-2 text-sm";

export function MatterHeaderEditModal({
  matter,
  onClose,
  onSaved,
}: {
  matter: Matter;
  onClose: () => void;
  onSaved: (matter: Matter) => void;
}) {
  const [form, setForm] = useState({
    title: matter.title || matter.clientName || "",
    caseType: matter.caseType,
    country: matter.country ?? "",
    posture: matter.posture ?? matter.proceduralPosture ?? "",
    court: matter.court ?? "",
    judge: matter.judge ?? "",
    status: matter.status,
    summary: matter.summary ?? "",
    nextDeadline: matter.nextDeadline ?? "",
    nextHearing: matter.nextHearing ?? "",
    assignedAttorney: matter.assignedAttorney ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const resp = await fetch(`/api/matters/${matter.matterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, nextDeadline: form.nextDeadline || null }),
      });
      if (!resp.ok) {
        setError((await resp.text()) || "Save failed");
        return;
      }
      const data = (await resp.json()) as { matter: Matter };
      onSaved(data.matter);
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4" role="dialog" aria-modal="true">
      <form className="max-h-[90vh] w-full max-w-lg space-y-3 overflow-y-auto rounded-lg border border-slate-200 bg-white p-5 shadow-xl" onSubmit={save}>
        <h3 className="text-lg font-semibold text-slate-900">Edit matter {matter.matterId}</h3>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Title</span>
          <input className={inputClass} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          {(["caseType", "status", "country", "posture", "court", "judge", "assignedAttorney"] as const).map((key) => (
            <label key={key} className="block text-sm">
              <span className="mb-1 block font-medium capitalize text-slate-700">{key.replace(/([A-Z])/g, " $1")}</span>
              <input className={inputClass} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
            </label>
          ))}
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Next deadline</span>
            <input type="date" className={inputClass} value={form.nextDeadline?.slice(0, 10) ?? ""} onChange={(e) => setForm({ ...form, nextDeadline: e.target.value })} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Next hearing</span>
            <input type="date" className={inputClass} value={form.nextHearing?.slice(0, 10) ?? ""} onChange={(e) => setForm({ ...form, nextHearing: e.target.value })} />
          </label>
        </div>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Summary</span>
          <textarea className={`${inputClass} min-h-[80px]`} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
        </label>
        {error ? <p className="text-sm text-rose-700">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <button type="button" className={btnSecondary} onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className={btnPrimary} disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
