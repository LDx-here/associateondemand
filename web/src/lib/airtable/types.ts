/**
 * Re-exports app-level domain types from `lib/types.ts` under the
 * BUILD_SPEC §3 `lib/airtable/types.ts` path. Keeping a single source of
 * truth in `lib/types.ts` for now to avoid duplicate definitions; new
 * Airtable-shape types should land here.
 */

export type {
  Matter,
  Task,
  Note,
  LegalElementRow,
  DocumentRow,
  CalendarEvent,
  TimelineEntry,
  CaseAssessment,
  AuditLogEntry,
  DevSeed,
} from "../types";
