export type CaseAssessment = {
  matterId: string;
  courtAgency: string;
  judgeOfficer: string;
  currentStage: string;
  filingHistory: string;
  representationsOnRecord: string;
  vulnerability: string;
  deadlineRisk: string;
  additionalDeadlines: string;
  claimType: string;
  legalStandard: string;
  claimElementsNotes: string;
  documentsInFile: string;
  areasToStrengthen: string;
  overallAssessment: string;
  immediateActions: [string, string, string, string];
  lastClientContact: string;
  outstandingClientTasks: string;
  nextScheduledContact: string;
  attorneyReviewNeeded: string;
  strategyQuestions: string;
  reminders: string;
  reviewedBy: string;
  reviewDate: string;
  referredTo: string;
  escalationRequired: string;
};

export type Matter = {
  id: string;
  matterId: string;
  /**
   * Display label for the matter. Prefers BUILD_SPEC §2 `title` (short
   * non-PII description) and falls back to the matter id. The PII
   * `Client Name` column was tombstoned to `DEPRECATED_client_name`; the
   * field stays on the type for shim compatibility but never carries PII.
   */
  clientName: string;
  /** BUILD_SPEC §2 short matter description, no client names. */
  title?: string;
  caseType: string;
  /** BUILD_SPEC §2 country of origin. */
  country?: string;
  /** BUILD_SPEC §2 single-select posture. */
  posture?: string;
  /** BUILD_SPEC §2 court (Immigration / BIA / Sixth Circuit / USCIS). */
  court?: string;
  /** BUILD_SPEC §2 assigned IJ. */
  judge?: string;
  status: string;
  /** Legacy mirror of `posture` kept for UI components that still read it. */
  proceduralPosture: string;
  fidelityScore: number;
  nextDeadline: string | null;
  /** BUILD_SPEC §2 next hearing date. */
  nextHearing?: string | null;
  vulnerabilityFlags: string[];
  assignedAttorney: string;
  summary: string;
  /** BUILD_SPEC §2 writable createdAt (Meta API can't create createdTime). */
  createdAt?: string | null;
  /** BUILD_SPEC §2 writable updatedAt — bumped on every PATCH. */
  updatedAt?: string | null;
};

export type Task = {
  id: string;
  matterId: string;
  description: string;
  dueDate: string | null;
  status: string;
  priority: string;
  isFilingDeadline: boolean;
  assignedTo?: string;
};

export type Note = {
  id: string;
  matterId: string;
  author: string;
  content: string;
  createdAt: string;
  type: string;
};

export type LegalElementRow = {
  id: string;
  matterId: string;
  element: string;
  assessment: string;
  keyGap: string;
  nextAction: string;
  supportingFacts?: string;
  supportingCases?: string;
};

export type Contact = {
  id: string;
  displayName: string;
  role: string;
  email: string;
  phone: string;
  organization: string;
  notes: string;
};

export type DocumentRow = {
  id: string;
  matterId: string;
  title: string;
  category: string;
  uploadedAt: string;
  uploadedBy?: string;
  ocrStatus?: string;
  piiTier?: string;
  fileType?: string;
};

export type CalendarEvent = {
  id: string;
  matterId: string;
  type: string;
  date: string;
  description: string;
};

export type TimelineEntry = {
  id: string;
  matterId: string;
  timestamp: string;
  actor: string;
  kind: "note" | "task_created" | "task_completed" | "document" | "event" | "agent";
  summary: string;
  href?: string;
};

export type AuditLogEntry = {
  id: string;
  matterId: string;
  timestamp: string;
  actor: string;
  agent: string;
  summary: string;
};

/**
 * PM Inbox row (BUILD_SPEC §7.5) plus the assignment-intake lifecycle
 * extension (autonomous pass 2026-07-02): a `kind: "assignment"` item
 * tracks Submitted -> In Progress -> Ready for Review -> Approved/Returned
 * in addition to the legacy agent-flagged Pending -> Resolved/Dismissed
 * flow. Both kinds share one Airtable table (`PM Inbox`) and one status
 * string column; the extra assignment metadata rides inside the `options`
 * JSON blob so no new Airtable columns are required.
 */
export type InboxItemKind = "agent" | "assignment";

export type InboxItem = {
  id: string;
  title: string;
  matterId: string;
  agent: string;
  whatTried: string;
  whatNeeded: string;
  options: string[];
  /** Structured follow-ups when options JSON embeds next_steps */
  followUpSteps: string[];
  status:
    | "Pending"
    | "Submitted"
    | "In Progress"
    | "Ready for Review"
    | "Returned"
    | "Approved"
    | "Resolved"
    | "Dismissed"
    | string;
  resolution: string;
  createdAt: string;
  resolvedAt: string | null;
  /** Defaults to "agent" for legacy/agent-flagged rows. */
  kind?: InboxItemKind;
  /** Assignment-intake metadata (kind === "assignment" only). */
  deliverableType?: string;
  tier?: string;
  facts?: string;
};

export type DevSeed = {
  matters: Matter[];
  tasks: Task[];
  notes: Note[];
  legalElements: LegalElementRow[];
  documents: DocumentRow[];
  events: CalendarEvent[];
  auditLog?: AuditLogEntry[];
  caseAssessments?: CaseAssessment[];
  inboxItems?: InboxItem[];
};
