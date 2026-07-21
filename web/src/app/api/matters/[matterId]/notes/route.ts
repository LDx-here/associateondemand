import { NextResponse } from "next/server";

import { createNoteForMatter, listNotesForMatter } from "@/lib/data-store";

type Ctx = { params: Promise<{ matterId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { matterId } = await ctx.params;
  return NextResponse.json({ notes: await listNotesForMatter(matterId) });
}

export async function POST(req: Request, ctx: Ctx) {
  const { matterId } = await ctx.params;
  const body = (await req.json()) as { content?: string; author?: string; type?: string };
  if (!body.content?.trim()) {
    return NextResponse.json({ error: "content required" }, { status: 400 });
  }
  const note = await createNoteForMatter(
    matterId,
    body.content.trim(),
    body.author ?? "Attorney",
    body.type ?? "Manual",
  );
  return NextResponse.json({ note });
}
