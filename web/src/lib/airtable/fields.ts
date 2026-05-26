/**
 * Airtable schema bindings for AssociateOnDemand (BUILD_SPEC §2).
 *
 * `TABLES` maps the logical table key used in app code to the actual
 * table name in the live Airtable base (`appqwRBpXjg9xlnhZ`). The 11
 * BUILD_SPEC tables are listed here. The base also still contains four
 * legacy eImmigration tables (`Cases`, `Clients`, `Forms`, `Questionnaires`)
 * that are intentionally NOT exposed through the app — they remain in
 * Airtable only as raw historical data and are not read by Next.js.
 *
 * Field-name constants per table use the snake_case names defined in
 * BUILD_SPEC §2. The Phase 1 base was created with title-case names
 * (`Matter ID`, `Client Name`, `Status`, …) — those legacy labels are
 * still surfaced via `LEGACY_FIELDS` so the existing data store keeps
 * working while we migrate writers and readers one table at a time.
 *
 * Schema adaptation note (see docs/constitution/BUILD_SPEC-GAP-AUDIT.md):
 * The Airtable Meta API rejects `autoNumber` field creation and refuses
 * to create `createdTime` fields. As a result, the four bootstrapped
 * tables (People, Events, Strategy Patterns, Corrections) do NOT carry
 * the BUILD_SPEC `_id` autonumber primaries (`person_id`, `event_id`,
 * `pattern_id`, `correction_id`). Relations use Airtable's built-in
 * `recXXXXXXXXXXXXXX` record IDs, exposed via the `RECORD_ID` constant
 * below. `created_at` on these tables is a writable `dateTime` column;
 * writers must set it to `new Date().toISOString()` on insert.
 */

export const TABLES = {
  matters: "Matters",
  contacts: "Contacts",
  tasks: "Tasks",
  notes: "Notes",
  documents: "Documents",
  legalElements: "Legal Elements",
  pmInbox: "PM Inbox",
  people: "People",
  events: "Events",
  strategyPatterns: "Strategy Patterns",
  corrections: "Corrections",
} as const;

export type TableKey = keyof typeof TABLES;

/**
 * Tables that exist in the live base but are intentionally excluded from
 * app reads. Listed for documentation only — never imported from app code.
 */
export const EXCLUDED_LEGACY_TABLES = [
  "Cases",
  "Clients",
  "Forms",
  "Questionnaires",
] as const;

/** BUILD_SPEC §2 field names — snake_case is authoritative going forward. */
export const SPEC_FIELDS = {
  matters: {
    matter_id: "matter_id",
    title: "title",
    case_type: "case_type",
    country: "country",
    posture: "posture",
    status: "status",
    assigned_to: "assigned_to",
    court: "court",
    judge: "judge",
    opened_date: "opened_date",
    next_hearing: "next_hearing",
    next_deadline: "next_deadline",
    summary: "summary",
    assessment_data: "assessment_data",
    created_at: "created_at",
    updated_at: "updated_at",
  },
  contacts: {
    contact_id: "contact_id",
    display_name: "display_name",
    role: "role",
    email: "email",
    phone: "phone",
    address: "address",
    linked_matters: "linked_matters",
    notes: "notes",
    created_at: "created_at",
  },
  tasks: {
    task_id: "task_id",
    matter_id: "matter_id",
    description: "description",
    due_date: "due_date",
    assigned_to: "assigned_to",
    status: "status",
    priority: "priority",
    is_filing_deadline: "is_filing_deadline",
    created_from_note: "created_from_note",
    created_from_agent: "created_from_agent",
    completed_at: "completed_at",
    completed_by: "completed_by",
    completion_docs: "completion_docs",
    completion_note: "completion_note",
    created_at: "created_at",
  },
  notes: {
    note_id: "note_id",
    matter_id: "matter_id",
    author: "author",
    content: "content",
    type: "type",
    is_correction: "is_correction",
    created_at: "created_at",
  },
  legalElements: {
    element_id: "element_id",
    matter_id: "matter_id",
    element_name: "element_name",
    assessment: "assessment",
    key_gap: "key_gap",
    next_action: "next_action",
    supporting_facts: "supporting_facts",
    supporting_cases: "supporting_cases",
    notes: "notes",
    last_updated_by: "last_updated_by",
    updated_at: "updated_at",
  },
  documents: {
    doc_id: "doc_id",
    matter_id: "matter_id",
    title: "title",
    category: "category",
    practice_area: "practice_area",
    file_path: "file_path",
    file_type: "file_type",
    tags: "tags",
    uploaded_by: "uploaded_by",
    ocr_status: "ocr_status",
    pii_tier: "pii_tier",
    created_at: "created_at",
  },
  events: {
    summary: "summary",
    matter_id: "matter_id",
    type: "type",
    date: "date",
    time: "time",
    description: "description",
    location: "location",
    calendar_synced: "calendar_synced",
    google_calendar_id: "google_calendar_id",
    created_at: "created_at",
  },
  people: {
    name: "name",
    role: "role",
    email: "email",
    is_active: "is_active",
  },
  pmInbox: {
    inbox_id: "inbox_id",
    matter_id: "matter_id",
    agent: "agent",
    what_tried: "what_tried",
    what_needed: "what_needed",
    options: "options",
    status: "status",
    resolution: "resolution",
    created_at: "created_at",
    resolved_at: "resolved_at",
  },
  strategyPatterns: {
    fact_pattern: "fact_pattern",
    fact_pattern_detail: "fact_pattern_detail",
    matching_matters: "matching_matters",
    strategy_used: "strategy_used",
    outcome: "outcome",
    confidence: "confidence",
    correction_note: "correction_note",
    created_by: "created_by",
    created_at: "created_at",
  },
  corrections: {
    agent: "agent",
    matter_id: "matter_id",
    original_output: "original_output",
    attorney_edit: "attorney_edit",
    correction_type: "correction_type",
    reason: "reason",
    applied_to: "applied_to",
    created_at: "created_at",
  },
} as const;

/**
 * Airtable's built-in record identifier (recXXXXXXXXXXXXXX) used as the
 * relational key for People, Events, Strategy Patterns, and Corrections,
 * which deviate from BUILD_SPEC §2 because the Meta API does not support
 * creating `autoNumber` primaries. See "Schema Adaptations" in
 * docs/constitution/BUILD_SPEC-GAP-AUDIT.md.
 */
export const RECORD_ID = "id" as const;

/**
 * Legacy field map for the Phase 1 schema currently in the live base.
 * Used by `airtable-queries.ts` so the existing data store keeps working
 * until the live base is migrated to BUILD_SPEC §2 column names.
 */
export const LEGACY_FIELDS = {
  matters: {
    table: TABLES.matters,
    matterId: "Matter ID",
    clientName: "Client Name",
    caseType: "Case Type",
    status: "Status",
    proceduralPosture: "Procedural Posture",
    fidelityScore: "Fidelity Score",
    nextDeadline: "Next Deadline",
    vulnerabilityFlags: "Vulnerability Flags",
    assignedAttorney: "Assigned Attorney",
    summary: "Summary",
    caseAssessment: "Case Assessment",
  },
  tasks: {
    table: TABLES.tasks,
    matterLink: "Matter Link",
    taskName: "Task Name",
    status: "Status",
    dueDate: "Due Date",
    priority: "Priority",
    assignedTo: "Assigned To",
    aiTrigger: "AI Trigger",
  },
  notes: {
    table: TABLES.notes,
    matterLink: "Matter Link",
    content: "Content",
    author: "Author",
    date: "Date",
    type: "Type",
    requiresAction: "Requires Action",
  },
  legalElements: {
    table: TABLES.legalElements,
    matterLink: "Matter Link",
    legalElement: "Legal Element",
    extractedFact: "Extracted Fact",
    status: "Status",
  },
  documents: {
    table: TABLES.documents,
    matterLink: "Matter Link",
    title: "Title",
    category: "Category",
    uploadedAt: "Uploaded At",
  },
} as const;

/**
 * Legacy alias used by the Phase 4 codebase. New code should import
 * `LEGACY_FIELDS` (Phase 1 base shape) or `SPEC_FIELDS` (BUILD_SPEC §2).
 */
export const FIELDS = LEGACY_FIELDS;
