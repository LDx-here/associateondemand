import { NextResponse } from "next/server";

import { createTaskForMatter, listTasksForMatter } from "@/lib/data-store";

type Ctx = { params: Promise<{ matterId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { matterId } = await ctx.params;
  return NextResponse.json({ tasks: await listTasksForMatter(matterId) });
}

export async function POST(req: Request, ctx: Ctx) {
  const { matterId } = await ctx.params;
  const body = (await req.json()) as {
    description?: string;
    dueDate?: string | null;
    priority?: string;
    isFilingDeadline?: boolean;
  };
  if (!body.description?.trim()) {
    return NextResponse.json({ error: "description required" }, { status: 400 });
  }
  const task = await createTaskForMatter(matterId, {
    description: body.description.trim(),
    dueDate: body.dueDate ?? null,
    priority: body.priority ?? "Medium",
    isFilingDeadline: Boolean(body.isFilingDeadline),
  });
  return NextResponse.json({ task });
}
