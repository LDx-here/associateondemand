/** Client-side helpers for `/api/command` agent dispatch. */

export type AgentCommandResult = {
  type: "agent";
  matterId: string;
  agent?: string;
  summary?: string;
  gaps?: string[];
  /**
   * BUILD_SPEC next steps surfaced from AgentResult.next_steps / anchor_next.
   */
  nextSteps?: string[];
  /**
   * Flattened view of AgentResult.uncertain and gap_questions.
   */
  uncertainties?: string[];
  /**
   * Structured source list with optional URLs.
   */
  sources?: Array<{ label: string; url?: string | null }>;
  /**
   * Manual flags promoted from AgentResult metadata or gap text.
   */
  manualFlags?: string[];
  complete?: boolean;
  jobId?: string;
};

export type CommandResult =
  | AgentCommandResult
  | { type: "matter"; matter: { matterId: string } }
  | { type: "matters"; matters: Array<{ matterId: string; clientName: string }> }
  | { type: "message"; message: string }
  | { type: "empty" };

export async function dispatchAgentCommand(
  query: string,
  matterId?: string,
): Promise<CommandResult> {
  const q = matterId && !query.includes(matterId) ? `${query} ${matterId}` : query;
  const resp = await fetch("/api/command", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: q.trim() }),
  });
  return (await resp.json()) as CommandResult;
}
