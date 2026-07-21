import { NextResponse } from "next/server";

import {
  buildExtractionContext,
  parseAssessmentOcrPayload,
  serializeAssessmentOcrPayload,
  type AssessmentOcrPayload,
} from "@/lib/assessment-documents";
import { legalElementTemplatesForMatter } from "@/lib/legal-element-templates";
import { getAssessmentOcrNote, saveAssessmentOcrPayload } from "@/lib/data-store";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type Ctx = { params: Promise<{ matterId: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { matterId } = await ctx.params;
  let body: {
    caseType?: string;
    practiceArea?: string;
    deliverableId?: string;
    force?: boolean;
  };

  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const note = await getAssessmentOcrNote(matterId);
  if (!note) {
    return NextResponse.json({ error: "No assessment document on file" }, { status: 404 });
  }

  const payload = parseAssessmentOcrPayload(note.content);
  if (!payload) {
    return NextResponse.json({ error: "Invalid assessment payload" }, { status: 400 });
  }

  const caseType = body.caseType ?? payload.practiceArea ?? "general";
  const deliverableId = body.deliverableId ?? payload.deliverableId ?? "aos-discretionary-brief";
  const practiceArea = body.practiceArea ?? payload.practiceArea ?? "immigration";
  const templates = legalElementTemplatesForMatter(caseType, deliverableId);

  const extractionContext = {
    ...buildExtractionContext({
      practiceArea,
      caseType,
      deliverableId,
      legalElements: templates.map((t) => t.name),
    }),
    legal_elements: templates.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
    })),
  };

  try {
    const resp = await fetch(`${API}/intake/enrich-facts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        matter_id: matterId,
        ocr_text: payload.ocrText ?? "",
        facts: payload.facts ?? [],
        extraction_context: extractionContext,
        force: body.force ?? true,
      }),
    });

    if (!resp.ok) {
      const err = (await resp.json().catch(() => ({}))) as { detail?: string; error?: string };
      return NextResponse.json(
        { error: err.detail ?? err.error ?? "Enrichment failed" },
        { status: resp.status },
      );
    }

    const data = (await resp.json()) as {
      facts?: AssessmentOcrPayload["facts"];
      enrichment_status?: AssessmentOcrPayload["enrichmentStatus"];
      enrichment_warning?: string;
      enrichment_summary?: string;
    };

    const updated: AssessmentOcrPayload = {
      ...payload,
      facts: data.facts ?? payload.facts,
      enrichmentStatus: data.enrichment_status ?? payload.enrichmentStatus,
      enrichmentWarning: data.enrichment_warning,
      enrichmentSummary: data.enrichment_summary,
    };

    await saveAssessmentOcrPayload(matterId, updated, "AI enrichment");

    return NextResponse.json({ ok: true, payload: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Enrichment request failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
