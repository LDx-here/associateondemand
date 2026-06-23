import { NextResponse } from "next/server";

import { completeTask } from "@/lib/data-store";

type Ctx = { params: Promise<{ taskId: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const { taskId } = await ctx.params;
  const task = await completeTask(taskId);
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ task });
}
