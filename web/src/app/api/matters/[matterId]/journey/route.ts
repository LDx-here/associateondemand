import { NextResponse } from "next/server";

import { getJourneyStateForMatter, saveJourneyStateForMatter } from "@/lib/data-store";
import { JOURNEY_BY_ID, type JourneyState } from "@/lib/case-journey";

type Ctx = { params: Promise<{ matterId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { matterId } = await ctx.params;
  const state = await getJourneyStateForMatter(matterId);
  return NextResponse.json({ state });
}

export async function PUT(req: Request, ctx: Ctx) {
  const { matterId } = await ctx.params;
  let body: { state?: JourneyState };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const state = body.state;
  const journey = state ? JOURNEY_BY_ID[state.journeyId] : undefined;
  if (!state || !journey) {
    return NextResponse.json({ error: "A known journeyId is required." }, { status: 400 });
  }
  if (!journey.steps.some((s) => s.id === state.currentStepId)) {
    return NextResponse.json(
      { error: `Unknown step "${state.currentStepId}" for ${journey.title}.` },
      { status: 400 },
    );
  }
  try {
    const saved = await saveJourneyStateForMatter(matterId, state);
    return NextResponse.json({ state: saved });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not save the journey.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
