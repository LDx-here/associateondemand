/**
 * Airtable schema bindings for AssociateOnDemand (BUILD_SPEC §2).
 *
 * `TABLES` maps the logical table key used in app code to the actual
 * table name in the live Airtable base (`appqwRBpXjg9xlnhZ`). All 11
 * BUILD_SPEC tables are present. The base also still contains four
 * legacy eImmigration tables (`Cases`, `Clients`, `Forms`,
 * `Questionnaires`) that are intentionally NOT exposed through the app.
 *
 * As of 2026-05-26 every column on the 7 pre-existing tables has been
 * renamed in Airtable to the BUILD_SPEC §2 snake_case form via
 * `scripts/airtable-rename-fields.mjs` (44 renames, 4 additive columns,
 * 1 PII column tombstoned). `LEGACY_FIELDS` is retired; `SPEC_FIELDS`
 * is now the only source of truth.
 *
 * Schema adaptation notes (see docs/constitution/BUILD_SPEC-GAP-AUDIT.md):
 *   1. Airtable Meta API refuses to create `autoNumber` and `createdTime`
 *      fields, so People / Events / Strategy Patterns / Corrections use
 *      Single line text primaries and a writable `dateTime` `created_at`.
 *      Relations resolve via Airtable's built-in `recXXXXXXXXXXXXXX`
 *      record IDs (see `RECORD_ID`).
 *   2. Airtable Meta API also refuses to DELETE fields on this base. The
 *      `Client Name` PII column on Matters was tombstoned to
 *      `DEPRECATED_client_name` and no app code references it.
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

/**
 * Tombstoned columns kept in the base for audit but never read by the app.
 * Backed up to `data/backups/airtable-client-names-*.jsonl` before
 * tombstoning. Removing them entirely requires the Airtable UI because the
 * Meta API does not support field DELETE on this plan.
 */
export const TOMBSTONED_FIELDS = {
  matters: ["DEPRECATED_client_name"],
} as const;

/** BUILD_SPEC §2 field names — the only authoritative field map. */
export const SPEC_FIELDS = {
  matters: {
    matter_id: "matter_id",
    title: "title",
    case_type: "case_type",
    country: "country",
    posture: "posture",
    court: "court",
    judge: "judge",
    status: "status",
    assigned_to: "assigned_to",
    priority: "priority",
    opened_date: "opened_date",
    next_deadline: "next_deadline",
    next_hearing: "next_hearing",
    summary: "summary",
    assessment_data: "assessment_data",
    created_at: "created_at",
    updated_at: "updated_at",
    events: "Events",
    strategy_patterns: "Strategy Patterns",
    corrections: "Corrections",
  },
  contacts: {
    display_name: "display_name",
    role: "role",
    email: "email",
    phone: "phone",
    organization: "organization",
    notes: "notes",
  },
  tasks: {
    description: "description",
    matter_id: "matter_id",
    status: "status",
    priority: "priority",
    due_date: "due_date",
    assigned_to: "assigned_to",
    created_from_agent: "created_from_agent",
  },
  notes: {
    content: "content",
    matter_id: "matter_id",
    author: "author",
    created_at: "created_at",
    type: "type",
  },
  legalElements: {
    element_name: "element_name",
    matter_id: "matter_id",
    assessment: "assessment",
    key_gap: "key_gap",
    next_action: "next_action",
    supporting_facts: "supporting_facts",
    supporting_cases: "supporting_cases",
  },
  documents: {
    title: "title",
    matter_id: "matter_id",
    category: "category",
    created_at: "created_at",
    uploaded_by: "uploaded_by",
    ocr_status: "ocr_status",
    pii_tier: "pii_tier",
    file_type: "file_type",
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
    title: "title",
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
 * Convenience alias — application code may import `FIELDS` to obtain the
 * BUILD_SPEC §2 map. The legacy `LEGACY_FIELDS` export was retired on
 * 2026-05-26 after the live base columns were renamed to snake_case.
 */
export const FIELDS = SPEC_FIELDS;

/**
 * Airtable's built-in record identifier (`recXXXXXXXXXXXXXX`) used as the
 * relational key for People, Events, Strategy Patterns, and Corrections,
 * which deviate from BUILD_SPEC §2 because the Meta API does not support
 * creating `autoNumber` primaries. See "Schema Adaptations" in
 * docs/constitution/BUILD_SPEC-GAP-AUDIT.md.
 */
export const RECORD_ID = "id" as const;
