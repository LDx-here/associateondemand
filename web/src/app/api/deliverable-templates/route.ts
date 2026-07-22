import { NextResponse } from "next/server";

import {
  listDeliverableTemplateCatalog,
  saveDeliverableTemplate,
  updateDeliverableTemplateTweaks,
} from "@/lib/data-store";

export async function GET() {
  const templates = await listDeliverableTemplateCatalog();
  return NextResponse.json({ templates });
}

export async function POST(req: Request) {
  let body: {
    deliverableId?: string;
    title?: string;
    airtableDocumentId?: string;
    postgresDocumentId?: string;
    textPreview?: string;
    fileType?: string;
    tweakNotes?: string;
    source?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const deliverableId = (body.deliverableId ?? "").trim();
  const title = (body.title ?? "").trim();
  if (!deliverableId || !title) {
    return NextResponse.json({ error: "deliverableId and title are required" }, { status: 400 });
  }

  try {
    const meta = await saveDeliverableTemplate({
      deliverableId,
      title,
      airtableDocumentId: body.airtableDocumentId,
      postgresDocumentId: body.postgresDocumentId,
      textPreview: body.textPreview,
      fileType: body.fileType,
      tweakNotes: body.tweakNotes,
      source: body.source ?? "firm_uploaded",
    });
    return NextResponse.json({ ok: true, meta });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Template save failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function PATCH(req: Request) {
  let body: { deliverableId?: string; tweakNotes?: string; textPreview?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const deliverableId = (body.deliverableId ?? "").trim();
  if (!deliverableId) {
    return NextResponse.json({ error: "deliverableId is required" }, { status: 400 });
  }

  try {
    const meta = await updateDeliverableTemplateTweaks({
      deliverableId,
      tweakNotes: body.tweakNotes ?? "",
      textPreview: body.textPreview,
    });
    return NextResponse.json({ ok: true, meta });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Template update failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
