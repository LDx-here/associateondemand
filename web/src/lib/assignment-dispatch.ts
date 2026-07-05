import type { AssignmentTier } from "./types";

export type AssignmentDispatchResult = {
  started: boolean;
  agent?: string;
  summary?: string;
  jobId?: string;
  complete?: boolean;
  /** True when PM returned a reviewable memo/draft (metadata.full_memo). */
  deliverableReady?: boolean;
  documentLintPassed?: boolean;
  error?: string;
};

const BLOCKING_GAP_MARKERS = [
  "blocker:",
  "anthropic",
  "llm unavailable",
  "llm call failed",
  "skill file missing",
  "not wired yet",
  "not configured",
];

function hasBlockingGaps(gaps: string[] | undefined): boolean {
  if (!gaps?.length) return false;
  return gaps.some((gap) => {
    const lower = gap.toLowerCase();
    return BLOCKING_GAP_MARKERS.some((marker) => lower.includes(marker));
  });
}

/** Map assignment intake to a PM orchestrator instruction (keyword routing in pm_orchestrator). */
export function buildAssignmentPmInstruction(
  matterId: string,
  deliverableType: string,
  tier: AssignmentTier,
  facts: string,
): string {
  const factsSnippet = facts.trim().slice(0, 600);
  const lower = deliverableType.toLowerCase();

  if (lower.includes("mass") && lower.includes("audit")) {
    return `mass audit ${matterId}`;
  }
  if (lower.includes("legal mapping")) {
    return `legal mapping elements ${matterId}`;
  }
  if (lower.includes("cover letter")) {
    return `draft cover letter ${matterId}. ${factsSnippet}`;
  }
  if (lower.includes("aos") || lower.includes("discretionary")) {
    return `draft aos discretionary brief ${matterId}. ${factsSnippet}`;
  }
  if (lower.includes("hearing packet") || lower.includes("exhibit")) {
    return `draft hearing packet exhibit organization ${matterId}. ${factsSnippet}`;
  }
  if (lower.includes("motion") || lower.includes("short filing")) {
    return `draft motion ${matterId}. ${factsSnippet}`;
  }
  if (lower.includes("citation verification") || lower.includes("citation package")) {
    return `pm:research citation verification package ${matterId}. ${factsSnippet}`;
  }
  if (tier === "Research" || lower.includes("research memo")) {
    return `pm:research ${matterId} — ${deliverableType}. ${factsSnippet}`;
  }
  if (tier === "Custom") {
    return `pm:research scope custom deliverable "${deliverableType}" for ${matterId}. ${factsSnippet}`;
  }
  return `draft ${deliverableType.toLowerCase()} ${matterId}. ${factsSnippet}`;
}

export async function dispatchAssignmentToPm(
  matterId: string,
  deliverableType: string,
  tier: AssignmentTier,
  facts: string,
): Promise<AssignmentDispatchResult> {
  const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  const instruction = buildAssignmentPmInstruction(matterId, deliverableType, tier, facts);

  try {
    const resp = await fetch(`${api}/agents/pm/dispatch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matter_id: matterId, instruction, priority: "normal" }),
      signal: AbortSignal.timeout(180_000),
    });
    const data = (await resp.json()) as {
      agent?: string;
      agent_name?: string;
      summary?: string;
      job_id?: string;
      complete?: boolean;
      detail?: string;
      gaps?: string[];
      metadata?: {
        full_memo?: string;
        routed_to?: string;
        document_lint?: { passed?: boolean };
      };
    };
    if (!resp.ok) {
      return { started: false, error: data.detail ?? `PM dispatch failed (${resp.status})` };
    }
    const meta = data.metadata;
    const hasWorkProduct = Boolean(meta?.full_memo?.trim());
    const deliverableReady = hasWorkProduct && !hasBlockingGaps(data.gaps);
    const lintMeta = meta?.document_lint;
    return {
      started: true,
      agent: data.agent ?? data.agent_name ?? meta?.routed_to ?? "pm_orchestrator",
      summary: data.summary,
      jobId: data.job_id,
      complete: data.complete ?? true,
      deliverableReady,
      documentLintPassed: typeof lintMeta?.passed === "boolean" ? lintMeta.passed : undefined,
    };
  } catch (err) {
    return {
      started: false,
      error: err instanceof Error ? err.message : "PM dispatch unavailable",
    };
  }
}
