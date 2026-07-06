import { NextResponse } from "next/server";

import { getDraftingFactsForMatter, saveDraftingFactsForMatter } from "@/lib/data-store";
import type { DraftingFactsPayload } from "@/lib/practice-area-facts";

type Ctx = { params: Promise<{ matterId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { matterId } = await ctx.params;
  const facts = await getDraftingFactsForMatter(matterId);
  return NextResponse.json({ facts });
}

export async function PUT(req: Request, ctx: Ctx) {
  const { matterId } = await ctx.params;
  let body: { facts?: DraftingFactsPayload };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (!body.facts || body.facts.v !== 1) {
    return NextResponse.json({ error: "facts payload with v:1 is required." }, { status: 400 });
  }
  try {
    const saved = await saveDraftingFactsForMatter(matterId, body.facts);
    return NextResponse.json({ facts: saved });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not save drafting facts.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
