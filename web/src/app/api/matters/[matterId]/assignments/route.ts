import { NextResponse } from "next/server";

import { listAssignmentsForMatter } from "@/lib/data-store";

type Ctx = { params: Promise<{ matterId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { matterId } = await ctx.params;
  const assignments = await listAssignmentsForMatter(matterId);
  return NextResponse.json({ assignments });
}
