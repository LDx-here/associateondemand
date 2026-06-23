import { NextResponse } from "next/server";

import { updateMatterDeadline } from "@/lib/data-store";

type Ctx = { params: Promise<{ matterId: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const { matterId } = await ctx.params;
  const body = (await req.json()) as { nextDeadline?: string | null };
  const matter = await updateMatterDeadline(matterId, body.nextDeadline ?? null);
  if (!matter) {
    return NextResponse.json({ error: "Matter not found" }, { status: 404 });
  }
  return NextResponse.json({ matter });
}
