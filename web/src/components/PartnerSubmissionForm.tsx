"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useToast } from "@/components/Toast";
import { FirmMemoryPrompt } from "@/components/FirmMemoryPrompt";
import { PracticeAreaFactGuide } from "@/components/PracticeAreaFactGuide";
import {
  buildIntakeDisclaimerBody,
  intakeDisclaimerCheckboxLabel,
} from "@/lib/intake-disclaimer";
import {
  DELIVERABLE_CATALOG,
  billingNoteForPartnerFirm,
  deliverableById,
  formatCatalogQuote,
  isPhase0LaunchSku,
  PHASE0_LAUNCH_SKU_IDS,
} from "@/lib/deliverable-catalog";
import {
  isDraftingFactsCompleteEnough,
  mergeFactsForDispatch,
  type DraftingFactsPayload,
} from "@/lib/practice-area-facts";
import type { AssignmentTier } from "@/lib/types";
import { btnPrimary, btnSecondary } from "@/lib/ui-classes";

const PRIORITIES = ["Urgent", "High", "Medium", "Low"];
const MIN_FACTS_LENGTH = 20;

type Props = {
  initialEmail?: string;
  initialDeliverableId?: string;
};

export function PartnerSubmissionForm({ initialEmail = "", initialDeliverableId }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const [partnerEmail, setPartnerEmail] = useState(initialEmail);
  const [partnerFirmName, setPartnerFirmName] = useState("");
  const [partnerAttorneyName, setPartnerAttorneyName] = useState("");
  const [matterTitle, setMatterTitle] = useState("");
  const [caseType, setCaseType] = useState("Immigration - Asylum");
  const [country, setCountry] = useState("");

  const initialCatalogHit = initialDeliverableId ? deliverableById(initialDeliverableId) : undefined;
  const [deliverableId, setDeliverableId] = useState(
    initialCatalogHit ? initialCatalogHit.id : PHASE0_LAUNCH_SKU_IDS[0],
  );

  const [facts, setFacts] = useState("");
  const [structuredFacts, setStructuredFacts] = useState<DraftingFactsPayload | null>(null);
  const [priority, setPriority] = useState("Medium");
  const [dueDate, setDueDate] = useState("");
  const [disclaimerAcknowledged, setDisclaimerAcknowledged] = useState(false);

  const [busy, setBusy] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submittedMatterId, setSubmittedMatterId] = useState<string | null>(null);

  const selectedCatalog = useMemo(() => deliverableById(deliverableId), [deliverableId]);
  const deliverableType = selectedCatalog?.name ?? "";
  const tier: AssignmentTier = selectedCatalog?.tier ?? "Template";

  const disclaimerContext = useMemo(
    () => ({ caseType, country: country || undefined }),
    [caseType, country],
  );
  const disclaimerBody = useMemo(() => buildIntakeDisclaimerBody(disclaimerContext), [disclaimerContext]);
  const disclaimerCheckbox = useMemo(
    () => intakeDisclaimerCheckboxLabel(disclaimerContext),
    [disclaimerContext],
  );
  const mergedFactsPreview = useMemo(
    () => mergeFactsForDispatch(structuredFacts, facts),
    [structuredFacts, facts],
  );
  const billingNote = billingNoteForPartnerFirm();

  useEffect(() => {
    if (searchParams.get("payment") === "success") {
      showToast("Payment received — RMV will begin work on your deliverable.", "success");
    } else if (searchParams.get("payment") === "cancelled") {
      showToast("Checkout cancelled — your assignment is saved; RMV will follow up on payment.", "error");
    }
  }, [searchParams, showToast]);

  function validate(): Record<string, string> {
    const errors: Record<string, string> = {};
    if (!partnerEmail.trim() || !partnerEmail.includes("@")) {
      errors.email = "Enter your firm email address.";
    }
    if (!matterTitle.trim()) {
      errors.matter = "Give the matter a short title (no client names).";
    }
    if (!selectedCatalog) {
      errors.deliverable = "Choose a deliverable from the catalog.";
    }
    if (!isDraftingFactsCompleteEnough(structuredFacts, facts, MIN_FACTS_LENGTH)) {
      errors.facts =
        "Complete the guided checklist (at least 3 key items) or add a freeform summary (20+ characters).";
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
      const resp = await fetch("/api/partner/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partnerEmail: partnerEmail.trim(),
          partnerFirmName: partnerFirmName.trim() || undefined,
          partnerAttorneyName: partnerAttorneyName.trim() || undefined,
          matterTitle: matterTitle.trim(),
          caseType,
          country: country.trim() || undefined,
          deliverableType,
          deliverableCatalogId: selectedCatalog?.id,
          tier,
          facts: mergedFactsPreview,
          structuredFacts: structuredFacts ?? undefined,
          priority,
          dueDate: dueDate || null,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setFormError(data.error || `Could not submit (${resp.status}).`);
        showToast(data.error || "Could not submit assignment.", "error");
        return;
      }

      const matterId = data.matterId as string;
      const inboxItemId = (data.inboxItem as { id?: string })?.id;
      setSubmittedMatterId(matterId);

      if (data.requiresPayment && inboxItemId) {
        const checkoutResp = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ inboxItemId }),
        });
        const checkoutData = await checkoutResp.json();
        if (checkoutResp.ok && checkoutData.checkoutUrl) {
          window.location.href = checkoutData.checkoutUrl as string;
          return;
        }
        showToast(
          checkoutData.error ||
            "Assignment saved — RMV will send an invoice. Checkout unavailable.",
          "error",
        );
      } else {
        showToast(
          `Overflow work submitted (${matterId}). RMV will invoice your firm and begin work.`,
          "success",
        );
      }

      router.refresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setBusy(false);
    }
  }

  if (submittedMatterId && searchParams.get("payment") !== "success") {
    return (
      <div className="mx-auto max-w-lg space-y-4 rounded-lg border border-emerald-200 bg-emerald-50/60 p-6 text-center">
        <h2 className="text-lg font-semibold text-emerald-950">Submission received</h2>
        <p className="text-sm text-emerald-900">
          Reference: <strong>{submittedMatterId}</strong>. Recover My Value will confirm scope and invoice your firm.
          You will receive updates at <strong>{partnerEmail}</strong>.
        </p>
        <Link href="/partner/submit" className={btnSecondary}>
          Submit another assignment
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="mx-auto max-w-3xl space-y-6">
      <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Your firm</h2>
        <p className="text-xs text-slate-500">
          Recover My Value provides verified overflow counsel — you retain filing and client responsibility.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm sm:col-span-2">
            <span className="text-slate-700">Firm email *</span>
            <input
              type="email"
              required
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              value={partnerEmail}
              onChange={(e) => setPartnerEmail(e.target.value)}
              placeholder="partner@yourfirm.com"
            />
            {fieldErrors.email ? <p className="mt-1 text-sm text-rose-700">{fieldErrors.email}</p> : null}
          </label>
          <label className="block text-sm">
            <span className="text-slate-700">Firm name</span>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              value={partnerFirmName}
              onChange={(e) => setPartnerFirmName(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-700">Your name</span>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              value={partnerAttorneyName}
              onChange={(e) => setPartnerAttorneyName(e.target.value)}
            />
          </label>
        </div>
      </section>

      <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Matter summary</h2>
        <label className="block text-sm">
          <span className="text-slate-700">Matter title *</span>
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            value={matterTitle}
            onChange={(e) => setMatterTitle(e.target.value)}
            placeholder="AOS waiver — qualifying relative hardship"
          />
          {fieldErrors.matter ? <p className="mt-1 text-sm text-rose-700">{fieldErrors.matter}</p> : null}
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="text-slate-700">Practice area</span>
            <select
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              value={caseType}
              onChange={(e) => setCaseType(e.target.value)}
            >
              <option>Immigration - Asylum</option>
              <option>Immigration - Family</option>
              <option>Immigration - Other</option>
              <option>Personal Injury</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-slate-700">Country (optional)</span>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            />
          </label>
        </div>
      </section>

      <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold text-slate-900">Deliverable</h2>
          <FirmMemoryPrompt compact />
        </div>
        <label className="block text-sm">
          <span className="text-slate-700">Choose a deliverable *</span>
          <select
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            value={deliverableId}
            onChange={(e) => setDeliverableId(e.target.value)}
          >
            {DELIVERABLE_CATALOG.filter((d) => isPhase0LaunchSku(d.id)).map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} — {formatCatalogQuote(d)}
              </option>
            ))}
          </select>
        </label>
        {selectedCatalog ? (
          <div className="space-y-1">
            <p className="text-xs text-slate-500">{selectedCatalog.description}</p>
            <p className="text-sm font-medium text-slate-800">{formatCatalogQuote(selectedCatalog)}</p>
            <p className="text-xs text-slate-500">{selectedCatalog.pricing?.note ?? billingNote}</p>
          </div>
        ) : null}
        {fieldErrors.deliverable ? <p className="text-sm text-rose-700">{fieldErrors.deliverable}</p> : null}
      </section>

      <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Facts for drafting</h2>
        <PracticeAreaFactGuide
          mode="intake"
          caseType={caseType}
          deliverableId={deliverableId}
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
        <h2 className="text-sm font-semibold text-slate-900">Limited-scope acknowledgment</h2>
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

      <div className="flex justify-end">
        <button type="submit" className={`${btnPrimary} px-4 py-2`} disabled={busy}>
          {busy ? "Submitting…" : "Submit overflow work to RMV"}
        </button>
      </div>
    </form>
  );
}
