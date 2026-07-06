import { NextResponse } from "next/server";

import {
  ASSESSMENT_DOCUMENT_NOTE_TYPE,
  CASE_ASSESSMENT_CATEGORY,
  parseAssessmentOcrPayload,
  serializeAssessmentOcrPayload,
  type AssessmentOcrPayload,
} from "@/lib/assessment-documents";
import {
  createNoteForMatter,
  getAssessmentOcrNote,
  registerAssessmentDocument,
} from "@/lib/data-store";

type Ctx = { params: Promise<{ matterId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { matterId } = await ctx.params;
  const note = await getAssessmentOcrNote(matterId);
  if (!note) return NextResponse.json({ payload: null });
  const payload = parseAssessmentOcrPayload(note.content);
  return NextResponse.json({ payload });
}

export async function POST(req: Request, ctx: Ctx) {
  const { matterId } = await ctx.params;
  let body: {
    title?: string;
    airtableDocumentId?: string;
    ocrText?: string;
    facts?: AssessmentOcrPayload["facts"];
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const title = (body.title ?? "").trim();
  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  try {
    const doc = await registerAssessmentDocument(matterId, {
      title,
      category: CASE_ASSESSMENT_CATEGORY,
      airtableDocumentId: body.airtableDocumentId,
    });

    const payload: AssessmentOcrPayload = {
      v: 1,
      documentId: doc.id,
      title,
      ocrText: body.ocrText,
      facts: body.facts,
      uploadedAt: doc.uploadedAt,
    };

    await createNoteForMatter(
      matterId,
      serializeAssessmentOcrPayload(payload),
      "Strong Reader",
      ASSESSMENT_DOCUMENT_NOTE_TYPE,
    );

    return NextResponse.json({ ok: true, document: doc, payload });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Registration failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
