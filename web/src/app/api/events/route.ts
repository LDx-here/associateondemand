import { NextResponse } from "next/server";

import { createEventInAirtable } from "@/lib/airtable/queries";
import { isDemoMode } from "@/lib/data-store";

export async function POST(req: Request) {
  if (isDemoMode()) {
    return NextResponse.json(
      { error: "Demo mode — creating events requires a live Airtable connection." },
      { status: 503 },
    );
  }
  let body: {
    summary?: string;
    matterCode?: string;
    type?: string;
    date?: string;
    time?: string;
    location?: string;
    description?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const summary = (body.summary ?? "").trim();
  if (!summary) {
    return NextResponse.json({ error: "summary is required" }, { status: 400 });
  }
  const date = (body.date ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "date must be YYYY-MM-DD" }, { status: 400 });
  }
  try {
    const event = await createEventInAirtable({
      summary,
      matterCode: body.matterCode || undefined,
      type: body.type || "Reminder",
      date,
      time: body.time || undefined,
      location: body.location || undefined,
      description: body.description || undefined,
    });
    return NextResponse.json({ event });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Create failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
