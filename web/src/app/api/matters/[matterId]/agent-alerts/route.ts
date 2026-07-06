import { NextResponse } from "next/server";

import { listAgentAlertsForMatter } from "@/lib/data-store";

type Ctx = { params: Promise<{ matterId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { matterId } = await ctx.params;
  const alerts = await listAgentAlertsForMatter(matterId);
  return NextResponse.json({ alerts });
}
