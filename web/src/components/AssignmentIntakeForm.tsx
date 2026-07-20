"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import {
  TierZeroBanner,
  tierRequiresManualApproval,
  UploadProgressTable,
  uploadDocument,
  type UploadResult,
} from "@/components/IntakeUploadShared";
import { IntakeContextSidebar } from "@/components/IntakeContextSidebar";
import { IntakeGuidancePanel } from "@/components/IntakeGuidancePanel";
import { useToast } from "@/components/Toast";
import {
  buildIntakeDisclaimerBody,
  intakeDisclaimerCheckboxLabel,
} from "@/lib/intake-disclaimer";
import {
  extractHeuristicFactsFromText,
  mergeOcrIntoDraftingFacts,
  seedDraftingFactsFromMatter,
} from "@/lib/intake-prefill";
import {
  isDraftingFactsCompleteEnough,
  mergeFactsForDispatch,
  type DraftingFactsPayload,
} from "@/lib/practice-area-facts";
import { FirmMemoryPrompt } from "@/components/FirmMemoryPrompt";
import { PracticeAreaFactGuide } from "@/components/PracticeAreaFactGuide";
import {
  DELIVERABLE_CATALOG,
  billingNoteForStripe,
  deliverableById,
  formatCatalogQuote,
  formatPricingRange,
  isPhase0LaunchSku,
  isSampleDiscountEligible,
  PHASE0_LAUNCH_SKU_IDS,
  sampleDiscountNote,
} from "@/lib/deliverable-catalog";
import { formatUsdFromCents, quoteFromCatalogEntry } from "@/lib/stripe-pricing";
import { isStripeCheckoutEnabled } from "@/lib/stripe-client";
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

  const [deliverableId, setDeliverableId] = useState(
    initialCatalogHit ? initialCatalogHit.id : PHASE0_LAUNCH_SKU_IDS[0],
  );
  const [customDeliverableName, setCustomDeliverableName] = useState("");
  const [customTier, setCustomTier] = useState<AssignmentTier>("Custom");

  const [facts, setFacts] = useState("");
  const [structuredFacts, setStructuredFacts] = useState<DraftingFactsPayload | null>(null);
  const [priority, setPriority] = useState("Medium");
  const [dueDate, setDueDate] = useState("");

  const [manualApproved, setManualApproved] = useState(false);
  const [disclaimerAcknowledged, setDisclaimerAcknowledged] = useState(false);
  const [applySampleDiscount, setApplySampleDiscount] = useState(false);
  const [sampleFile, setSampleFile] = useState<File | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [uploadQueue, setUploadQueue] = useState<QueueItem[]>([]);

  const [busy, setBusy] = useState(false);
  const [ocrPrefillCount, setOcrPrefillCount] = useState(0);
  const [extractingOcr, setExtractingOcr] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const selectedCatalog = useMemo(
    () => (deliverableId === CUSTOM_OPTION ? undefined : deliverableById(deliverableId)),
    [deliverableId],
  );
  const deliverableType = selectedCatalog ? selectedCatalog.name : customDeliverableName.trim();
  const tier: AssignmentTier = selectedCatalog ? selectedCatalog.tier : customTier;

  const existingMatter = useMemo(
    () => matters.find((m) => m.matterId === existingMatterId),
    [matters, existingMatterId],
  );

  const disclaimerContext = useMemo(
    () => ({
      caseType: matterMode === "new" ? newCaseType : undefined,
      country: matterMode === "new" ? newCountry : undefined,
      existingCaseType: matterMode === "existing" ? existingMatter?.caseType : undefined,
    }),
    [matterMode, newCaseType, newCountry, existingMatter?.caseType],
  );

  const disclaimerBody = useMemo(() => buildIntakeDisclaimerBody(disclaimerContext), [disclaimerContext]);
  const disclaimerCheckbox = useMemo(
    () => intakeDisclaimerCheckboxLabel(disclaimerContext),
    [disclaimerContext],
  );

  const activeCaseType =
    matterMode === "new" ? newCaseType : existingMatter?.caseType ?? "Immigration - Other";

  const mergedFactsPreview = useMemo(
    () => mergeFactsForDispatch(structuredFacts, facts),
    [structuredFacts, facts],
  );

  const sampleEligible = selectedCatalog ? isSampleDiscountEligible(selectedCatalog) : false;
  const discountNote = selectedCatalog ? sampleDiscountNote(selectedCatalog) : null;
  const stripeCheckout = isStripeCheckoutEnabled();
  const billingNote = billingNoteForStripe(stripeCheckout);
  const quotedCents = useMemo(() => {
    if (!selectedCatalog) return null;
    const quote = quoteFromCatalogEntry(selectedCatalog, applySampleDiscount && sampleEligible);
    return quote?.amountCents ?? null;
  }, [selectedCatalog, applySampleDiscount, sampleEligible]);

  const applyOcrMerge = useCallback(
    (ocrFacts: Array<{ fact_type: string; value: string }>, ocrText?: string) => {
      setStructuredFacts((prev) => {
        const base =
          prev ??
          seedDraftingFactsFromMatter(
            matterMode === "existing" ? existingMatterId : "draft",
            activeCaseType,
            deliverableId === CUSTOM_OPTION ? undefined : deliverableId,
          );
        const { payload, filledFieldIds } = mergeOcrIntoDraftingFacts(base, ocrFacts, ocrText);
        if (filledFieldIds.length > 0) {
          setOcrPrefillCount((n) => n + filledFieldIds.length);
        }
        return payload;
      });
    },
    [matterMode, existingMatterId, activeCaseType, deliverableId],
  );

  const applySavedFacts = useCallback(
    (saved: DraftingFactsPayload) => {
      setStructuredFacts(
        seedDraftingFactsFromMatter(
          matterMode === "existing" ? existingMatterId : "draft",
          activeCaseType,
          deliverableId === CUSTOM_OPTION ? undefined : deliverableId,
          saved,
        ),
      );
    },
    [matterMode, existingMatterId, activeCaseType, deliverableId],
  );

  async function extractFactsFromAttachments(selected: File[]) {
    if (!selected.length) return;
    setExtractingOcr(true);
    try {
      let totalFilled = 0;
      for (const file of selected) {
        const lower = file.name.toLowerCase();
        if (lower.endsWith(".txt") || lower.endsWith(".md")) {
          const text = await file.text();
          const facts = extractHeuristicFactsFromText(text);
          if (facts.length) {
            setStructuredFacts((prev) => {
              const base =
                prev ??
                seedDraftingFactsFromMatter(
                  matterMode === "existing" ? existingMatterId : "draft",
                  activeCaseType,
                  deliverableId === CUSTOM_OPTION ? undefined : deliverableId,
                );
              const { payload, filledFieldIds } = mergeOcrIntoDraftingFacts(base, facts, text);
              totalFilled += filledFieldIds.length;
              return payload;
            });
          }
          continue;
        }

        if (matterMode === "existing" && existingMatterId.trim()) {
          if (tierRequiresManualApproval() && !manualApproved) {
            showToast("Check tier 0 manual approval before OCR on attachments.", "error");
            continue;
          }
          const result = await uploadDocument(existingMatterId, file, manualApproved, "batch");
          if (result.error) {
            showToast(result.error, "error");
            continue;
          }
          if (result.facts?.length || result.text_preview) {
            setStructuredFacts((prev) => {
              const base =
                prev ??
                seedDraftingFactsFromMatter(
                  existingMatterId,
                  activeCaseType,
                  deliverableId === CUSTOM_OPTION ? undefined : deliverableId,
                );
              const { payload, filledFieldIds } = mergeOcrIntoDraftingFacts(
                base,
                result.facts ?? [],
                result.text_preview,
              );
              totalFilled += filledFieldIds.length;
              return payload;
            });
          }
        }
      }
      if (totalFilled > 0) {
        setOcrPrefillCount((n) => n + totalFilled);
        showToast(`Strong Reader pre-filled ${totalFilled} checklist field(s). Verify below.`, "success");
      } else if (matterMode === "new") {
        showToast("Link an existing matter or use .txt uploads for pre-submit OCR prefill.", "error");
      }
    } finally {
      setExtractingOcr(false);
    }
  }

  async function onFilesSelected(next: File[]) {
    setFiles(next);
    if (next.length > 0) await extractFactsFromAttachments(next);
  }

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
    if (!isDraftingFactsCompleteEnough(structuredFacts, facts, MIN_FACTS_LENGTH)) {
      errors.facts =
        "Complete the guided checklist (at least 3 key items) or add a freeform summary (20+ characters).";
    }
    if (files.length > 0 && tierRequiresManualApproval() && !manualApproved) {
      errors.files = "Check the tier 0 manual approval box before attaching files.";
    }
    if (applySampleDiscount && !sampleFile && files.length === 0) {
      errors.sample = "Upload a sample of your firm's prior work to apply the sample discount.";
    }
    if (!disclaimerAcknowledged) {
      errors.disclaimer = "Acknowledge the limited-scope disclaimer before submitting.";
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
          deliverableCatalogId: selectedCatalog?.id,
          tier,
          facts: mergedFactsPreview,
          structuredFacts: structuredFacts ?? undefined,
          priority,
          dueDate: dueDate || null,
          sampleDiscountEligible: sampleEligible,
          discountApplied: applySampleDiscount && sampleEligible,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setFormError(data.error || `Could not submit assignment (${resp.status}).`);
        showToast(data.error || "Could not submit assignment.", "error");
        return;
      }

      const matterId = data.matterId as string;
      const inboxItem = data.inboxItem as { id: string };
      const requiresPayment = Boolean(data.requiresPayment);
      const dispatch = data.dispatch as {
        started?: boolean;
        agent?: string;
        error?: string;
        deliverableReady?: boolean;
      } | null;

      if (files.length > 0 || sampleFile) {
        const uploadFiles = sampleFile ? [sampleFile, ...files.filter((f) => f !== sampleFile)] : files;
        const initialQueue: QueueItem[] = uploadFiles.map((f) => ({ name: f.name, status: "pending" }));
        setUploadQueue(initialQueue);
        for (let i = 0; i < uploadFiles.length; i++) {
          setUploadQueue((prev) => prev.map((q, idx) => (idx === i ? { ...q, status: "uploading" } : q)));
          try {
            const result = await uploadDocument(matterId, uploadFiles[i], manualApproved, "batch");
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

      if (requiresPayment && inboxItem?.id) {
        const checkoutResp = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ inboxItemId: inboxItem.id }),
        });
        const checkoutData = await checkoutResp.json();
        if (checkoutResp.ok && checkoutData.checkoutUrl) {
          showToast("Redirecting to secure checkout…", "success");
          window.location.href = checkoutData.checkoutUrl as string;
          return;
        }
        showToast(
          checkoutData.error ||
            "Assignment saved — invoice after delivery (checkout unavailable).",
          "error",
        );
        router.push("/inbox");
        router.refresh();
        return;
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
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
      <form onSubmit={onSubmit} className="space-y-6 min-w-0" noValidate>
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
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold text-slate-900">2. Deliverable &amp; tier</h2>
          <FirmMemoryPrompt compact />
        </div>
        <label className="block text-sm">
          <span className="text-slate-700">Deliverable type</span>
          <select
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            value={deliverableId}
            onChange={(e) => setDeliverableId(e.target.value)}
          >
            <optgroup label="Available now">
              {DELIVERABLE_CATALOG.filter((d) => isPhase0LaunchSku(d.id)).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} — {formatCatalogQuote(d)}
                </option>
              ))}
            </optgroup>
            <optgroup label="More deliverables (coming soon)">
              {DELIVERABLE_CATALOG.filter((d) => !isPhase0LaunchSku(d.id)).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} — {d.tier} tier
                </option>
              ))}
            </optgroup>
            <option value={CUSTOM_OPTION}>Custom / not listed…</option>
          </select>
        </label>
        {selectedCatalog ? (
          <div className="space-y-1">
            <p className="text-xs text-slate-500">{selectedCatalog.description}</p>
            <p className="text-sm font-medium text-slate-800">{formatCatalogQuote(selectedCatalog)}</p>
            {sampleEligible && applySampleDiscount && selectedCatalog.pricing ? (
              <p className="text-sm font-medium text-emerald-800">
                With sample discount: {formatPricingRange(selectedCatalog.pricing, true)}
              </p>
            ) : null}
            {discountNote ? <p className="text-xs text-violet-800">{discountNote}</p> : null}
            {selectedCatalog.pricing?.note && !stripeCheckout ? (
              <p className="text-xs text-slate-500">{selectedCatalog.pricing.note}</p>
            ) : (
              <p className="text-xs text-slate-500">{billingNote}</p>
            )}
            {stripeCheckout && quotedCents ? (
              <p className="text-sm font-medium text-emerald-800">
                Checkout total: {formatUsdFromCents(quotedCents)}
                {applySampleDiscount && sampleEligible ? " (sample discount applied)" : ""}
              </p>
            ) : null}
            {!isPhase0LaunchSku(selectedCatalog.id) ? (
              <p className="text-xs text-amber-800">
                Coming soon for external clients — available for internal testing.
              </p>
            ) : null}
          </div>
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
        <h2 className="text-sm font-semibold text-slate-900">3. Facts for drafting</h2>
        <IntakeGuidancePanel
          deliverableId={deliverableId}
          deliverableName={deliverableType}
          caseType={activeCaseType}
          structuredFacts={structuredFacts}
          ocrPrefillCount={ocrPrefillCount}
        />
        <p className="text-xs text-slate-500">
          Answer the practice-area questions first — they flow into the associate&apos;s draft prompt automatically.
        </p>
        <PracticeAreaFactGuide
          mode="intake"
          caseType={activeCaseType}
          deliverableId={deliverableId === CUSTOM_OPTION ? undefined : deliverableId}
          freeformFacts={facts}
          onFreeformChange={setFacts}
          onChange={setStructuredFacts}
          compact
        />
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
        {sampleEligible ? (
          <div className="rounded-md border border-violet-100 bg-violet-50/50 p-3 space-y-2">
            <label className="flex items-start gap-2 text-sm text-slate-800">
              <input
                type="checkbox"
                className="mt-1"
                checked={applySampleDiscount}
                onChange={(e) => setApplySampleDiscount(e.target.checked)}
              />
              <span>
                Apply sample discount — upload a prior brief, motion, or letter in your firm&apos;s style
              </span>
            </label>
            {applySampleDiscount ? (
              <label className="block text-sm">
                <span className="text-slate-700">Sample prior work</span>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  className="mt-1 w-full text-sm"
                  onChange={(e) => setSampleFile(e.target.files?.[0] ?? null)}
                />
              </label>
            ) : null}
            {fieldErrors.sample ? <p className="text-sm text-rose-700">{fieldErrors.sample}</p> : null}
          </div>
        ) : null}
        {files.length > 0 ? <TierZeroBanner approved={manualApproved} onApprovedChange={setManualApproved} /> : null}
        <input
          type="file"
          multiple
          accept=".pdf,.png,.jpg,.jpeg,.tif,.tiff,.txt,.md"
          className="w-full text-sm"
          onChange={(e) => void onFilesSelected(Array.from(e.target.files ?? []))}
        />
        {extractingOcr ? (
          <p className="text-xs text-sky-800">Strong Reader extracting facts from attachment…</p>
        ) : null}
        {fieldErrors.files ? <p className="text-sm text-rose-700">{fieldErrors.files}</p> : null}
        <UploadProgressTable items={uploadQueue} />
      </section>

      <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">5. Limited-scope acknowledgment</h2>
        <p className="text-sm leading-relaxed text-slate-700">{disclaimerBody}</p>
        <label className="flex items-start gap-2 text-sm text-slate-800">
          <input
            type="checkbox"
            className="mt-1"
            checked={disclaimerAcknowledged}
            onChange={(e) => setDisclaimerAcknowledged(e.target.checked)}
          />
          <span>{disclaimerCheckbox}</span>
        </label>
        {fieldErrors.disclaimer ? <p className="text-sm text-rose-700">{fieldErrors.disclaimer}</p> : null}
      </section>

      {formError ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{formError}</p>
      ) : null}

      <div className="flex justify-end gap-2">
        <button type="button" className={btnSecondary} onClick={() => router.back()} disabled={busy}>
          Cancel
        </button>
        <button type="submit" className={`${btnPrimary} px-4 py-2`} disabled={busy || extractingOcr}>
          {busy ? "Submitting…" : "Submit assignment"}
        </button>
      </div>
    </form>

      {matterMode === "existing" && existingMatterId ? (
        <IntakeContextSidebar
          matterId={existingMatterId}
          caseType={activeCaseType}
          deliverableId={deliverableId === CUSTOM_OPTION ? undefined : deliverableId}
          onApplyAssessmentFacts={applyOcrMerge}
          onApplySavedFacts={applySavedFacts}
        />
      ) : null}
    </div>
  );
}
