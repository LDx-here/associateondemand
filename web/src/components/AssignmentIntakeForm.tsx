"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";

import {
  TEMPLATE_CATALOG,
  TIER_LABELS,
  findTemplate,
  type DeliverableTier,
} from "@/lib/template-catalog";
import { btnPrimaryMd, btnSecondary } from "@/lib/ui-classes";

const inputClass =
  "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none";

const TIER_BADGE_CLASS: Record<DeliverableTier, string> = {
  template: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20",
  research: "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-600/20",
  custom: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/20",
};

type MatterOption = { matterId: string; label: string };

type SubmitResult = {
  matterId: string;
} | null;

function AssignmentIntakeFormInner({ matterOptions }: { matterOptions: MatterOption[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetDeliverable = searchParams.get("deliverable");

  const [matterMode, setMatterMode] = useState<"existing" | "new">(
    matterOptions.length > 0 ? "existing" : "new",
  );
  const [matterId, setMatterId] = useState(matterOptions[0]?.matterId ?? "");
  const [newMatter, setNewMatter] = useState({ title: "", caseType: "Asylum", country: "", posture: "" });
  const [deliverableId, setDeliverableId] = useState(
    presetDeliverable && findTemplate(presetDeliverable) ? presetDeliverable : TEMPLATE_CATALOG[0].id,
  );
  const [facts, setFacts] = useState("");
  const [priority, setPriority] = useState<"Normal" | "Rush">("Normal");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitResult>(null);

  const template = useMemo(() => findTemplate(deliverableId), [deliverableId]);
  const tier = template?.tier ?? "custom";

  const grouped = useMemo(() => {
    const groups: Record<DeliverableTier, typeof TEMPLATE_CATALOG> = {
      template: [],
      research: [],
      custom: [],
    };
    for (const entry of TEMPLATE_CATALOG) groups[entry.tier].push(entry);
    return groups;
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!facts.trim()) {
      setError("Describe the facts / instructions for this assignment.");
      return;
    }
    if (matterMode === "existing" && !matterId) {
      setError("Choose an existing matter or switch to New matter.");
      return;
    }
    if (matterMode === "new" && !newMatter.title.trim()) {
      setError("New matter needs a title.");
      return;
    }

    setBusy(true);
    try {
      const resp = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matterMode,
          matterId: matterMode === "existing" ? matterId : undefined,
          newMatter: matterMode === "new" ? newMatter : undefined,
          deliverableId,
          facts: facts.trim(),
          priority,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setError(data.error || `Submit failed (${resp.status})`);
        return;
      }
      setResult({ matterId: data.matterId });
      setFacts("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <div className="space-y-4 rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
        <p className="font-semibold">Assignment submitted.</p>
        <p>
          Matter <span className="font-medium">{result.matterId}</span> has a new PM Inbox item awaiting
          triage.
        </p>
        <div className="flex flex-wrap gap-2">
          <a href="/inbox" className={btnPrimaryMd}>
            Go to PM Inbox
          </a>
          <a href={`/matters/${result.matterId}`} className={btnSecondary}>
            Open matter
          </a>
          <button type="button" className={btnSecondary} onClick={() => setResult(null)}>
            Submit another assignment
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5 rounded-lg border border-slate-200 bg-white p-5">
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-slate-800">Matter</legend>
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              checked={matterMode === "existing"}
              onChange={() => setMatterMode("existing")}
              disabled={matterOptions.length === 0}
            />
            Existing matter
          </label>
          <label className="flex items-center gap-1.5">
            <input type="radio" checked={matterMode === "new"} onChange={() => setMatterMode("new")} />
            New matter
          </label>
        </div>
        {matterMode === "existing" ? (
          <select
            className={inputClass}
            value={matterId}
            onChange={(e) => setMatterId(e.target.value)}
          >
            {matterOptions.length === 0 ? <option value="">No matters yet — use New matter</option> : null}
            {matterOptions.map((m) => (
              <option key={m.matterId} value={m.matterId}>
                {m.label}
              </option>
            ))}
          </select>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm sm:col-span-2">
              <span className="text-xs font-medium text-slate-600">Title (no client PII)</span>
              <input
                className={inputClass}
                value={newMatter.title}
                onChange={(e) => setNewMatter({ ...newMatter, title: e.target.value })}
                placeholder="e.g. AOS adjustment — I-485 discretionary brief"
              />
            </label>
            <label className="block text-sm">
              <span className="text-xs font-medium text-slate-600">Case type</span>
              <input
                className={inputClass}
                list="case-type-options"
                value={newMatter.caseType}
                onChange={(e) => setNewMatter({ ...newMatter, caseType: e.target.value })}
              />
              <datalist id="case-type-options">
                <option value="Asylum" />
                <option value="Withholding of Removal" />
                <option value="CAT" />
                <option value="AOS / I-485" />
                <option value="Removal Defense" />
                <option value="Motion to Reopen" />
                <option value="VAWA" />
                <option value="U Visa" />
              </datalist>
            </label>
            <label className="block text-sm">
              <span className="text-xs font-medium text-slate-600">Country</span>
              <input
                className={inputClass}
                value={newMatter.country}
                onChange={(e) => setNewMatter({ ...newMatter, country: e.target.value })}
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="text-xs font-medium text-slate-600">Procedural posture</span>
              <input
                className={inputClass}
                value={newMatter.posture}
                onChange={(e) => setNewMatter({ ...newMatter, posture: e.target.value })}
                placeholder="e.g. Removal proceedings — master calendar"
              />
            </label>
          </div>
        )}
      </fieldset>

      <label className="block text-sm">
        <span className="font-semibold text-slate-800">Deliverable</span>
        <select
          className={inputClass}
          value={deliverableId}
          onChange={(e) => setDeliverableId(e.target.value)}
        >
          {(Object.keys(grouped) as DeliverableTier[]).map((t) =>
            grouped[t].length ? (
              <optgroup key={t} label={TIER_LABELS[t]}>
                {grouped[t].map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name}
                    {entry.status === "needs-setup" ? " (custom build)" : ""}
                  </option>
                ))}
              </optgroup>
            ) : null,
          )}
        </select>
      </label>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium ${TIER_BADGE_CLASS[tier]}`}>
          {TIER_LABELS[tier]}
        </span>
        {template?.status === "needs-setup" ? (
          <span className="text-amber-800">No template yet — billable as setup + execution.</span>
        ) : (
          <span className="text-slate-500">{template?.description}</span>
        )}
      </div>

      <label className="block text-sm">
        <span className="font-semibold text-slate-800">Facts / instructions</span>
        <textarea
          className={`${inputClass} min-h-[140px]`}
          value={facts}
          onChange={(e) => setFacts(e.target.value)}
          placeholder="What does the attorney need? Include key facts, deadlines, and any attachments already on the matter."
          required
        />
      </label>

      <fieldset className="flex items-center gap-4 text-sm">
        <legend className="sr-only">Priority</legend>
        <label className="flex items-center gap-1.5">
          <input type="radio" checked={priority === "Normal"} onChange={() => setPriority("Normal")} />
          Normal
        </label>
        <label className="flex items-center gap-1.5">
          <input type="radio" checked={priority === "Rush"} onChange={() => setPriority("Rush")} />
          Rush
        </label>
      </fieldset>

      {error ? <p className="text-sm text-rose-700">{error}</p> : null}

      <div className="flex justify-end gap-2">
        <button type="submit" className={btnPrimaryMd} disabled={busy}>
          {busy ? "Submitting…" : "Submit assignment"}
        </button>
      </div>
    </form>
  );
}

export function AssignmentIntakeForm({ matterOptions }: { matterOptions: MatterOption[] }) {
  return (
    <Suspense fallback={null}>
      <AssignmentIntakeFormInner matterOptions={matterOptions} />
    </Suspense>
  );
}
