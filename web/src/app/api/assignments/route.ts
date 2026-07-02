import { NextResponse } from "next/server";

import { createAssignmentInboxItem, createMatter, createTaskForMatter } from "@/lib/data-store";
import { findTemplate } from "@/lib/template-catalog";

type NewMatterInput = {
  title?: string;
  caseType?: string;
  country?: string;
  posture?: string;
};

type AssignmentBody = {
  matterMode?: "existing" | "new";
  matterId?: string;
  newMatter?: NewMatterInput;
  deliverableId?: string;
  deliverableName?: string;
  facts?: string;
  priority?: "Normal" | "Rush";
};

/**
 * Assignment intake -> matter + PM Inbox job (docs/runbooks/autonomous-agent-pass.md
 * priority #1). Creates (or reuses) a matter, then a Submitted PM Inbox row the
 * attorney triages from `/inbox`, plus a lightweight triage task.
 */
export async function POST(request: Request) {
  let body: AssignmentBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const deliverableId = String(body.deliverableId ?? "").trim();
  const facts = String(body.facts ?? "").trim();
  if (!deliverableId) {
    return NextResponse.json({ error: "deliverableId is required" }, { status: 400 });
  }
  if (!facts) {
    return NextResponse.json({ error: "facts is required" }, { status: 400 });
  }

  const template = findTemplate(deliverableId);
  const deliverableName = template?.name ?? String(body.deliverableName ?? "Custom deliverable").trim();
  const tier = template?.tier ?? "custom";
  const priority: "Normal" | "Rush" = body.priority === "Rush" ? "Rush" : "Normal";

  try {
    let matterId: string;
    if (body.matterMode === "new") {
      const nm = body.newMatter ?? {};
      const title = String(nm.title ?? "").trim();
      if (!title) {
        return NextResponse.json({ error: "New matter title is required" }, { status: 400 });
      }
      const matter = await createMatter({
        title,
        caseType: String(nm.caseType ?? "Asylum").trim() || "Asylum",
        country: nm.country?.trim() || undefined,
        posture: nm.posture?.trim() || undefined,
      });
      matterId = matter.matterId;
    } else {
      matterId = String(body.matterId ?? "").trim();
      if (!matterId) {
        return NextResponse.json({ error: "matterId is required" }, { status: 400 });
      }
    }

    const item = await createAssignmentInboxItem({
      matterId,
      deliverableName,
      tier,
      facts,
      priority,
    });

    try {
      await createTaskForMatter(matterId, {
        description: `Triage new assignment: ${deliverableName}${priority === "Rush" ? " (RUSH)" : ""}`,
        dueDate: null,
        priority: priority === "Rush" ? "High" : "Medium",
        isFilingDeadline: false,
      });
    } catch {
      // Non-fatal — the inbox item is the source of truth for triage.
    }

    return NextResponse.json({ matterId, item }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Assignment intake failed" },
      { status: 500 },
    );
  }
}
