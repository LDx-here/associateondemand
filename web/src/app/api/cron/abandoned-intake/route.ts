import { NextResponse } from "next/server";

import {
  listStaleIntakeSessions,
  markIntakeFollowUpSent,
  sendAbandonedIntakeEmail,
} from "@/lib/intake-session-store";

export const runtime = "nodejs";

function authorizeCron(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV !== "production";
  const header = req.headers.get("authorization");
  if (header === `Bearer ${secret}`) return true;
  return req.headers.get("x-cron-secret") === secret;
}

/** Daily cron — email attorneys who abandoned intake 24h+ ago (Resend optional). */
export async function GET(req: Request) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stale = await listStaleIntakeSessions();
  let processed = 0;
  let emailed = 0;
  let skippedNoKey = 0;

  for (const session of stale) {
    if (process.env.RESEND_API_KEY?.trim()) {
      const sent = await sendAbandonedIntakeEmail(session);
      if (sent) emailed += 1;
    } else {
      skippedNoKey += 1;
    }
    await markIntakeFollowUpSent(session.sessionId);
    processed += 1;
  }

  return NextResponse.json({
    ok: true,
    processed,
    emailed,
    skippedNoKey,
    resendConfigured: Boolean(process.env.RESEND_API_KEY?.trim()),
  });
}
