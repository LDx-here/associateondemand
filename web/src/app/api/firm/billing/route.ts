import { NextResponse } from "next/server";

import { getBillingSettings, saveBillingSettings } from "@/lib/data-store";
import type { BillingSettings } from "@/lib/billing-settings";

export async function GET() {
  const settings = await getBillingSettings();
  return NextResponse.json({ settings });
}

export async function PUT(req: Request) {
  let body: { settings?: Partial<BillingSettings> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (!body.settings || typeof body.settings !== "object") {
    return NextResponse.json({ error: "settings object is required." }, { status: 400 });
  }
  try {
    const saved = await saveBillingSettings(body.settings);
    return NextResponse.json({ settings: saved });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not save billing settings.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
