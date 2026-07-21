import { NextResponse } from "next/server";

import {
  getTemplateFieldMap,
  type TemplateEditableField,
  type TemplateFieldMap,
} from "@/lib/template-field-maps";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

type DetectBody = {
  templateId?: string;
  ocrText?: string;
  title?: string;
};

/** Heuristic placeholders when LLM is unavailable. */
function heuristicFieldsFromText(text: string): TemplateEditableField[] {
  const lower = text.toLowerCase();
  const fields: TemplateEditableField[] = [];
  if (lower.includes("a-number") || lower.includes("a number")) {
    fields.push({
      id: "a_number",
      label: "A-Number",
      type: "text",
      section: "Detected",
      editable: true,
      autofillFrom: "a_number",
    });
  }
  if (lower.includes("hearing")) {
    fields.push({
      id: "hearing_date",
      label: "Hearing date",
      type: "date",
      section: "Detected",
      editable: true,
      autofillFrom: "hearing_date",
    });
  }
  if (lower.includes("records") || lower.includes("telephonic")) {
    fields.push({
      id: "records_requested",
      label: "Records requested",
      type: "textarea",
      section: "Detected",
      editable: true,
    });
  }
  return fields;
}

/** Optional LLM field detection — falls back to heuristics + catalog maps. */
export async function POST(req: Request) {
  let body: DetectBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const templateId = (body.templateId ?? "telephonic-records-request").trim();
  const catalogMap = getTemplateFieldMap(templateId);
  const ocrText = (body.ocrText ?? "").trim();

  let detected: TemplateEditableField[] = heuristicFieldsFromText(ocrText);
  let source: "catalog" | "heuristic" | "llm" = catalogMap ? "catalog" : "heuristic";

  if (API && ocrText.length > 80) {
    try {
      const resp = await fetch(`${API}/intake/enrich-facts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matter_id: "TEMPLATE-DETECT",
          ocr_text: ocrText.slice(0, 12000),
          facts: [],
          extraction_context: { purpose: "template_field_detection", title: body.title ?? "" },
          force: true,
        }),
      });
      if (resp.ok) {
        const data = (await resp.json()) as { facts?: Array<{ fact_type: string; value: string }> };
        const fromLlm = (data.facts ?? []).slice(0, 12).map((f) => ({
          id: f.fact_type.replace(/\W+/g, "_").toLowerCase(),
          label: f.fact_type.replace(/_/g, " "),
          type: "text" as const,
          section: "AI detected",
          editable: true,
        }));
        if (fromLlm.length) {
          detected = fromLlm;
          source = "llm";
        }
      }
    } catch {
      // Fly API offline — keep heuristic/catalog
    }
  }

  const proposed: TemplateFieldMap = catalogMap ?? {
    id: templateId,
    name: body.title?.trim() || "Uploaded sample",
    description: "Proposed field map from upload analysis.",
    editableFields: detected.length ? detected : heuristicFieldsFromText("telephonic records hearing"),
    boilerplateSections: ["Review with attorney before saving as firm template"],
  };

  return NextResponse.json({
    ok: true,
    source,
    proposed,
    catalogMatch: Boolean(catalogMap),
  });
}
