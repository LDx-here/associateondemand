import { NextResponse } from "next/server";

import {
  draftingFactsCompleteness,
  parseDraftingFactsNote,
} from "@/lib/practice-area-facts";
import { FIRM_TEMPLATE_MATTER_ID } from "@/lib/assessment-documents";
import { listMatters, listAllNotes } from "@/lib/data-store";
import type { FactTemplateSummary } from "@/lib/fact-template";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const deliverableId = url.searchParams.get("deliverable") ?? "aos-discretionary-brief";
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "8", 10), 20);

  const [matters, notes] = await Promise.all([listMatters(), listAllNotes()]);

  const matterByCode = new Map(matters.map((m) => [m.matterId, m]));
  const factsNotes = notes
    .filter(
      (n) =>
        n.type === "Facts" &&
        n.matterId !== FIRM_TEMPLATE_MATTER_ID &&
        n.content.trim().startsWith("{"),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const templates: FactTemplateSummary[] = [];

  for (const note of factsNotes) {
    if (templates.length >= limit) break;
    const matter = matterByCode.get(note.matterId);
    if (!matter || matter.status === "Closed") continue;

    const parsed = parseDraftingFactsNote(note.content, note.matterId, matter.caseType);
    if (!parsed) continue;
    if (deliverableId && parsed.deliverableId && parsed.deliverableId !== deliverableId) continue;

    const { percent } = draftingFactsCompleteness(parsed, deliverableId);
    if (percent < 40) continue;

    templates.push({
      matterId: note.matterId,
      title: matter.title || matter.clientName || note.matterId,
      deliverableId: parsed.deliverableId,
      updatedAt: parsed.updatedAt ?? note.createdAt,
      completenessPercent: percent,
      paragraphSelections: parsed.paragraphSelections,
    });
  }

  return NextResponse.json({ templates, deliverableId });
}
