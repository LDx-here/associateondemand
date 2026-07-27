import { NextResponse } from "next/server";

import { updateTaskForMatter } from "@/lib/data-store";

type Ctx = { params: Promise<{ taskId: string }> };

/**
 * Task edit — no other endpoint can change an existing task (only create and
 * complete). Needed most for auto-created filing-deadline tasks, which are
 * seeded with `dueDate: null` (the automation has no way to know the real
 * date) and were otherwise permanently invisible to Upcoming Deadlines /
 * Calendar until an attorney could fill one in.
 */
export async function PATCH(req: Request, ctx: Ctx) {
  const { taskId } = await ctx.params;
  let body: {
    description?: string;
    dueDate?: string | null;
    priority?: string;
    isFilingDeadline?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const patch: Parameters<typeof updateTaskForMatter>[1] = {};
  if (typeof body.description === "string") {
    const trimmed = body.description.trim();
    if (!trimmed) return NextResponse.json({ error: "description cannot be empty" }, { status: 400 });
    patch.description = trimmed;
  }
  if (body.dueDate !== undefined) patch.dueDate = body.dueDate;
  if (typeof body.priority === "string") patch.priority = body.priority;
  if (typeof body.isFilingDeadline === "boolean") patch.isFilingDeadline = body.isFilingDeadline;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No fields to update." }, { status: 400 });
  }

  const task = await updateTaskForMatter(taskId, patch);
  if (!task) return NextResponse.json({ error: "Task not found." }, { status: 404 });
  return NextResponse.json({ task });
}
