import { NextResponse } from "next/server";

import { getMatterByCode } from "@/lib/data-store";

type Ctx = { params: Promise<{ matterId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { matterId } = await ctx.params;
  const matter = await getMatterByCode(matterId);
  if (!matter) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ matter });
}
