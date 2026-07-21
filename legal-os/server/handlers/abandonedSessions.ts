import { eq, and, lt } from "drizzle-orm";
import type { Request, Response } from "express";
import { getDb, schema } from "../db.js";

const { leads } = schema;

export async function abandonedSessionHandler(req: Request, res: Response) {
  const cronSecret = req.headers["x-cron-secret"];
  if (cronSecret !== process.env.CRON_SECRET) {
    return res.status(403).json({ error: "cron-only" });
  }

  try {
    const db = getDb();
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const abandoned = await db
      .select()
      .from(leads)
      .where(
        and(
          eq(leads.status, "in_progress"),
          eq(leads.followUpSent, false),
          lt(leads.updatedAt, oneHourAgo)
        )
      );

    let processed = 0;
    for (const lead of abandoned) {
      // Notification API stub — wire Resend when RESEND_API_KEY set
      if (process.env.RESEND_API_KEY) {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: process.env.FOLLOWUP_FROM_EMAIL ?? "noreply@recovermyvalue.com",
            to: lead.email,
            subject: "Complete your RMV Associate request",
            html: `<p>Hi ${lead.attorneyName}, you started an intake session for ${lead.firmName}. <a href="${process.env.PUBLIC_URL ?? "http://localhost:5173"}/associate/intake">Continue where you left off</a>.</p>`,
          }),
        }).catch(() => undefined);
      }

      await db.update(leads).set({ followUpSent: true }).where(eq(leads.id, lead.id));
      processed++;
    }

    res.json({ ok: true, processed });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
}
