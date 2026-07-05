"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import {
  TierZeroBanner,
  tierRequiresManualApproval,
  UploadProgressTable,
  uploadDocument,
  type UploadResult,
} from "@/components/IntakeUploadShared";
import { useToast } from "@/components/Toast";
import { DELIVERABLE_CATALOG, deliverableById } from "@/lib/deliverable-catalog";
import type { AssignmentTier, Matter } from "@/lib/types";
import { btnPrimary, btnSecondary } from "@/lib/ui-classes";

const CUSTOM_OPTION = "custom-other-free-text";
const PRIORITIES = ["Urgent", "High", "Medium", "Low"];
const MIN_FACTS_LENGTH = 20;

type QueueItem = { name: string; status: "pending" | "uploading" | "done" | "error"; result?: UploadResult };

export function AssignmentIntakeForm({
  matters,
  demoMode,
  initialDeliverableId,
  initialMatterId,
}: {
  matters: Matter[];
  demoMode: boolean;
  initialDeliverableId?: string;
  initialMatterId?: string;
}) {
  const router = useRouter();
  const { showToast } = useToast();

  const initialCatalogHit = initialDeliverableId ? deliverableById(initialDeliverableId) : undefined;

  const [matterMode, setMatterMode] = useState<"existing" | "new">(
    initialMatterId || matters.length > 0 ? "existing" : "new",
  );
  const [existingMatterId, setExistingMatterId] = useState(initialMatterId || matters[0]?.matterId || "");
  const [newTitle, setNewTitle] = useState("");
  const [newCaseType, setNewCaseType] = useState("Immigration - Asylum");
  const [newCountry, setNewCountry] = useState("");

  const [deliverableId, setDeliverableId] = useState(initialCatalogHit ? initialCatalogHit.id : CUSTOM_OPTION);
  const [customDeliverableName, setCustomDeliverableName] = useState("");
  const [customTier, setCustomTier] = useState<AssignmentTier>("Custom");

  const [facts, setFacts] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [dueDate, setDueDate] = useState("");

  const [manualApproved, setManualApproved] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [uploadQueue, setUploadQueue] = useState<QueueItem[]>([]);

  const [busy, setBusy] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const selectedCatalog = useMemo(
    () => (deliverableId === CUSTOM_OPTION ? undefined : deliverableById(deliverableId)),
    [deliverableId],
  );
  const deliverableType = selectedCatalog ? selectedCatalog.name : customDeliverableName.trim();
  const tier: AssignmentTier = selectedCatalog ? selectedCatalog.tier : customTier;

  function validate(): Record<string, string> {
    const errors: Record<string, string> = {};
    if (matterMode === "existing" && !existingMatterId.trim()) {
      errors.matter = "Choose an existing matter.";
    }
    if (matterMode === "new" && !newTitle.trim()) {
      errors.matter = "Give the new matter a short title (no client names).";
    }
    if (deliverableId === CUSTOM_OPTION && !customDeliverableName.trim()) {
      errors.deliverable = "Name the custom deliverable.";
    }
    if (!facts.trim()) {
      errors.facts = "Facts are required so the associate can start work.";
    } else if (facts.trim().length < MIN_FACTS_LENGTH) {
      errors.facts = `Add a bit more detail (at least ${MIN_FACTS_LENGTH} characters).`;
    }
    if (files.length > 0 && tierRequiresManualApproval() && !manualApproved) {
      errors.files = "Check the tier 0 manual approval box before attaching files.";
    }
    return errors;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setBusy(true);
    try {
      const resp = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matterId: matterMode === "existing" ? existingMatterId : undefined,
          newMatter:
            matterMode === "new"
              ? { title: newTitle.trim(), caseType: newCaseType, country: newCountry.trim() || undefined }
              : undefined,
          deliverableType,
          tier,
          facts: facts.trim(),
          priority,
          dueDate: dueDate || null,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setFormError(data.error || `Could not submit assignment (${resp.status}).`);
        showToast(data.error || "Could not submit assignment.", "error");
        return;
      }

      const matterId = data.matterId as string;
      const dispatch = data.dispatch as {
        started?: boolean;
        agent?: string;
        error?: string;
        deliverableReady?: boolean;
      } | null;

      if (files.length > 0) {
        const initialQueue: QueueItem[] = files.map((f) => ({ name: f.name, status: "pending" }));
        setUploadQueue(initialQueue);
        for (let i = 0; i < files.length; i++) {
          setUploadQueue((prev) => prev.map((q, idx) => (idx === i ? { ...q, status: "uploading" } : q)));
          try {
            const result = await uploadDocument(matterId, files[i], manualApproved, "batch");
            setUploadQueue((prev) =>
              prev.map((q, idx) => (idx === i ? { ...q, status: result.error ? "error" : "done", result } : q)),
            );
          } catch (err) {
            setUploadQueue((prev) =>
              prev.map((q, idx) =>
                idx === i
                  ? { ...q, status: "error", result: { error: err instanceof Error ? err.message : "Upload failed" } }
                  : q,
              ),
            );
          }
        }
      }

      const dispatchNote = dispatch?.deliverableReady
        ? ` Draft ready for attorney review (${dispatch.agent ?? "agent"}). Check Ready for review lane.`
        : dispatch?.started
          ? ` PM agent started (${dispatch.agent ?? "orchestrator"}). Check In progress lane.`
          : dispatch?.error
            ? " Saved to Submitted lane — agent dispatch will run when API is online."
            : "";
      showToast(`Assignment submitted for ${matterId}.${dispatchNote}`, "success");
      router.push("/inbox");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Network error submitting assignment.";
      setFormError(message);
      showToast(message, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      {demoMode ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Demo mode — this assignment will be saved to the local sample data, not live Airtable.
        </p>
      ) : null}

      <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">1. Matter</h2>
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={matterMode === "existing"}
              onChange={() => setMatterMode("existing")}
              disabled={matters.length === 0}
            />
            Existing matter
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" checked={matterMode === "new"} onChange={() => setMatterMode("new")} />
            New matter
          </label>
        </div>
        {matterMode === "existing" ? (
          <label className="block text-sm">
            <span className="text-slate-700">Matter</span>
            <select
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              value={existingMatterId}
              onChange={(e) => setExistingMatterId(e.target.value)}
            >
              {matters.length === 0 ? <option value="">No matters yet — create a new one</option> : null}
              {matters.map((m) => (
                <option key={m.matterId} value={m.matterId}>
                  {m.matterId} — {m.title || m.clientName} ({m.caseType || "no case type"})
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm sm:col-span-2">
              <span className="text-slate-700">Matter title</span>
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                placeholder="Short matter description (no client names)"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-700">Case type</span>
              <select
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                value={newCaseType}
                onChange={(e) => setNewCaseType(e.target.value)}
              >
                {[
                  "Immigration - Asylum",
                  "Immigration - Family",
                  "Immigration - Employment",
                  "Immigration - Other",
                  "Personal Injury - Auto",
                  "Personal Injury - Slip & Fall",
                  "Personal Injury - Other",
                ].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-slate-700">Country (optional)</span>
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                value={newCountry}
                onChange={(e) => setNewCountry(e.target.value)}
              />
            </label>
          </div>
        )}
        {fieldErrors.matter ? <p className="text-sm text-rose-700">{fieldErrors.matter}</p> : null}
      </section>

      <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">2. Deliverable &amp; tier</h2>
        <label className="block text-sm">
          <span className="text-slate-700">Deliverable type</span>
          <select
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            value={deliverableId}
            onChange={(e) => setDeliverableId(e.target.value)}
          >
            {DELIVERABLE_CATALOG.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} — {d.tier} tier
              </option>
            ))}
            <option value={CUSTOM_OPTION}>Custom / not listed…</option>
          </select>
        </label>
        {selectedCatalog ? (
          <p className="text-xs text-slate-500">{selectedCatalog.description}</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-slate-700">Deliverable name</span>
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                placeholder="e.g. Motion to Suppress"
                value={customDeliverableName}
                onChange={(e) => setCustomDeliverableName(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-700">Tier</span>
              <select
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                value={customTier}
                onChange={(e) => setCustomTier(e.target.value as AssignmentTier)}
              >
                <option value="Custom">Custom build</option>
                <option value="Template">Template</option>
                <option value="Research">Research &amp; audit</option>
              </select>
            </label>
          </div>
        )}
        {fieldErrors.deliverable ? <p className="text-sm text-rose-700">{fieldErrors.deliverable}</p> : null}
      </section>

      <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">3. Facts</h2>
        <label className="block text-sm">
          <span className="text-slate-700">What does the associate need to know?</span>
          <textarea
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            rows={6}
            placeholder="Procedural posture, key facts, deadlines, and what the deliverable needs to accomplish. No client names — refer to the matter ID."
            value={facts}
            onChange={(e) => setFacts(e.target.value)}
          />
          <span className="mt-1 block text-xs text-slate-400">{facts.trim().length} characters</span>
        </label>
        {fieldErrors.facts ? <p className="text-sm text-rose-700">{fieldErrors.facts}</p> : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="text-slate-700">Priority</span>
            <select
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-slate-700">Due date (optional)</span>
            <input
              type="date"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </label>
        </div>
      </section>

      <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">4. Attachments (optional)</h2>
        {files.length > 0 ? <TierZeroBanner approved={manualApproved} onApprovedChange={setManualApproved} /> : null}
        <input
          type="file"
          multiple
          accept=".pdf,.png,.jpg,.jpeg,.tif,.tiff,.txt"
          className="w-full text-sm"
          onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
        />
        {fieldErrors.files ? <p className="text-sm text-rose-700">{fieldErrors.files}</p> : null}
        <UploadProgressTable items={uploadQueue} />
      </section>

      {formError ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{formError}</p>
      ) : null}

      <div className="flex justify-end gap-2">
        <button type="button" className={btnSecondary} onClick={() => router.back()} disabled={busy}>
          Cancel
        </button>
        <button type="submit" className={`${btnPrimary} px-4 py-2`} disabled={busy}>
          {busy ? "Submitting…" : "Submit assignment"}
        </button>
      </div>
    </form>
  );
}
