import { NextResponse } from "next/server";

import { createMatter, createNoteForMatter } from "@/lib/data-store";
import { getDataStoreKind, isDemoMode } from "@/lib/data-store-config";
import { caseTypeFor, type ProposedMatter } from "@/lib/practice-import";
import { scanPractice } from "@/lib/practice-import-fs";

export const runtime = "nodejs";
/** Reads Drive API or local filesystem — never cache. */
export const dynamic = "force-dynamic";

/** GET — propose matters from the firm's client folders. Read-only. */
export async function GET() {
  const scan = await scanPractice();
  return NextResponse.json({
    ...scan,
    dataStore: getDataStoreKind(),
    demoMode: isDemoMode(),
  });
}

type ImportBody = {
  /** Matter numbers the attorney chose to import, e.g. ["2026-002"]. */
  matterNumbers?: string[];
};

/**
 * POST — create the selected matters.
 *
 * Rescans rather than trusting a client-supplied matter payload: the browser
 * should not be able to dictate what gets written, only which of the proposed
 * matters to accept.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as ImportBody;
  const selected = new Set((body.matterNumbers ?? []).filter(Boolean));
  if (selected.size === 0) {
    return NextResponse.json({ error: "Select at least one matter to import." }, { status: 400 });
  }

  const scan = await scanPractice();
  if (!scan.available) {
    return NextResponse.json({ error: scan.reason ?? "Case folder unavailable." }, { status: 409 });
  }

  const toImport = scan.matters.filter((m) => selected.has(m.matterNumber));
  if (toImport.length === 0) {
    return NextResponse.json({ error: "No matching matters found in the scan." }, { status: 404 });
  }

  const imported: { matterNumber: string; matterId: string; clientName: string }[] = [];
  const failed: { matterNumber: string; error: string }[] = [];

  for (const proposed of toImport) {
    try {
      const matter = await createMatter({
        title: proposed.clientName,
        caseType: caseTypeFor(proposed),
        status: "Open",
        summary: summarize(proposed),
      });

      // The reconstructed history is written as notes so it lands on the case
      // timeline the attorney already reads, rather than inventing a store.
      await createNoteForMatter(
        matter.matterId,
        importSummaryNote(proposed),
        "System",
        "Import",
      );

      imported.push({
        matterNumber: proposed.matterNumber,
        matterId: matter.matterId,
        clientName: proposed.clientName,
      });
    } catch (err) {
      failed.push({
        matterNumber: proposed.matterNumber,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }


  return NextResponse.json({ imported, failed, dataStore: getDataStoreKind(), demoMode: isDemoMode() });
}

function summarize(m: ProposedMatter): string {
  const parts = [`Imported from case folder "${m.sourceFolder}" (firm matter ${m.matterNumber}).`];
  if (m.documents.length > 0) parts.push(`${m.documents.length} documents on file.`);
  if (m.lastActivityAt) parts.push(`Last activity ${m.lastActivityAt.slice(0, 10)}.`);
  return parts.join(" ");
}

/** Human-readable procedural history, oldest first. */
function importSummaryNote(m: ProposedMatter): string {
  const lines = [
    `Imported from "${m.sourceFolder}" — firm matter ${m.matterNumber}.`,
    `${m.documents.length} document${m.documents.length === 1 ? "" : "s"} on file.`,
  ];

  if (m.timeline.length > 0) {
    lines.push("", "Procedural history reconstructed from the case folder:");
    for (const e of m.timeline) {
      lines.push(`  ${e.occurredAt.slice(0, 10)} — ${e.category}: ${e.title}`);
    }
    lines.push(
      "",
      "Dates are file timestamps, not certified filing dates — verify against the docket before relying on them.",
    );
  }

  return lines.join("\n");
}
