import { NextResponse } from "next/server";

import { advanceMatterStageWithTasks } from "@/lib/data-store";
import { MATTER_LIFECYCLE_STAGES, type MatterLifecycleStage } from "@/lib/matter-lifecycle-stage";

type Ctx = { params: Promise<{ matterId: string }> };

/**
 * Matter lifecycle-stage transition (Clio-Manage-style automated workflow).
 * On a legal transition, bulk-creates the matching practice-area × stage
 * task list, tagging each with a stable `createdFrom` id so re-entering a
 * stage (or retrying the request) never duplicates tasks.
 */
export async function PATCH(req: Request, ctx: Ctx) {
  const { matterId } = await ctx.params;
  let body: { stage?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const stage = body.stage;
  if (!stage || !(MATTER_LIFECYCLE_STAGES as readonly string[]).includes(stage)) {
    return NextResponse.json(
      { error: `stage must be one of: ${MATTER_LIFECYCLE_STAGES.join(", ")}` },
      { status: 400 },
    );
  }
  const nextStage = stage as MatterLifecycleStage;

  try {
    const { matter, tasksCreated } = await advanceMatterStageWithTasks(matterId, nextStage);
    return NextResponse.json({ matter, tasksCreated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not update lifecycle stage.";
    const status = message.includes("Google Sheets") ? 400 : message.includes("not found") ? 404 : 409;
    return NextResponse.json({ error: message }, { status });
  }
}
