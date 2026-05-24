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
  clientName: string;
  caseType: string;
  status: string;
  proceduralPosture: string;
  fidelityScore: number;
  nextDeadline: string | null;
  vulnerabilityFlags: string[];
  assignedAttorney: string;
  summary: string;
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
};

export type DocumentRow = {
  id: string;
  matterId: string;
  title: string;
  category: string;
  uploadedAt: string;
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

export type DevSeed = {
  matters: Matter[];
  tasks: Task[];
  notes: Note[];
  legalElements: LegalElementRow[];
  documents: DocumentRow[];
  events: CalendarEvent[];
  auditLog?: AuditLogEntry[];
  caseAssessments?: CaseAssessment[];
};
