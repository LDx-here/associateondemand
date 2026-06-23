import { NextResponse } from "next/server";

import {
  resolveInboxItemInAirtable,
  type InboxItem,
} from "@/lib/airtable/queries";
import { useDemoMode } from "@/lib/data-store";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type Ctx = { params: Promise<{ itemId: string }> };

async function resumePmAfterApprove(item: InboxItem, resolution: string) {
  const matterId = item.matterId.trim();
  if (!matterId) {
    return { skipped: true as const, reason: "No matter_id on inbox item" };
  }

  const agentPrefix = item.agent ? `${item.agent} ` : "";
  const instruction = [
    `${agentPrefix}Attorney approved PM inbox item.`,
    `Resolution: ${resolution}.`,
    item.whatNeeded ? `Prior need: ${item.whatNeeded}` : "",
    item.whatTried ? `Prior attempt: ${item.whatTried}` : "",
    "Continue work with this guidance.",
  ]
    .filter(Boolean)
    .join(" ")
    .slice(0, 4000);

  try {
    const resp = await fetch(`${API}/agents/pm/dispatch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        matter_id: matterId,
        instruction,
        priority: "high",
      }),
    });
    const data = await resp.json();
    if (!resp.ok) {
      return {
        error: typeof data.detail === "string" ? data.detail : `PM dispatch failed (${resp.status})`,
      };
    }
    return { agent: data };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "PM dispatch failed" };
  }
}

export async function POST(req: Request, ctx: Ctx) {
  const { itemId } = await ctx.params;
  if (useDemoMode()) {
    return NextResponse.json(
      { error: "Demo mode — PM Inbox resolution requires a live Airtable connection." },
      { status: 503 },
    );
  }
  let body: {
    resolution?: string;
    status?: "Resolved" | "Dismissed";
    option?: string;
    matterId?: string;
    agent?: string;
    whatNeeded?: string;
    whatTried?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const resolution = (body.resolution ?? "").trim();
  if (!resolution) {
    return NextResponse.json({ error: "resolution is required" }, { status: 400 });
  }
  const status: "Resolved" | "Dismissed" =
    body.status === "Dismissed" ? "Dismissed" : "Resolved";
  try {
    const item = await resolveInboxItemInAirtable(itemId, resolution, status);

    const option = (body.option ?? resolution).trim().toLowerCase();
    let pmResume: Awaited<ReturnType<typeof resumePmAfterApprove>> | undefined;
    if (status === "Resolved" && option.startsWith("approve")) {
      pmResume = await resumePmAfterApprove(item, resolution);
    }

    return NextResponse.json({ item, pmResume });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Resolve failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
