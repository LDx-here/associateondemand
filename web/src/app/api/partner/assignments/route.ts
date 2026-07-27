import { NextResponse } from "next/server";

import { dispatchAssignmentToPm } from "@/lib/assignment-dispatch";
import {
  autoAdvanceMatterLifecycleStage,
  createAssignment,
  createMatter,
  createNoteForMatter,
  createTaskForMatter,
  saveDraftingFactsForMatter,
  seedInitialLifecycleTasks,
  updateAssignmentStatus,
  isDemoMode,
} from "@/lib/data-store";
import { mergeFactsForDispatch, type DraftingFactsPayload } from "@/lib/practice-area-facts";
import { notifyNewAssignment } from "@/lib/notify-assignment";
import { requiresPartnerPaymentBeforeDispatch } from "@/lib/partner-submission";
import { quoteAssignmentAmount } from "@/lib/stripe-pricing";
import type { AssignmentTier } from "@/lib/types";

const VALID_TIERS: AssignmentTier[] = ["Template", "Custom", "Research"];
const MAX_FACTS = 6000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type PartnerAssignmentRequest = {
  partnerEmail?: string;
  partnerFirmName?: string;
  partnerAttorneyName?: string;
  matterTitle?: string;
  caseType?: string;
  country?: string;
  deliverableType?: string;
  deliverableCatalogId?: string;
  tier?: string;
  facts?: string;
  structuredFacts?: DraftingFactsPayload;
  priority?: string;
  dueDate?: string | null;
  sampleDiscountEligible?: boolean;
  discountApplied?: boolean;
};

/**
 * External partner submission funnel — partner firms submit overflow work to RMV.
 * When STRIPE_CHECKOUT_ENABLED=true, payment is required before PM dispatch.
 */
export async function POST(req: Request) {
  let body: PartnerAssignmentRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const partnerEmail = (body.partnerEmail ?? "").trim().toLowerCase();
  const partnerFirmName = (body.partnerFirmName ?? "").trim() || undefined;
  const partnerAttorneyName = (body.partnerAttorneyName ?? "").trim() || undefined;
  const matterTitle = (body.matterTitle ?? "").trim();
  const deliverableType = (body.deliverableType ?? "").trim();
  const deliverableCatalogId = (body.deliverableCatalogId ?? "").trim() || undefined;
  const tier = body.tier as AssignmentTier | undefined;
  const rawFacts = (body.facts ?? "").trim();
  const structuredFacts = body.structuredFacts;
  const facts = rawFacts || mergeFactsForDispatch(structuredFacts, "");
  const discountApplied = Boolean(body.discountApplied);
  const payBeforeDispatch = requiresPartnerPaymentBeforeDispatch();

  const errors: string[] = [];
  if (!partnerEmail || !EMAIL_RE.test(partnerEmail)) {
    errors.push("A valid firm email is required.");
  }
  if (!matterTitle) errors.push("Matter title is required (short description — no client names).");
  if (!deliverableType) errors.push("Deliverable type is required.");
  if (!tier || !VALID_TIERS.includes(tier)) {
    errors.push(`Tier must be one of: ${VALID_TIERS.join(", ")}.`);
  }
  if (!facts) errors.push("Facts are required so RMV can start work.");
  if (facts.length > MAX_FACTS) errors.push(`Facts must be under ${MAX_FACTS} characters.`);

  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join(" ") }, { status: 400 });
  }

  const quote =
    deliverableCatalogId != null
      ? quoteAssignmentAmount({ deliverableCatalogId, discountApplied })
      : null;

  const submittedBy =
    partnerAttorneyName && partnerFirmName
      ? `${partnerAttorneyName} (${partnerFirmName})`
      : partnerAttorneyName || partnerFirmName || partnerEmail;

  try {
    const matter = await createMatter({
      title: matterTitle,
      caseType: body.caseType?.trim() || "Immigration - Other",
      country: body.country?.trim() || undefined,
      summary: `${deliverableType} — partner overflow submission (${tier} tier).`,
    });
    const matterId = matter.matterId;
    await seedInitialLifecycleTasks(matterId, matter.caseType);

    const priority = body.priority?.trim() || "Medium";
    const dueDate = body.dueDate?.trim() || null;

    await createTaskForMatter(matterId, {
      description: `${tier} tier: ${deliverableType}`,
      dueDate,
      priority,
      isFilingDeadline: false,
    });

    // Real work is starting on this matter — nudge Intake → Active (no-op if already past Intake).
    await autoAdvanceMatterLifecycleStage(matterId, "Intake", "Active");

    if (structuredFacts?.v === 1) {
      await saveDraftingFactsForMatter(matterId, structuredFacts);
    }

    await createNoteForMatter(
      matterId,
      `Partner overflow submission — ${deliverableType} (${tier} tier) from ${submittedBy}. Facts: ${facts.slice(0, 4000)}`,
      "Attorney",
    );

    let inboxItem = await createAssignment({
      matterId,
      deliverableType,
      tier: tier as AssignmentTier,
      facts,
      priority,
      dueDate,
      submittedBy,
      sampleDiscountEligible: Boolean(body.sampleDiscountEligible),
      discountApplied,
      paymentStatus: payBeforeDispatch ? "pending" : "invoice",
      amountCents: quote?.amountCents,
      deliverableCatalogId,
      source: "partner",
      partnerEmail,
      partnerFirmName,
    });

    let dispatch = null as Awaited<ReturnType<typeof dispatchAssignmentToPm>> | null;
    let notify = null as Awaited<ReturnType<typeof notifyNewAssignment>> | null;

    notify = await notifyNewAssignment({
      matterId,
      deliverableType,
      tier: tier as AssignmentTier,
      inboxItemId: inboxItem.id,
      source: "partner",
      partnerEmail,
      partnerFirmName,
    });

    if (!payBeforeDispatch && !isDemoMode()) {
      dispatch = await dispatchAssignmentToPm(matterId, deliverableType, tier as AssignmentTier, facts, deliverableCatalogId);
      if (dispatch.started) {
        const advanced = await updateAssignmentStatus(inboxItem.id, "In progress", {
          note: `Auto-dispatched to ${dispatch.agent ?? "PM orchestrator"} after partner submission.`,
          by: "System",
        });
        if (advanced) inboxItem = advanced;

        if (dispatch.deliverableReady) {
          const lintNote =
            dispatch.documentLintPassed === false
              ? " Document linter flagged issues — fix before export."
              : "";
          const reviewed = await updateAssignmentStatus(inboxItem.id, "Ready for review", {
            note: `Associate draft ready for attorney sign-off (${dispatch.agent ?? "agent"}).${lintNote}`,
            by: "System",
          });
          if (reviewed) inboxItem = reviewed;
        }
      }
    }

    return NextResponse.json(
      {
        matterId,
        inboxItem,
        dispatch,
        notify,
        requiresPayment: payBeforeDispatch,
        quote: quote
          ? {
              amountCents: quote.amountCents,
              amountUsd: quote.amountUsd,
              discountApplied: quote.discountApplied,
            }
          : null,
      },
      { status: 201 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not submit assignment.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
