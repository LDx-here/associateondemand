import { NextResponse } from "next/server";

import { createCorrectionInAirtable, createStrategyPatternInAirtable } from "@/lib/airtable/queries";
import { isDemoMode } from "@/lib/data-store";

const FIRM_MEMORY_AGENT = "firm_memory";

/**
 * Firm Memory v1 — persist style preferences to Strategy Patterns
 * (category firm_memory) for overflow counsel alignment.
 */
export async function POST(req: Request) {
  if (isDemoMode()) {
    return NextResponse.json(
      { error: "Sample data mode. Connect Airtable in Settings to save Firm Memory." },
      { status: 503 },
    );
  }

  let body: {
    firmName?: string;
    stylePreference?: string;
    body?: string;
    deliverableType?: string;
    matterId?: string;
    originalOutput?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const firmName = (body.firmName ?? "Client firm").trim();
  const stylePreference = (body.stylePreference ?? body.deliverableType ?? "General style").trim();
  const memoryBody = (body.body ?? "").trim();
  const originalOutput = (body.originalOutput ?? "").trim() || memoryBody;

  if (!memoryBody) {
    return NextResponse.json({ error: "body is required" }, { status: 400 });
  }

  const matterId = (body.matterId ?? "").trim();

  try {
    const pattern = await createStrategyPatternInAirtable({
      name: firmName,
      description: `[firm_memory] ${stylePreference}`,
      trigger: stylePreference,
      body: memoryBody,
      agent: FIRM_MEMORY_AGENT,
      matterCode: matterId || undefined,
      category: "firm_memory",
      correctionNote: `Firm Memory saved — ${stylePreference}`,
    });

    const correction = await createCorrectionInAirtable({
      agent: FIRM_MEMORY_AGENT,
      matterCode: matterId || undefined,
      originalOutput: originalOutput.slice(0, 4000),
      attorneyEdit: memoryBody.slice(0, 4000),
      correctionType: "Convention",
      reason: `Firm Memory: ${stylePreference}`,
      appliedTo: "Strategy Patterns",
    });

    return NextResponse.json({
      ok: true,
      patternId: pattern.id,
      correctionId: correction.id,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Firm Memory save failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
