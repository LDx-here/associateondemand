import { NextResponse } from "next/server";

import { listMatters, updateMatterFields } from "@/lib/data-store";
import { proposeCaseState, type ProposedCaseState } from "@/lib/case-state";
import { scanPractice } from "@/lib/practice-import-fs";
import { normalizeClientName, parseClientFolderName } from "@/lib/practice-import";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Case-state enrichment for matters that were imported with a name and a
 * practice area and nothing else — no posture, no deadline.
 *
 * GET proposes; POST applies only what the attorney selected. Posture is
 * inferred from filename patterns and is safe to apply. Dates are surfaced
 * with the filename they came from and are never written automatically — a
 * wrong deadline on a legal matter is worse than a blank one.
 */

type Proposal = {
  matterId: string;
  clientName: string;
  currentPosture: string | null;
  proposed: ProposedCaseState;
};

/**
 * Match a Sheets matter back to the case folder it came from.
 *
 * The importer titles matters with the normalized client name, so comparing
 * normalized names is the reliable join — matter ids (AOD-1003) bear no
 * relationship to firm matter numbers (2026-006).
 */
function matchesFolder(matterTitle: string, folderName: string): boolean {
  const parsed = parseClientFolderName(folderName);
  if (!parsed) return false;
  return (
    normalizeClientName(parsed.clientName).toLowerCase() ===
    normalizeClientName(matterTitle).toLowerCase()
  );
}

async function buildProposals(): Promise<{ proposals: Proposal[]; reason?: string }> {
  const scan = await scanPractice();
  if (!scan.available) return { proposals: [], reason: scan.reason };

  const matters = await listMatters();
  const proposals: Proposal[] = [];

  for (const matter of matters) {
    const title = matter.title || matter.clientName;
    const folder = scan.matters.find((m) => matchesFolder(title, m.sourceFolder));
    if (!folder) continue;

    // ProposedMatter carries the folder's documents with their dates; reuse
    // them rather than re-walking the filesystem.
    const files = folder.documents.map((d) => ({
      name: d.title,
      modifiedAt: d.occurredAt,
    }));

    proposals.push({
      matterId: matter.matterId,
      clientName: title,
      currentPosture: matter.posture ?? null,
      proposed: proposeCaseState(files, new Date()),
    });
  }

  return { proposals };
}

export async function GET() {
  const { proposals, reason } = await buildProposals();
  return NextResponse.json({ proposals, available: !reason, reason });
}

type ApplyBody = {
  /** Matter ids to update. */
  matterIds?: string[];
  /** Opt in per matter to also write the proposed deadline. Default: no. */
  includeDeadlineFor?: string[];
};

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as ApplyBody;
  const selected = new Set((body.matterIds ?? []).filter(Boolean));
  const withDeadline = new Set(body.includeDeadlineFor ?? []);

  if (selected.size === 0) {
    return NextResponse.json({ error: "Select at least one matter." }, { status: 400 });
  }

  const { proposals, reason } = await buildProposals();
  if (reason) return NextResponse.json({ error: reason }, { status: 409 });

  const updated: { matterId: string; posture: string; nextDeadline: string | null }[] = [];
  const failed: { matterId: string; error: string }[] = [];

  for (const proposal of proposals) {
    if (!selected.has(proposal.matterId)) continue;

    const patch: Record<string, string> = { posture: proposal.proposed.posture };
    const deadline =
      withDeadline.has(proposal.matterId) && proposal.proposed.nextDeadline
        ? proposal.proposed.nextDeadline
        : null;
    if (deadline) patch.nextDeadline = deadline;

    try {
      await updateMatterFields(proposal.matterId, patch);
      updated.push({
        matterId: proposal.matterId,
        posture: proposal.proposed.posture,
        nextDeadline: deadline,
      });
    } catch (err) {
      failed.push({
        matterId: proposal.matterId,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return NextResponse.json({ updated, failed });
}
