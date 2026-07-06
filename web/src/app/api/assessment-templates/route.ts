import { NextResponse } from "next/server";

import { listAssessmentTemplates, saveAssessmentTemplate } from "@/lib/data-store";

export async function GET() {
  return NextResponse.json({ templates: await listAssessmentTemplates() });
}

export async function POST(req: Request) {
  let body: { title?: string; practiceArea?: string; airtableDocumentId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const title = (body.title ?? "").trim();
  const practiceArea = (body.practiceArea ?? "").trim();
  if (!title || !practiceArea) {
    return NextResponse.json({ error: "title and practiceArea are required" }, { status: 400 });
  }

  try {
    const doc = await saveAssessmentTemplate({
      title,
      practiceArea,
      airtableDocumentId: body.airtableDocumentId,
    });
    return NextResponse.json({ ok: true, template: doc });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Template save failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
