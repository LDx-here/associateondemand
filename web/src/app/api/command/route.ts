import { NextResponse } from "next/server";

import { listMatters } from "@/lib/data-store";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type AgentDispatchResult = {
  agent: string;
  matter_id?: string;
  summary?: string;
  gaps?: string[];
  complete?: boolean;
  job_id?: string;
};

function extractMatterId(query: string): string | null {
  const match = query.match(/\b(AOD-\d+)\b/i);
  return match ? match[1].toUpperCase() : null;
}

function isAgentQuery(q: string): boolean {
  return /\b(research|memo|strategy|pattern|similar|analyze|agent|dispatch)\b/i.test(q);
}

export async function POST(req: Request) {
  const { query } = (await req.json()) as { query?: string };
  const q = (query ?? "").trim();
  if (!q) return NextResponse.json({ type: "empty" });

  const ql = q.toLowerCase();
  const matters = await listMatters();

  if (isAgentQuery(q)) {
    const matterId = extractMatterId(q) ?? matters[0]?.matterId ?? "AOD-1001";
    try {
      const resp = await fetch(`${API}/agents/pm/dispatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matter_id: matterId, instruction: q, priority: "normal" }),
      });
      const data = (await resp.json()) as AgentDispatchResult;
      if (!resp.ok) {
        return NextResponse.json({ type: "message", message: `Agent dispatch failed: ${resp.status}` });
      }
      return NextResponse.json({
        type: "agent",
        matterId,
        agent: data.agent,
        summary: data.summary,
        gaps: data.gaps ?? [],
        complete: data.complete ?? true,
        jobId: data.job_id,
      });
    } catch (err) {
      return NextResponse.json({
        type: "message",
        message: err instanceof Error ? err.message : "API unreachable — start docker compose.",
      });
    }
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
    message: "No matches. Try AOD-1001, 'due this week', or 'research country conditions for AOD-1001'.",
  });
}
