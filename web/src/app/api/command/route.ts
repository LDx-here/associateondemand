import { NextResponse } from "next/server";

import { listMatters } from "@/lib/data-store";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type AgentDispatchResult = {
  agent?: string;
  agent_name?: string;
  matter_id?: string;
  summary?: string;
  gaps?: string[];
  gap_questions?: Array<{ question?: string }>;
  complete?: boolean;
  job_id?: string;
};

function extractMatterId(query: string): string | null {
  const match = query.match(/\b(AOD-\d+)\b/i);
  return match ? match[1].toUpperCase() : null;
}

function isAgentQuery(q: string): boolean {
  const ql = q.toLowerCase();
  if (ql.startsWith("pm:")) return true;
  return /\b(research|memo|strategy|pattern|similar|analyze|agent|dispatch|draft|audit|mapping)\b/i.test(q);
}

function normalizeInstruction(q: string): string {
  const trimmed = q.trim();
  if (trimmed.toLowerCase().startsWith("pm:")) {
    return trimmed.slice(3).trim() || trimmed;
  }
  return trimmed;
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
    return NextResponse.json({
      type: "agent",
      matterId,
      agent: data.agent ?? data.agent_name ?? "pm",
      summary: data.summary ?? "Dispatch complete.",
      gaps: gapStrings,
      complete: data.complete ?? true,
      jobId: data.job_id,
    });
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
  const { query } = (await req.json()) as { query?: string };
  const q = (query ?? "").trim();
  if (!q) return NextResponse.json({ type: "empty" });

  const ql = q.toLowerCase();
  const matters = await listMatters();

  if (isAgentQuery(q)) {
    const matterId = extractMatterId(q) ?? matters[0]?.matterId ?? "AOD-1001";
    const instruction = normalizeInstruction(q);
    return dispatchToPm(matterId, instruction);
  }

  if (ql.includes("due this week") || ql.includes("due week")) {
    const now = Date.now();
    const end = now + 7 * 24 * 60 * 60 * 1000;
    const hits = matters.filter((m) => {
      if (!m.nextDeadline) return false;
      const ts = new Date(m.nextDeadline).getTime();
      return ts >= now && ts <= end;
    });
    return NextResponse.json({ type: "matters", matters: hits });
  }

  const direct = matters.find((m) => m.matterId.toLowerCase() === ql || m.id.toLowerCase() === ql);
  if (direct) return NextResponse.json({ type: "matter", matter: direct });

  const partial = matters.filter(
    (m) =>
      m.clientName.toLowerCase().includes(ql) ||
      m.matterId.toLowerCase().includes(ql) ||
      m.caseType.toLowerCase().includes(ql),
  );
  if (partial.length) return NextResponse.json({ type: "matters", matters: partial });

  return NextResponse.json({
    type: "message",
    message:
      "No matches. Try AOD-1001, 'due this week', or 'pm:research country conditions for AOD-1001'.",
  });
}
