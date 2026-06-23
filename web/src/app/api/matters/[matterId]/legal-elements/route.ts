import { NextResponse } from "next/server";

import { createLegalElement, listLegalElements, updateLegalElementRow } from "@/lib/data-store";

type Ctx = { params: Promise<{ matterId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { matterId } = await ctx.params;
  return NextResponse.json({ rows: await listLegalElements(matterId) });
}

export async function POST(req: Request, ctx: Ctx) {
  const { matterId } = await ctx.params;
  const body = (await req.json()) as { elementName?: string };
  const elementName = String(body.elementName ?? "").trim();
  if (!elementName) {
    return NextResponse.json({ error: "elementName is required" }, { status: 400 });
  }
  try {
    const row = await createLegalElement(matterId, elementName);
    return NextResponse.json({ row }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Create failed" },
      { status: 500 },
    );
  }
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
