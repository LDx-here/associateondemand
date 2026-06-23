import { NextResponse } from "next/server";

import { getCaseAssessment, saveCaseAssessment } from "@/lib/data-store";
import type { CaseAssessment } from "@/lib/types";

type Ctx = { params: Promise<{ matterId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { matterId } = await ctx.params;
  return NextResponse.json({ assessment: await getCaseAssessment(matterId) });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const { matterId } = await ctx.params;
  const body = (await req.json()) as CaseAssessment;
  const assessment = await saveCaseAssessment(matterId, { ...body, matterId });
  return NextResponse.json({ assessment });
}
