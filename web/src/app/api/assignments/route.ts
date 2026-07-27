import { NextResponse } from "next/server";

import { requiresPaymentBeforeDispatch } from "@/lib/assignment-payment";
import { dispatchAssignmentToPm } from "@/lib/assignment-dispatch";
import {
  autoAdvanceMatterLifecycleStage,
  createAssignment,
  createMatter,
  createNoteForMatter,
  createTaskForMatter,
  getMatterByCode,
  saveDraftingFactsForMatter,
  seedInitialLifecycleTasks,
  updateAssignmentStatus,
  isDemoMode,
} from "@/lib/data-store";
import { mergeFactsForDispatch, type DraftingFactsPayload } from "@/lib/practice-area-facts";
import { notifyNewAssignment } from "@/lib/notify-assignment";
import { quoteAssignmentAmount } from "@/lib/stripe-pricing";
import type { AssignmentTier } from "@/lib/types";

const VALID_TIERS: AssignmentTier[] = ["Template", "Custom", "Research"];
const MAX_FACTS = 6000;

type AssignmentRequest = {
  matterId?: string;
  newMatter?: { title?: string; caseType?: string; country?: string };
  deliverableType?: string;
  deliverableCatalogId?: string;
  tier?: string;
  facts?: string;
  structuredFacts?: DraftingFactsPayload;
  priority?: string;
  dueDate?: string | null;
  sampleDiscountEligible?: boolean;
  discountApplied?: boolean;
  opposingParty?: string;
  opposingCounsel?: string;
  conflictReviewRequired?: boolean;
};

/**
 * Assignment intake: creates/links matter, task, note, and PM Inbox row, then dispatches PM work.
 * Partner firms are invoiced off-platform — RMV operator intake never blocks on Stripe Checkout.
 */
export async function POST(req: Request) {
  let body: AssignmentRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const deliverableType = (body.deliverableType ?? "").trim();
  const deliverableCatalogId = (body.deliverableCatalogId ?? "").trim() || undefined;
  const tier = body.tier as AssignmentTier | undefined;
  const rawFacts = (body.facts ?? "").trim();
  const structuredFacts = body.structuredFacts;
  const facts = rawFacts || mergeFactsForDispatch(structuredFacts, "");
  const discountApplied = Boolean(body.discountApplied);
  const opposingParty = (body.opposingParty ?? "").trim() || undefined;
  const opposingCounsel = (body.opposingCounsel ?? "").trim() || undefined;
  const conflictReviewRequired = Boolean(body.conflictReviewRequired);

  const errors: string[] = [];
  if (!deliverableType) errors.push("Deliverable type is required.");
  if (!tier || !VALID_TIERS.includes(tier)) {
    errors.push(`Tier must be one of: ${VALID_TIERS.join(", ")}.`);
  }
  if (!facts) errors.push("Facts are required so the associate can start work.");
  if (facts.length > MAX_FACTS) errors.push(`Facts must be under ${MAX_FACTS} characters.`);

  const wantsNewMatter = Boolean(body.newMatter?.title?.trim());
  const existingMatterId = (body.matterId ?? "").trim();
  if (!wantsNewMatter && !existingMatterId) {
    errors.push("Choose an existing matter or provide a new matter title.");
  }

  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join(" ") }, { status: 400 });
  }

  const quote =
    deliverableCatalogId != null
      ? quoteAssignmentAmount({ deliverableCatalogId, discountApplied })
      : null;

  try {
    let matterId: string;
    if (wantsNewMatter) {
      const matter = await createMatter({
        title: body.newMatter!.title!.trim(),
        caseType: body.newMatter!.caseType?.trim() || "Immigration - Other",
        country: body.newMatter!.country?.trim() || undefined,
        summary: `${deliverableType} assignment intake (${tier} tier).`,
      });
      matterId = matter.matterId;
      await seedInitialLifecycleTasks(matterId, matter.caseType);
    } else {
      const matter = await getMatterByCode(existingMatterId);
      if (!matter) {
        return NextResponse.json({ error: `Matter not found: ${existingMatterId}` }, { status: 404 });
      }
      matterId = matter.matterId;
    }

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
      `Assignment intake — ${deliverableType} (${tier} tier). Facts: ${facts.slice(0, 4000)}`,
      "Attorney",
    );

    if (opposingParty) {
      const conflictNote = conflictReviewRequired
        ? `Manual conflict review required — opposing party: ${opposingParty}${opposingCounsel ? `; opposing counsel: ${opposingCounsel}` : ""}.`
        : `Opposing party noted: ${opposingParty}${opposingCounsel ? `; opposing counsel: ${opposingCounsel}` : ""} (conflict check clear).`;
      await createNoteForMatter(matterId, conflictNote, "System");
    }

    let inboxItem = await createAssignment({
      matterId,
      deliverableType,
      tier: tier as AssignmentTier,
      facts,
      priority,
      dueDate,
      submittedBy: "La'Dajia Ferguson",
      sampleDiscountEligible: Boolean(body.sampleDiscountEligible),
      discountApplied,
      paymentStatus: "invoice",
      amountCents: quote?.amountCents,
      deliverableCatalogId,
      conflictReviewRequired,
      opposingParty,
      opposingCounsel,
      source: "internal",
    });

    let dispatch = null as Awaited<ReturnType<typeof dispatchAssignmentToPm>> | null;
    let notify = null as Awaited<ReturnType<typeof notifyNewAssignment>> | null;

    if (!isDemoMode()) {
      dispatch = await dispatchAssignmentToPm(
        matterId,
        deliverableType,
        tier as AssignmentTier,
        facts,
        deliverableCatalogId,
      );
      if (dispatch.started) {
        const advanced = await updateAssignmentStatus(inboxItem.id, "In progress", {
          note: `Auto-dispatched to ${dispatch.agent ?? "PM orchestrator"}.`,
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
      notify = await notifyNewAssignment({
        matterId,
        deliverableType,
        tier: tier as AssignmentTier,
        inboxItemId: inboxItem.id,
      });
    }

    return NextResponse.json(
      {
        matterId,
        inboxItem,
        dispatch,
        notify,
        requiresPayment: requiresPaymentBeforeDispatch(),
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
