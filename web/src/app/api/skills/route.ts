import { NextResponse } from "next/server";

import { isDemoMode } from "@/lib/data-store";
import { saveAttorneySkill } from "@/lib/skill-store";

export async function POST(req: Request) {
  if (isDemoMode()) {
    return NextResponse.json(
      { error: "Sample data mode. Connect Google Sheets or Airtable in Settings to save skills." },
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

  try {
    const { patternId, correctionId } = await saveAttorneySkill({
      name,
      description,
      trigger,
      body: skillBody,
      agent,
      matterCode: matterId || undefined,
      originalOutput: body.originalOutput,
    });

    return NextResponse.json({
      ok: true,
      patternId,
      correctionId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Skill save failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
