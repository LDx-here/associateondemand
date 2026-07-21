import { NextResponse } from "next/server";

import { upsertIntakeSession } from "@/lib/intake-session-store";

/** Persist intake email + step for abandoned-session follow-up (24h cron). */
export async function POST(req: Request) {
  let body: {
    sessionId?: string;
    email?: string;
    step?: number;
    deliverableId?: string;
    matterId?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const email = (body.email ?? "").trim();
  if (!email) {
    return NextResponse.json({ error: "email is required." }, { status: 400 });
  }

  try {
    const session = await upsertIntakeSession({
      sessionId: (body.sessionId ?? "").trim() || `sess-${Date.now()}`,
      email,
      step: body.step,
      deliverableId: body.deliverableId,
      matterId: body.matterId,
    });
    return NextResponse.json({ session });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not save intake session.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
