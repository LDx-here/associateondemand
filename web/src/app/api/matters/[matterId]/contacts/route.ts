import { NextResponse } from "next/server";

import { listContactsForMatter, isDemoMode } from "@/lib/data-store";

type Ctx = { params: Promise<{ matterId: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const { matterId } = await ctx.params;
  const contacts = await listContactsForMatter(matterId);
  return NextResponse.json({ contacts, demoMode: isDemoMode() });
}
