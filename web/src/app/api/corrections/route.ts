import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

import { createCorrectionInAirtable } from "@/lib/airtable/queries";
import { useDemoMode } from "@/lib/data-store";

const CATEGORY_MAP = {
  factual_error: "Factual",
  classification_error: "Classification",
  formatting_convention: "Convention",
  analytical_error: "Analytical",
  false_positive: "False Positive",
  false_negative: "False Negative",
} as const;

type CategoryKey = keyof typeof CATEGORY_MAP;

export async function POST(req: Request) {
  if (useDemoMode()) {
    return NextResponse.json(
      { error: "Sample data mode. Connect Airtable in Settings to save corrections." },
      { status: 503 },
    );
  }

  let body: {
    matterId?: string;
    agent?: string;
    originalOutput?: string;
    attorneyCorrection?: string;
    category?: CategoryKey;
    reason?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const matterId = (body.matterId ?? "").trim();
  const agent = (body.agent ?? "attorney").trim();
  const originalOutput = (body.originalOutput ?? "").trim();
  const attorneyCorrection = (body.attorneyCorrection ?? "").trim();
  const category = body.category ?? "analytical_error";
  const reason = (body.reason ?? "").trim();

  if (!attorneyCorrection) {
    return NextResponse.json({ error: "attorneyCorrection is required" }, { status: 400 });
  }

  const correctionType = CATEGORY_MAP[category] ?? "Analytical";
  const appliedTo =
    category === "formatting_convention"
      ? "firm-rules.md"
      : category === "classification_error"
        ? "categorizer-examples.jsonl"
        : category === "analytical_error" ||
            category === "false_positive" ||
            category === "false_negative"
          ? "Strategy Patterns"
          : "Notes only";

  try {
    const record = await createCorrectionInAirtable({
      agent,
      matterCode: matterId || undefined,
      originalOutput: originalOutput || "(not provided)",
      attorneyEdit: attorneyCorrection,
      correctionType,
      reason: reason || "Attorney correction via web API",
      appliedTo,
    });

    if (category === "formatting_convention") {
      const firmPath = path.resolve(process.cwd(), "..", "brain", "03_Firm_Knowledge", "firm-rules.md");
      try {
        await fs.access(firmPath);
        const iso = new Date().toISOString();
        const ruleLine = attorneyCorrection.replace(/\s+/g, " ").trim();
        const block =
          `\n- rule: ${JSON.stringify(ruleLine)}\n  source: correction_${record.id}\n  date: ${iso}\n`;
        await fs.appendFile(firmPath, block, "utf8");
      } catch {
        /* Optional brain file: skip when missing in this environment. */
      }
    }

    return NextResponse.json({ ok: true, id: record.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Correction save failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
