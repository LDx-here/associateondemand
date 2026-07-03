import { NextResponse } from "next/server";

import { updateAssignmentStatus } from "@/lib/data-store";
import type { AssignmentStatus } from "@/lib/types";

const VALID_STATUSES: AssignmentStatus[] = [
  "Submitted",
  "In progress",
  "Ready for review",
  "Returned",
  "Approved",
];

type Ctx = { params: Promise<{ itemId: string }> };

/**
 * Assignment lifecycle transition (BUILD_SPEC marketplace pass): Submitted
 * -> In progress -> Ready for review -> Returned / Approved. Distinct from
 * `/api/inbox/[itemId]/resolve`, which handles legacy agent-flag escalations.
 */
export async function PATCH(req: Request, ctx: Ctx) {
  const { itemId } = await ctx.params;
  let body: { status?: string; note?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const status = body.status as AssignmentStatus | undefined;
  if (!status || !VALID_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: `status must be one of: ${VALID_STATUSES.join(", ")}` },
      { status: 400 },
    );
  }

  try {
    const item = await updateAssignmentStatus(itemId, status, {
      note: body.note,
      by: "La'Dajia Ferguson",
    });
    if (!item) {
      return NextResponse.json({ error: "Assignment not found." }, { status: 404 });
    }
    return NextResponse.json({ item });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not update assignment status.";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
