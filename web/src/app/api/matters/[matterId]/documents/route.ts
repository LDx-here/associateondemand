import { NextResponse } from "next/server";

import { listDocumentsForMatter } from "@/lib/data-store";

type Ctx = { params: Promise<{ matterId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { matterId } = await ctx.params;
  return NextResponse.json({ documents: await listDocumentsForMatter(matterId) });
}
