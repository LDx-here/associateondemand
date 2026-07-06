"use client";

import { useState } from "react";

import { useToast } from "@/components/Toast";
import { btnPrimary, btnSecondary } from "@/lib/ui-classes";

export function SaveAsSkillModal({
  open,
  onClose,
  defaultName,
  defaultBody,
  originalOutput,
  matterId,
  agent,
}: {
  open: boolean;
  onClose: () => void;
  defaultName: string;
  defaultBody: string;
  originalOutput: string;
  matterId?: string;
  agent?: string;
}) {
  const { showToast } = useToast();
  const [name, setName] = useState(defaultName);
  const [description, setDescription] = useState("");
  const [trigger, setTrigger] = useState("");
  const [body, setBody] = useState(defaultBody);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const resp = await fetch("/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          trigger: trigger.trim(),
          body: body.trim(),
          originalOutput,
          matterId,
          agent,
        }),
      });
      const data = (await resp.json()) as { error?: string };
      if (!resp.ok) {
        setError(data.error ?? `Save failed (${resp.status})`);
        showToast(data.error ?? "Could not save skill.", "error");
        return;
      }
      showToast(`Skill "${name.trim()}" saved to Strategy Patterns.`, "success");
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Network error";
      setError(message);
      showToast(message, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-4 shadow-xl">
        <h2 className="text-base font-semibold text-slate-900">Save as skill</h2>
        <p className="mt-1 text-xs text-slate-600">
          Capture this refined output as a reusable Strategy Pattern — similar to Claude Skills. Agents can query it on future runs.
        </p>

        <div className="mt-4 space-y-3 text-sm">
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Skill name</span>
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. AOS brief tone — Sixth Circuit"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">When to use</span>
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2"
              value={trigger}
              onChange={(e) => setTrigger(e.target.value)}
              placeholder="e.g. Drafting AOS discretionary briefs for domestic violence claims"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Description (optional)</span>
            <textarea
              className="w-full rounded-md border border-slate-300 px-3 py-2"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this skill teaches the associate"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Skill body (exemplar)</span>
            <textarea
              className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs"
              rows={6}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </label>
        </div>

        {error ? (
          <p className="mt-3 rounded border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-900" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className={btnSecondary} onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className={btnPrimary} onClick={() => void save()} disabled={busy || !name.trim() || !body.trim()}>
            {busy ? "Saving…" : "Save skill"}
          </button>
        </div>
      </div>
    </div>
  );
}
