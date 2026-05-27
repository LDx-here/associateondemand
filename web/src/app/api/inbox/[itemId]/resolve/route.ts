import { NextResponse } from "next/server";

import { resolveInboxItemInAirtable } from "@/lib/airtable/queries";
import { useDemoMode } from "@/lib/data-store";

type Ctx = { params: Promise<{ itemId: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { itemId } = await ctx.params;
  if (useDemoMode()) {
    return NextResponse.json(
      { error: "Demo mode — PM Inbox resolution requires a live Airtable connection." },
      { status: 503 },
    );
  }
  let body: { resolution?: string; status?: "Resolved" | "Dismissed" };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const resolution = (body.resolution ?? "").trim();
  if (!resolution) {
    return NextResponse.json({ error: "resolution is required" }, { status: 400 });
  }
  const status: "Resolved" | "Dismissed" =
    body.status === "Dismissed" ? "Dismissed" : "Resolved";
  try {
    const item = await resolveInboxItemInAirtable(itemId, resolution, status);
    return NextResponse.json({ item });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Resolve failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
