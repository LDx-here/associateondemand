import { NextResponse } from "next/server";

import { listInvoicesForMatter, saveInvoicesForMatter } from "@/lib/data-store";
import type { Invoice } from "@/lib/invoice";

type Ctx = { params: Promise<{ matterId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { matterId } = await ctx.params;
  const invoices = await listInvoicesForMatter(matterId);
  return NextResponse.json({ invoices });
}

export async function PUT(req: Request, ctx: Ctx) {
  const { matterId } = await ctx.params;
  let body: { invoices?: Invoice[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (!Array.isArray(body.invoices)) {
    return NextResponse.json({ error: "invoices array is required." }, { status: 400 });
  }
  try {
    const saved = await saveInvoicesForMatter(matterId, body.invoices);
    return NextResponse.json({ invoices: saved });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not save invoices.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
