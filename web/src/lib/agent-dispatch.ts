/** Client-side helpers for `/api/command` agent dispatch. */

export type AgentCommandResult = {
  type: "agent";
  matterId: string;
  agent?: string;
  summary?: string;
  /** Full research memo when backend includes metadata.full_memo (length-capped by /api/command). */
  fullMemo?: string;
  /** Airtable Notes row id when PM dispatch persisted the work product. */
  noteId?: string;
  /** True when memo was trimmed to FULL_MEMO_MAX_CHARS. */
  fullMemoTruncated?: boolean;
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
   * Five-Anchors facts the agent relied on (show your work).
   */
  factsReliedOn?: string[];
  /**
   * Agent workflow steps taken (anchor_next + next_steps combined when available).
   */
  stepsTaken?: string[];
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
  draftType?: string;
  citationVerification?: string;
  documentLintPassed?: boolean;
  documentLintIssues?: string[];
  /** Drafting QC flags from API metadata.draft_qc / firm_memory_applied. */
  draftQc?: {
    firmMemoryApplied?: boolean;
    matterContextPresent?: boolean;
    matterFactsPresent?: boolean;
    documentLintPassed?: boolean;
    citationsChecked?: boolean;
    attorneyReviewRequired?: boolean;
  };
  firmMemoryApplied?: boolean;
  /** PM Inbox row id when agent paused with gaps / escalation. */
  inboxItemId?: string;
  /** True when agent produced a reviewable memo/draft. */
  deliverableReady?: boolean;
  /** Assignment inbox row id when deliverable can advance to Ready for review. */
  assignmentId?: string;
  /** Options surfaced on the agent alert card (Approve/Modify/Defer). */
  alertOptions?: string[];
};

export type BriefingCommandResult = {
  type: "briefing";
  matterId: string;
  title: string;
  sections: Array<{ heading: string; lines: string[] }>;
};

export type TasksDueCommandResult = {
  type: "tasks_due";
  label?: string;
  tasks: Array<{
    matterId: string;
    description: string;
    dueDate: string | null;
    status: string;
    priority: string;
  }>;
};

export type NoteCreatedCommandResult = {
  type: "note_created";
  matterId: string;
  noteId: string;
  content: string;
};

export type CommandResult =
  | AgentCommandResult
  | BriefingCommandResult
  | TasksDueCommandResult
  | NoteCreatedCommandResult
  | { type: "matter"; matter: { matterId: string; clientName?: string } }
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
    body: JSON.stringify({ query: q.trim(), matterId: matterId ?? undefined }),
  });
  return (await resp.json()) as CommandResult;
}
