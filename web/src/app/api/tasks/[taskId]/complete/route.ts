import { NextResponse } from "next/server";

import { completeTask } from "@/lib/data-store";

type Ctx = { params: Promise<{ taskId: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { taskId } = await ctx.params;
  let body: { completionDocs?: string; completionNote?: string; completedBy?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* optional body */
  }
  const task = await completeTask(taskId, {
    completionDocs: body.completionDocs,
    completionNote: body.completionNote,
    completedBy: body.completedBy ?? "Attorney",
  });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ task });
}
