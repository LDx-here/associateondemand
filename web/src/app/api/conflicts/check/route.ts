import { NextResponse } from "next/server";

import { checkConflictAgainstMatters } from "@/lib/conflict-check";
import { listMatters, isDemoMode } from "@/lib/data-store";
import { getMutableSeed } from "@/lib/demo-store-mutable";

/** Lightweight conflict check before assignment submit (Airtable-backed). */
export async function POST(req: Request) {
  let body: { opposingParty?: string; opposingCounsel?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const opposingParty = (body.opposingParty ?? "").trim();
  if (!opposingParty) {
    return NextResponse.json({ error: "Opposing party is required for conflict check." }, { status: 400 });
  }

  const opposingCounsel = (body.opposingCounsel ?? "").trim() || undefined;

  let matters: Array<{ matterId: string; title?: string; summary?: string; clientName?: string }> = [];
  if (isDemoMode()) {
    const seed = await getMutableSeed();
    matters = seed.matters.map((m) => ({
      matterId: m.matterId,
      title: m.title,
      summary: m.summary,
      clientName: m.clientName,
    }));
  } else {
    const rows = await listMatters();
    matters = rows.map((m) => ({
      matterId: m.matterId,
      title: m.title,
      summary: m.summary,
      clientName: m.clientName,
    }));
  }

  const result = checkConflictAgainstMatters(opposingParty, matters, opposingCounsel);
  return NextResponse.json(result);
}
