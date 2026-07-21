import { NextResponse } from "next/server";

import { getProceduralTimelineForMatter, saveProceduralTimelineForMatter } from "@/lib/data-store";
import type { ProceduralTimelinePayload } from "@/lib/procedural-timeline";

type Ctx = { params: Promise<{ matterId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { matterId } = await ctx.params;
  const timeline = await getProceduralTimelineForMatter(matterId);
  return NextResponse.json({ timeline });
}

export async function PUT(req: Request, ctx: Ctx) {
  const { matterId } = await ctx.params;
  let body: { timeline?: ProceduralTimelinePayload };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (!body.timeline || body.timeline.v !== 1) {
    return NextResponse.json({ error: "timeline payload with v:1 is required." }, { status: 400 });
  }
  try {
    const saved = await saveProceduralTimelineForMatter(matterId, body.timeline);
    return NextResponse.json({ timeline: saved });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not save procedural timeline.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
