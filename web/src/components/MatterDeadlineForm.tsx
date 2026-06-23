"use client";

import { useState } from "react";

import { btnPrimary } from "@/lib/ui-classes";

export function MatterDeadlineForm({
  matterId,
  initialDeadline,
  onUpdated,
}: {
  matterId: string;
  initialDeadline: string | null;
  onUpdated?: () => void;
}) {
  const [deadline, setDeadline] = useState(initialDeadline?.slice(0, 10) ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const resp = await fetch(`/api/matters/${matterId}/deadline`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nextDeadline: deadline || null }),
      });
      if (!resp.ok) {
        const err = (await resp.json()) as { error?: string };
        setMessage(err.error ?? "Failed to update deadline");
        return;
      }
      setMessage("Deadline saved.");
      onUpdated?.();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-sm font-medium text-slate-800">Next filing deadline</p>
      <div className="mt-2 flex flex-wrap items-end gap-2">
        <input
          type="date"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
        />
        <button
          type="button"
          className={`${btnPrimary} disabled:opacity-50`}
          disabled={saving}
          onClick={save}
        >
          {saving ? "Saving…" : "Save deadline"}
        </button>
      </div>
      {message ? <p className="mt-2 text-xs text-slate-600">{message}</p> : null}
    </div>
  );
}
