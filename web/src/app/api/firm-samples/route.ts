import { NextResponse } from "next/server";

import { listFirmSamples, saveFirmSample } from "@/lib/data-store";

export async function GET() {
  return NextResponse.json({ samples: await listFirmSamples() });
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
    const doc = await saveFirmSample({
      title,
      practiceArea,
      airtableDocumentId: body.airtableDocumentId,
    });
    return NextResponse.json({ ok: true, sample: doc });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sample save failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
