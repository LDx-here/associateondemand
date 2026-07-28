import { NextResponse } from "next/server";

import { createNoteForMatter, listNotesForMatter } from "@/lib/data-store";
import { parseWorkEntry } from "@/lib/work-entry";

type Ctx = { params: Promise<{ matterId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { matterId } = await ctx.params;
  return NextResponse.json({ notes: await listNotesForMatter(matterId) });
}

export async function POST(req: Request, ctx: Ctx) {
  const { matterId } = await ctx.params;
  const body = (await req.json()) as {
    content?: string;
    author?: string;
    type?: string;
    work?: unknown;
  };
  if (!body.content?.trim()) {
    return NextResponse.json({ error: "content required" }, { status: 400 });
  }
  const note = await createNoteForMatter(
    matterId,
    body.content.trim(),
    body.author ?? "Attorney",
    body.type ?? "Manual",
    // Invalid/absent work payload saves the note without time rather than
    // rejecting it — losing the note would be worse than losing the entry.
    parseWorkEntry(body.work),
  );
  return NextResponse.json({ note });
}
