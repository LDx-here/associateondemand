import { NextResponse } from "next/server";

import { buildTimeline } from "@/lib/data-store";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type Ctx = { params: Promise<{ matterId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { matterId } = await ctx.params;
  const timeline = await buildTimeline(matterId);

  try {
    const resp = await fetch(`${API}/agents/audit/${encodeURIComponent(matterId)}`, { cache: "no-store" });
    if (resp.ok) {
      const payload = (await resp.json()) as {
        entries?: Array<{ id: string; timestamp: string; actor: string; summary: string }>;
      };
      for (const e of payload.entries ?? []) {
        timeline.push({
          id: e.id,
          matterId,
          timestamp: e.timestamp,
          actor: e.actor,
          kind: "agent",
          summary: e.summary,
        });
      }
      timeline.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
    }
  } catch {
    /* demo/offline — seed audit only */
  }

  return NextResponse.json({ timeline });
}
