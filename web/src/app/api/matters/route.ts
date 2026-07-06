import { NextResponse } from "next/server";

import { createMatter, listMatters, isDemoMode } from "@/lib/data-store";

export async function GET() {
  const matters = await listMatters();
  return NextResponse.json({ matters, demoMode: isDemoMode() });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const title = String(body.title ?? "").trim();
    const caseType = String(body.caseType ?? "Asylum").trim();
    if (!title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }
    const matter = await createMatter({
      title,
      caseType,
      country: body.country ? String(body.country) : undefined,
      posture: body.posture ? String(body.posture) : undefined,
      status: body.status ? String(body.status) : undefined,
      summary: body.summary ? String(body.summary) : undefined,
    });
    return NextResponse.json({ matter, demoMode: isDemoMode() }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Create failed" },
      { status: 500 },
    );
  }
}
