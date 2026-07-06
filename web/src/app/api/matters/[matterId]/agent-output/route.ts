import { NextResponse } from "next/server";

import { upsertAgentOutputForMatter } from "@/lib/data-store";

type Ctx = { params: Promise<{ matterId: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { matterId } = await ctx.params;
  let body: { content?: string; agent?: string; noteId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const content = body.content?.trim();
  if (!content) {
    return NextResponse.json({ error: "content required" }, { status: 400 });
  }

  try {
    const note = await upsertAgentOutputForMatter(matterId, content, {
      noteId: body.noteId,
      agent: body.agent,
    });
    return NextResponse.json({ note });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Agent output save failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
