import { NextResponse } from "next/server";

import {
  advanceMatterStageWithTasks,
  forceMatterLifecycleStage,
  getMatterByCode,
  updateMatterFields,
} from "@/lib/data-store";
import { isClosedMatterStatus } from "@/lib/matter-status";

type Ctx = { params: Promise<{ matterId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { matterId } = await ctx.params;
  const matter = await getMatterByCode(matterId);
  if (!matter) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ matter });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const { matterId } = await ctx.params;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const matter = await updateMatterFields(matterId, {
    title: typeof body.title === "string" ? body.title : undefined,
    caseType: typeof body.caseType === "string" ? body.caseType : undefined,
    country: typeof body.country === "string" ? body.country : undefined,
    posture: typeof body.posture === "string" ? body.posture : undefined,
    court: typeof body.court === "string" ? body.court : undefined,
    judge: typeof body.judge === "string" ? body.judge : undefined,
    status: typeof body.status === "string" ? body.status : undefined,
    summary: typeof body.summary === "string" ? body.summary : undefined,
    nextDeadline: body.nextDeadline === null ? null : typeof body.nextDeadline === "string" ? body.nextDeadline : undefined,
    nextHearing: typeof body.nextHearing === "string" ? body.nextHearing : undefined,
    assignedAttorney: typeof body.assignedAttorney === "string" ? body.assignedAttorney : undefined,
  });

  if (!matter) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Close/reopen also drives lifecycle stage — closing overrides any stage;
  // reopening resumes work (Closed → Active is always a legal transition).
  if (typeof body.status === "string") {
    try {
      if (isClosedMatterStatus(body.status)) {
        await forceMatterLifecycleStage(matterId, "Closed");
        matter.lifecycleStage = "Closed";
      } else {
        const { matter: advanced } = await advanceMatterStageWithTasks(matterId, "Active");
        matter.lifecycleStage = advanced.lifecycleStage;
      }
    } catch (err) {
      console.warn(`[AOD] lifecycle stage sync on status change failed for ${matterId}:`, err);
    }
  }

  return NextResponse.json({ matter });
}
