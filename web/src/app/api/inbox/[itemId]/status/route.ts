import { NextResponse } from "next/server";

import { updateInboxItemStatus } from "@/lib/data-store";

type Ctx = { params: Promise<{ itemId: string }> };

/**
 * Assignment lifecycle transitions (docs/runbooks/autonomous-agent-pass.md
 * priority #2): Submitted -> In Progress -> Ready for Review -> Approved
 * or Returned. Unlike `/resolve` (legacy agent-flag flow, live-Airtable
 * only), this endpoint works in demo mode too so the assignment workflow
 * is testable without an AIRTABLE_PAT.
 */
const ALLOWED_STATUSES = [
  "Submitted",
  "In Progress",
  "Ready for Review",
  "Returned",
  "Approved",
  "Resolved",
  "Dismissed",
];

export async function PATCH(req: Request, ctx: Ctx) {
  const { itemId } = await ctx.params;
  let body: { status?: string; note?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const status = String(body.status ?? "").trim();
  if (!ALLOWED_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: `status must be one of: ${ALLOWED_STATUSES.join(", ")}` },
      { status: 400 },
    );
  }
  const note = body.note?.trim();
  try {
    const item = await updateInboxItemStatus(itemId, status, note || undefined);
    if (!item) {
      return NextResponse.json({ error: "Inbox item not found" }, { status: 404 });
    }
    return NextResponse.json({ item });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Update failed" },
      { status: 502 },
    );
  }
}
