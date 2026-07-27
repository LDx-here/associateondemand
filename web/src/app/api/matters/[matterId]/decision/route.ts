import { NextResponse } from "next/server";

import { advanceMatterStageWithTasks, createNoteForMatter } from "@/lib/data-store";

type Ctx = { params: Promise<{ matterId: string }> };

const DECISION_OUTCOMES = [
  "Approved",
  "Denied",
  "RFE issued",
  "NOID issued",
  "Continued",
  "Other",
] as const;

/**
 * Record a decision on a Filed/Awaiting Decision matter — the one lifecycle
 * step with no automatic trigger (no system event observes "USCIS/court
 * decided"). Logs the outcome as a Note and advances Filed/Awaiting
 * Decision -> Resolution in one action.
 */
export async function POST(req: Request, ctx: Ctx) {
  const { matterId } = await ctx.params;
  let body: { outcome?: string; note?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const outcome = body.outcome?.trim();
  if (!outcome || !(DECISION_OUTCOMES as readonly string[]).includes(outcome)) {
    return NextResponse.json(
      { error: `outcome must be one of: ${DECISION_OUTCOMES.join(", ")}` },
      { status: 400 },
    );
  }
  const note = body.note?.trim().slice(0, 2000) ?? "";

  const content = note ? `Decision recorded: ${outcome}. ${note}` : `Decision recorded: ${outcome}.`;

  try {
    // Advance first — only log the note once the transition actually takes effect,
    // so a rejected (illegal-stage) call never leaves a misleading note behind.
    const { matter, tasksCreated } = await advanceMatterStageWithTasks(matterId, "Resolution");
    await createNoteForMatter(matterId, content, "Attorney", "Decision");
    return NextResponse.json({ matter, tasksCreated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not record decision.";
    const status = message.includes("Google Sheets") ? 400 : message.includes("not found") ? 404 : 409;
    return NextResponse.json({ error: message }, { status });
  }
}
