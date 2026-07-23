import { NextResponse } from "next/server";

import {
  getContact,
  linkContactToMatter,
  unlinkContactFromMatter,
  isDemoMode,
} from "@/lib/data-store";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const contact = await getContact(id);
  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }
  return NextResponse.json({ contact, demoMode: isDemoMode() });
}

export async function PATCH(request: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const body = await request.json();
    const action = String(body.action ?? "").trim();
    const matterCode = String(body.matterCode ?? "").trim();
    if (!matterCode) {
      return NextResponse.json({ error: "matterCode is required" }, { status: 400 });
    }

    if (action === "link") {
      const contact = await linkContactToMatter(id, matterCode);
      return NextResponse.json({ contact, demoMode: isDemoMode() });
    }
    if (action === "unlink") {
      const contact = await unlinkContactFromMatter(id, matterCode);
      return NextResponse.json({ contact, demoMode: isDemoMode() });
    }
    return NextResponse.json(
      { error: 'action must be "link" or "unlink"' },
      { status: 400 },
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Update failed" },
      { status: 500 },
    );
  }
}
