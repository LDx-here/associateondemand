import { NextResponse } from "next/server";

import { dispatchAssignmentToPm } from "@/lib/assignment-dispatch";
import {
  createAssignment,
  createMatter,
  createNoteForMatter,
  createTaskForMatter,
  getMatterByCode,
  updateAssignmentStatus,
  useDemoMode,
} from "@/lib/data-store";
import { notifyNewAssignment } from "@/lib/notify-assignment";
import type { AssignmentTier } from "@/lib/types";

const VALID_TIERS: AssignmentTier[] = ["Template", "Custom", "Research"];
const MAX_FACTS = 6000;

type AssignmentRequest = {
  matterId?: string;
  newMatter?: { title?: string; caseType?: string; country?: string };
  deliverableType?: string;
  tier?: string;
  facts?: string;
  priority?: string;
  dueDate?: string | null;
};

/**
 * Assignment intake (BUILD_SPEC marketplace pass §1): creates/links a
 * matter, records a task + facts note, and opens a PM Inbox review card
 * in the "Submitted" lane. Mirrors the eImmigration import pattern of
 * validating client-side, then doing one authoritative server write.
 */
export async function POST(req: Request) {
  let body: AssignmentRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const deliverableType = (body.deliverableType ?? "").trim();
  const tier = body.tier as AssignmentTier | undefined;
  const facts = (body.facts ?? "").trim();

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

    await createNoteForMatter(
      matterId,
      `Assignment intake — ${deliverableType} (${tier} tier). Facts: ${facts}`,
      "Attorney",
    );

    let inboxItem = await createAssignment({
      matterId,
      deliverableType,
      tier: tier as AssignmentTier,
      facts,
      priority,
      dueDate,
      submittedBy: "La'Dajia Ferguson",
    });

    let dispatch = null as Awaited<ReturnType<typeof dispatchAssignmentToPm>> | null;
    let notify = null as Awaited<ReturnType<typeof notifyNewAssignment>> | null;

    if (!useDemoMode()) {
      dispatch = await dispatchAssignmentToPm(matterId, deliverableType, tier as AssignmentTier, facts);
      if (dispatch.started) {
        const advanced = await updateAssignmentStatus(inboxItem.id, "In progress", {
          note: `Auto-dispatched to ${dispatch.agent ?? "PM orchestrator"}.`,
          by: "System",
        });
        if (advanced) inboxItem = advanced;
      }
      notify = await notifyNewAssignment({
        matterId,
        deliverableType,
        tier: tier as AssignmentTier,
        inboxItemId: inboxItem.id,
      });
    }

    return NextResponse.json({ matterId, inboxItem, dispatch, notify }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not submit assignment.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
