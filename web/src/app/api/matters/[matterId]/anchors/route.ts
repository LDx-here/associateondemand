import { NextResponse } from "next/server";

import { getAnchorIntakeForMatter, saveAnchorIntakeForMatter } from "@/lib/data-store";
import type { AnchorIntake } from "@/lib/five-anchors";

type Ctx = { params: Promise<{ matterId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { matterId } = await ctx.params;
  const intake = await getAnchorIntakeForMatter(matterId);
  return NextResponse.json({ intake });
}

export async function PUT(req: Request, ctx: Ctx) {
  const { matterId } = await ctx.params;
  let body: { intake?: AnchorIntake };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (!body.intake || typeof body.intake.answers !== "object" || body.intake.answers === null) {
    return NextResponse.json({ error: "intake.answers is required." }, { status: 400 });
  }
  try {
    const saved = await saveAnchorIntakeForMatter(matterId, body.intake);
    return NextResponse.json({ intake: saved });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not save the intake.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
