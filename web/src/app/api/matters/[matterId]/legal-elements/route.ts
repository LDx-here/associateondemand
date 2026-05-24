import { NextResponse } from "next/server";

import { listLegalElements, updateLegalElementRow } from "@/lib/data-store";

type Ctx = { params: Promise<{ matterId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { matterId } = await ctx.params;
  return NextResponse.json({ rows: await listLegalElements(matterId) });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const body = (await req.json()) as {
    id: string;
    assessment?: string;
    keyGap?: string;
    nextAction?: string;
  };
  const row = await updateLegalElementRow(body.id, body);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ row });
}
