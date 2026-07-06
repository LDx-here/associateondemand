import { NextResponse } from "next/server";

import { createCorrectionInAirtable, createStrategyPatternInAirtable } from "@/lib/airtable/queries";
import { isDemoMode } from "@/lib/data-store";

export async function POST(req: Request) {
  if (isDemoMode()) {
    return NextResponse.json(
      { error: "Sample data mode. Connect Airtable in Settings to save skills." },
      { status: 503 },
    );
  }

  let body: {
    name?: string;
    description?: string;
    trigger?: string;
    body?: string;
    originalOutput?: string;
    matterId?: string;
    agent?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = (body.name ?? "").trim();
  const skillBody = (body.body ?? "").trim();
  const trigger = (body.trigger ?? "").trim();
  const description = (body.description ?? "").trim();

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (!skillBody) {
    return NextResponse.json({ error: "body is required" }, { status: 400 });
  }

  const matterId = (body.matterId ?? "").trim();
  const agent = (body.agent ?? "attorney-skill").trim();
  const originalOutput = (body.originalOutput ?? "").trim() || skillBody;

  try {
    const pattern = await createStrategyPatternInAirtable({
      name,
      description,
      trigger,
      body: skillBody,
      agent,
      matterCode: matterId || undefined,
      correctionNote: originalOutput !== skillBody ? `Refined from agent output on ${matterId || "matter"}` : undefined,
    });

    const correction = await createCorrectionInAirtable({
      agent,
      matterCode: matterId || undefined,
      originalOutput: originalOutput.slice(0, 4000),
      attorneyEdit: skillBody.slice(0, 4000),
      correctionType: "Analytical",
      reason: trigger || description || `Saved as skill: ${name}`,
      appliedTo: "Strategy Patterns",
    });

    return NextResponse.json({
      ok: true,
      patternId: pattern.id,
      correctionId: correction.id,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Skill save failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
