import { NextResponse } from "next/server";

import { updateNoteForMatter } from "@/lib/data-store";

type Ctx = { params: Promise<{ matterId: string; noteId: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const { matterId, noteId } = await ctx.params;
  let body: { content?: string; author?: string };
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
    const note = await updateNoteForMatter(matterId, noteId, content, body.author);
    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }
    return NextResponse.json({ note });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Note update failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
