import { NextResponse } from "next/server";

import {
  createNoteForMatter,
  getMatterByCode,
  listAllTasks,
  listLegalElements,
  listMatters,
  listNotesForMatter,
  listTasksForMatter,
} from "@/lib/data-store";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/** Max characters forwarded for full memo JSON (trimmed with flag if larger). */
const FULL_MEMO_MAX_CHARS = 128 * 1024;

type AgentDispatchResult = {
  agent?: string;
  agent_name?: string;
  matter_id?: string;
  summary?: string;
  gaps?: string[];
  gap_questions?: Array<{ question?: string }>;
  next_steps?: string[];
  uncertain?: Array<{ item?: string; reason?: string }>;
  sources?: Array<{ claim?: string; source?: string; url?: string | null }>;
  complete?: boolean;
  job_id?: string;
  metadata?: {
    manual_flags?: string[];
    full_memo?: string;
    routed_to?: string;
    draft_type?: string;
    citation_verification_summary?: string;
    document_lint?: { passed?: boolean; issues?: string[] };
  };
};

function extractMatterId(query: string): string | null {
  const match = query.match(/\b(AOD-\d+)\b/i);
  return match ? match[1].toUpperCase() : null;
}

function resolveMatterId(q: string, fallback?: string | null): string | null {
  return extractMatterId(q) ?? (fallback ? fallback.toUpperCase() : null);
}

function isAgentQuery(q: string): boolean {
  const ql = q.toLowerCase();
  if (ql.startsWith("pm:")) return true;
  if (/\b(summarize|summary|status of|tell me about|brief me on)\b/i.test(q) && !/\b(research|draft|audit|mapping)\b/i.test(q)) {
    return false;
  }
  return /\b(research|memo|strategy|pattern|similar|analyze|agent|dispatch|draft|audit|mapping)\b/i.test(q);
}

function isSummarizeQuery(q: string): boolean {
  return /\b(summarize|summary|status of|tell me about|brief me on|what's on)\b/i.test(q);
}

function isDueQuery(q: string): boolean {
  const ql = q.toLowerCase();
  return (
    ql.includes("due this week") ||
    ql.includes("due week") ||
    ql.includes("what's due") ||
    ql.includes("whats due") ||
    ql.includes("due soon")
  );
}

function isOverdueQuery(q: string): boolean {
  const ql = q.toLowerCase();
  return ql.includes("overdue") || ql.includes("past due");
}

function isNoteQuery(q: string): boolean {
  const trimmed = q.trim();
  if (/^note:\s*/i.test(trimmed)) return true;
  return /\b(add a note|create a note|add note)\b/i.test(trimmed);
}

function noteContent(q: string): string {
  const trimmed = q.trim();
  if (/^note:\s*/i.test(trimmed)) return trimmed.replace(/^note:\s*/i, "").trim();
  return trimmed
    .replace(/\b(add a note|create a note|add note)\b\s*(about|on|for|to)?\s*/i, "")
    .replace(/\b(AOD-\d+)\b/gi, "")
    .trim();
}

function normalizeInstruction(q: string): string {
  const trimmed = q.trim();
  if (trimmed.toLowerCase().startsWith("pm:")) {
    return trimmed.slice(3).trim() || trimmed;
  }
  return trimmed;
}

async function buildMatterBriefing(matterId: string) {
  const matter = await getMatterByCode(matterId);
  if (!matter) return null;

  const [tasks, notes, elements] = await Promise.all([
    listTasksForMatter(matterId),
    listNotesForMatter(matterId),
    listLegalElements(matterId),
  ]);

  const openTasks = tasks.filter((t) => t.status !== "Done");
  const overdue = openTasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date());
  const dueSoon = openTasks.filter((t) => {
    if (!t.dueDate) return false;
    const ms = new Date(t.dueDate).getTime() - Date.now();
    return ms >= 0 && ms <= 7 * 24 * 60 * 60 * 1000;
  });
  const gapElements = elements.filter(
    (e) => /gap|partial|weak/i.test(e.assessment) || Boolean(e.keyGap?.trim()),
  );
  const recentNotes = [...notes].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 3);

  const sections: Array<{ heading: string; lines: string[] }> = [
    {
      heading: "Matter",
      lines: [
        `${matter.matterId} · ${matter.title || matter.clientName}`,
        [matter.caseType, matter.country, matter.posture].filter(Boolean).join(" · ") || "No type/country/posture",
        `Status: ${matter.status || "Unknown"}`,
        matter.nextDeadline ? `Next deadline: ${matter.nextDeadline}` : "No matter deadline on file",
        matter.summary ? matter.summary.slice(0, 400) : "No summary on file",
      ],
    },
    {
      heading: "Tasks",
      lines:
        openTasks.length === 0
          ? ["No open tasks."]
          : [
              `${openTasks.length} open (${overdue.length} overdue, ${dueSoon.length} due within 7 days)`,
              ...openTasks.slice(0, 5).map((t) => {
                const due = t.dueDate ? ` due ${t.dueDate}` : "";
                return `• ${t.description}${due} [${t.priority}]`;
              }),
            ],
    },
    {
      heading: "Assessment",
      lines:
        gapElements.length === 0
          ? ["No flagged element gaps."]
          : gapElements.slice(0, 5).map((e) => `• ${e.element}: ${e.keyGap || e.assessment}`),
    },
    {
      heading: "Recent notes",
      lines:
        recentNotes.length === 0
          ? ["No notes yet."]
          : recentNotes.map((n) => `• ${n.content.slice(0, 120)}${n.content.length > 120 ? "…" : ""}`),
    },
  ];

  return {
    type: "briefing" as const,
    matterId,
    title: matter.title || matter.matterId,
    sections,
  };
}

async function tasksOverdue() {
  const now = Date.now();
  const tasks = await listAllTasks();
  const hits = tasks
    .filter((t) => t.status !== "Done" && t.dueDate)
    .filter((t) => new Date(t.dueDate!).getTime() < now)
    .sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)))
    .slice(0, 25)
    .map((t) => ({
      matterId: t.matterId,
      description: t.description,
      dueDate: t.dueDate,
      status: t.status,
      priority: t.priority,
    }));
  return { type: "tasks_due" as const, label: "Overdue tasks", tasks: hits };
}

async function tasksDueThisWeek() {
  const now = Date.now();
  const end = now + 7 * 24 * 60 * 60 * 1000;
  const tasks = await listAllTasks();
  const hits = tasks
    .filter((t) => t.status !== "Done" && t.dueDate)
    .filter((t) => {
      const ts = new Date(t.dueDate!).getTime();
      return ts >= now && ts <= end;
    })
    .sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)))
    .slice(0, 25)
    .map((t) => ({
      matterId: t.matterId,
      description: t.description,
      dueDate: t.dueDate,
      status: t.status,
      priority: t.priority,
    }));
  return { type: "tasks_due" as const, label: "Due this week", tasks: hits };
}

async function dispatchToPm(matterId: string, instruction: string) {
  try {
    const resp = await fetch(`${API}/agents/pm/dispatch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matter_id: matterId, instruction, priority: "normal" }),
    });
    const data = (await resp.json()) as AgentDispatchResult;
    if (!resp.ok) {
      return NextResponse.json({
        type: "message",
        message: `Agent dispatch failed (${resp.status}). Start the API service or try again later.`,
      });
    }
    const gapStrings =
      data.gaps ??
      (data.gap_questions ?? [])
        .map((g) => g.question)
        .filter((x): x is string => Boolean(x));
    const nextSteps = data.next_steps && data.next_steps.length ? data.next_steps : undefined;
    const uncertainties =
      data.uncertain
        ?.map((u) => {
          const item = u.item?.trim();
          const reason = u.reason?.trim();
          if (item && reason) return `${item} - ${reason}`;
          return item || reason || null;
        })
        .filter((x): x is string => Boolean(x)) ?? [];
    const sources =
      data.sources
        ?.map((s) => {
          const parts = [s.claim, s.source].filter(Boolean);
          const label = parts.join(" - ").trim();
          if (!label) return null;
          return { label, url: s.url ?? undefined };
        })
        .filter((x): x is { label: string; url: string | undefined } => Boolean(x)) ?? [];
    const manualFlags =
      data.metadata?.manual_flags && data.metadata.manual_flags.length
        ? data.metadata.manual_flags
        : gapStrings?.filter((g) => g.toUpperCase().includes("MANUAL FLAG")) ?? [];

    const rawMemo = data.metadata?.full_memo;
    let fullMemo: string | undefined;
    let fullMemoTruncated = false;
    if (typeof rawMemo === "string" && rawMemo.length > 0) {
      if (rawMemo.length > FULL_MEMO_MAX_CHARS) {
        fullMemo = rawMemo.slice(0, FULL_MEMO_MAX_CHARS);
        fullMemoTruncated = true;
      } else {
        fullMemo = rawMemo;
      }
    }

    const payload: Record<string, unknown> = {
      type: "agent",
      matterId,
      agent: data.agent ?? data.agent_name ?? data.metadata?.routed_to ?? "pm",
      summary: data.summary ?? "Dispatch complete.",
      gaps: gapStrings,
      nextSteps,
      uncertainties: uncertainties.length ? uncertainties : undefined,
      sources: sources.length ? sources : undefined,
      manualFlags: manualFlags.length ? manualFlags : undefined,
      complete: data.complete ?? true,
      jobId: data.job_id,
    };
    if (fullMemo !== undefined) {
      payload.fullMemo = fullMemo;
    }
    if (fullMemoTruncated) {
      payload.fullMemoTruncated = true;
    }
    const citationSummary =
      typeof data.metadata?.citation_verification_summary === "string"
        ? data.metadata.citation_verification_summary
        : undefined;
    const draftType =
      typeof data.metadata?.draft_type === "string" ? data.metadata.draft_type : undefined;
    const lintMeta = data.metadata?.document_lint as { passed?: boolean } | undefined;
    if (citationSummary) payload.citationVerification = citationSummary;
    if (draftType) payload.draftType = draftType;
    if (lintMeta && typeof lintMeta.passed === "boolean") {
      payload.documentLintPassed = lintMeta.passed;
    }
    return NextResponse.json(payload);
  } catch {
    return NextResponse.json({
      type: "agent",
      matterId,
      agent: "pm_orchestrator",
      summary:
        "PM dispatch queued locally. The API service is offline; reconnect Docker and retry for a full research memo.",
      gaps: ["API offline: start docker compose for live agent output."],
      complete: false,
    });
  }
}

export async function POST(req: Request) {
  const body = (await req.json()) as { query?: string; matterId?: string };
  const q = (body.query ?? "").trim();
  if (!q) return NextResponse.json({ type: "empty" });

  const ql = q.toLowerCase();
  const matters = await listMatters();
  const contextMatter = body.matterId ?? null;

  if (isDueQuery(q)) {
    return NextResponse.json(await tasksDueThisWeek());
  }

  if (isOverdueQuery(q)) {
    return NextResponse.json(await tasksOverdue());
  }

  if (isNoteQuery(q)) {
    const matterId = resolveMatterId(q, contextMatter);
    const content = noteContent(q);
    if (!matterId) {
      return NextResponse.json({
        type: "message",
        message: "Open a matter or include AOD-#### to save a note. Example: note: Client interview summary",
      });
    }
    if (!content) {
      return NextResponse.json({
        type: "message",
        message: "Add note text after note: — e.g. note: Client interview summary",
      });
    }
    const note = await createNoteForMatter(matterId, content, "Associate");
    return NextResponse.json({
      type: "note_created",
      matterId,
      noteId: note.id,
      content: note.content,
    });
  }

  if (isSummarizeQuery(q)) {
    const matterId = resolveMatterId(q, contextMatter) ?? matters[0]?.matterId;
    if (!matterId) {
      return NextResponse.json({ type: "message", message: "No matter found to summarize." });
    }
    const briefing = await buildMatterBriefing(matterId);
    if (!briefing) {
      return NextResponse.json({ type: "message", message: `Matter ${matterId} not found.` });
    }
    return NextResponse.json(briefing);
  }

  if (isAgentQuery(q)) {
    const matterId =
      resolveMatterId(q, contextMatter) ?? matters[0]?.matterId ?? "AOD-1001";
    const instruction = normalizeInstruction(q);
    return dispatchToPm(matterId, instruction);
  }

  const direct = matters.find((m) => m.matterId.toLowerCase() === ql || m.id.toLowerCase() === ql);
  if (direct) return NextResponse.json({ type: "matter", matter: direct });

  const partial = matters.filter(
    (m) =>
      m.clientName.toLowerCase().includes(ql) ||
      m.matterId.toLowerCase().includes(ql) ||
      m.caseType.toLowerCase().includes(ql) ||
      (m.title ?? "").toLowerCase().includes(ql),
  );
  if (partial.length) return NextResponse.json({ type: "matters", matters: partial });

  return NextResponse.json({
    type: "message",
    message:
      "Try: summarize AOD-1001 · due this week · overdue · note: … · pm:research …",
  });
}
