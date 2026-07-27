import { NextResponse } from "next/server";

import { autoAdvanceMatterLifecycleStage, markAssignmentDelivered } from "@/lib/data-store";

type Ctx = { params: Promise<{ itemId: string }> };

/** Explicit export event — marks approved assignment Delivered (matter stage chip). */
export async function POST(req: Request, ctx: Ctx) {
  const { itemId } = await ctx.params;
  let body: { exportKind?: string };
  try {
    body = await req.json().catch(() => ({}));
  } catch {
    body = {};
  }

  const item = await markAssignmentDelivered(itemId, {
    exportKind: body.exportKind?.trim() || "download",
    by: "Attorney",
  });

  if (!item) {
    return NextResponse.json(
      { error: "Assignment not found or not in Approved state." },
      { status: 409 },
    );
  }

  // A deliverable was exported — nudge the matter Active → Filed/Awaiting Decision.
  await autoAdvanceMatterLifecycleStage(item.matterId, "Active", "Filed/Awaiting Decision");

  return NextResponse.json({ item, deliveredAt: item.deliveredAt });
}
