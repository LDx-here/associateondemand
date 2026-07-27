/**
 * Matter-type task templates — suggested checklist items from practice area
 * and deliverable catalog (not auto-created; attorney applies from Tasks tab).
 */

import { DELIVERABLE_CATALOG } from "./deliverable-catalog";
import type { MatterLifecycleStage } from "./matter-lifecycle-stage";
import { isImmigrationPracticeArea, resolvePracticeArea } from "./practice-area-facts";

export type MatterTaskTemplate = {
  id: string;
  description: string;
  priority: "High" | "Medium" | "Low";
  isFilingDeadline?: boolean;
  source: "practice_area" | "deliverable";
};

const IMMIGRATION_TASKS: MatterTaskTemplate[] = [
  {
    id: "imm-entry-record",
    description: "Obtain I-94 / entry record and passport biographic page",
    priority: "High",
    source: "practice_area",
  },
  {
    id: "imm-prior-filings",
    description: "Pull prior USCIS / EOIR filing history and receipt notices",
    priority: "High",
    source: "practice_area",
  },
  {
    id: "imm-medical",
    description: "Schedule immigration medical exam (I-693) if AOS path",
    priority: "Medium",
    source: "practice_area",
  },
  {
    id: "imm-country-conditions",
    description: "Update country conditions evidence (State Dept + NGO sources)",
    priority: "Medium",
    source: "practice_area",
  },
];

const PI_TASKS: MatterTaskTemplate[] = [
  {
    id: "pi-records",
    description: "Request complete medical records and billing ledgers",
    priority: "High",
    source: "practice_area",
  },
  {
    id: "pi-liens",
    description: "Identify health insurance / Medicare liens",
    priority: "Medium",
    source: "practice_area",
  },
  {
    id: "pi-demand-deadline",
    description: "Confirm statute of limitations / demand deadline",
    priority: "High",
    isFilingDeadline: true,
    source: "practice_area",
  },
];

const DELIVERABLE_TASKS: Record<string, MatterTaskTemplate[]> = {
  "aos-discretionary-brief": [
    {
      id: "aos-facts-complete",
      description: "Complete AOS discretionary facts checklist on Documents tab",
      priority: "High",
      source: "deliverable",
    },
    {
      id: "aos-hardship-evidence",
      description: "Gather extreme hardship evidence for qualifying relative",
      priority: "High",
      source: "deliverable",
    },
  ],
  "hearing-packet": [
    {
      id: "hearing-index",
      description: "Prepare hearing exhibit index and witness list",
      priority: "High",
      source: "deliverable",
    },
    {
      id: "hearing-brief",
      description: "Draft pre-hearing brief or statement of issues",
      priority: "High",
      source: "deliverable",
    },
  ],
  "research-memo": [
    {
      id: "research-scope",
      description: "Confirm research question and jurisdiction for memo",
      priority: "Medium",
      source: "deliverable",
    },
  ],
  "custom-motion": [
    {
      id: "motion-relief",
      description: "Identify relief requested and procedural vehicle (motion type)",
      priority: "High",
      source: "deliverable",
    },
  ],
};

/**
 * Lifecycle-stage checklists — fire automatically on stage transition (see
 * `/api/matters/[matterId]/stage`), unlike the click-to-add templates above.
 */
const IMMIGRATION_STAGE_TASKS: Record<MatterLifecycleStage, MatterTaskTemplate[]> = {
  Intake: [
    { id: "imm-entry-record", description: "Obtain I-94 / entry record and passport biographic page", priority: "High", source: "practice_area" },
    { id: "imm-prior-filings", description: "Pull prior USCIS / EOIR filing history and receipt notices", priority: "High", source: "practice_area" },
    { id: "imm-conflict-engagement", description: "Run conflict check and open client engagement letter", priority: "High", source: "practice_area" },
  ],
  Active: [
    { id: "imm-medical", description: "Schedule immigration medical exam (I-693) if AOS path", priority: "Medium", source: "practice_area" },
    { id: "imm-country-conditions", description: "Update country conditions evidence (State Dept + NGO sources)", priority: "Medium", source: "practice_area" },
    { id: "imm-evidence-checklist", description: "Confirm supporting evidence checklist with client", priority: "Medium", source: "practice_area" },
  ],
  "Filed/Awaiting Decision": [
    { id: "imm-receipt-biometrics", description: "Confirm filing receipt number and biometrics notice", priority: "High", source: "practice_area" },
    { id: "imm-rfe-deadline", description: "Calendar RFE/NOID response deadline if issued", priority: "High", isFilingDeadline: true, source: "practice_area" },
    { id: "imm-status-monitor", description: "Monitor case status (USCIS/EOIR portal) monthly", priority: "Low", source: "practice_area" },
  ],
  Resolution: [
    { id: "imm-decision-review", description: "Review decision/order and confirm next steps with client", priority: "High", source: "practice_area" },
    { id: "imm-appeal-deadline", description: "Calendar appeal/motion deadline if adverse decision", priority: "High", isFilingDeadline: true, source: "practice_area" },
    { id: "imm-closing-letter", description: "Prepare closing letter", priority: "Medium", source: "practice_area" },
  ],
  Closed: [
    { id: "imm-return-documents", description: "Return original documents to client", priority: "Medium", source: "practice_area" },
    { id: "imm-archive-file", description: "Archive file per retention policy", priority: "Low", source: "practice_area" },
  ],
};

const PI_STAGE_TASKS: Record<MatterLifecycleStage, MatterTaskTemplate[]> = {
  Intake: [
    { id: "pi-representation-letter", description: "Send letter of representation to all known parties", priority: "High", source: "practice_area" },
    { id: "pi-records", description: "Request complete medical records and billing ledgers", priority: "High", source: "practice_area" },
    { id: "pi-demand-deadline", description: "Confirm statute of limitations / demand deadline", priority: "High", isFilingDeadline: true, source: "practice_area" },
  ],
  Active: [
    { id: "pi-liens", description: "Identify health insurance / Medicare liens", priority: "Medium", source: "practice_area" },
    { id: "pi-treatment-tracking", description: "Track ongoing treatment and request updated records monthly", priority: "Medium", source: "practice_area" },
    { id: "pi-damages-documentation", description: "Document lost wages and out-of-pocket expenses", priority: "Medium", source: "practice_area" },
  ],
  "Filed/Awaiting Decision": [
    { id: "pi-demand-sent", description: "Send demand letter to carrier", priority: "High", source: "practice_area" },
    { id: "pi-carrier-deadline", description: "Calendar carrier response deadline", priority: "High", isFilingDeadline: true, source: "practice_area" },
    { id: "pi-negotiation-prep", description: "Prepare for negotiation / mediation", priority: "Medium", source: "practice_area" },
  ],
  Resolution: [
    { id: "pi-settlement-review", description: "Review settlement/verdict and lien resolution", priority: "High", source: "practice_area" },
    { id: "pi-disbursement-statement", description: "Prepare settlement statement and disbursement", priority: "High", source: "practice_area" },
    { id: "pi-release-signoff", description: "Confirm client sign-off on release", priority: "Medium", source: "practice_area" },
  ],
  Closed: [
    { id: "pi-disburse-funds", description: "Disburse settlement funds", priority: "High", source: "practice_area" },
    { id: "pi-archive-file", description: "Close file and archive per retention policy", priority: "Low", source: "practice_area" },
  ],
};

const GENERIC_STAGE_TASKS: Record<MatterLifecycleStage, MatterTaskTemplate[]> = {
  Intake: [
    { id: "gen-conflict-engagement", description: "Run conflict check and open client engagement letter", priority: "High", source: "practice_area" },
  ],
  Active: [],
  "Filed/Awaiting Decision": [],
  Resolution: [],
  Closed: [
    { id: "gen-archive-file", description: "Archive file per retention policy", priority: "Low", source: "practice_area" },
  ],
};

/** Stage-triggered checklist for automated task creation (see `/api/matters/[matterId]/stage`). */
export function stageTaskTemplates(
  caseType: string,
  stage: MatterLifecycleStage,
): MatterTaskTemplate[] {
  const area = resolvePracticeArea(caseType);
  const byStage = isImmigrationPracticeArea(area)
    ? IMMIGRATION_STAGE_TASKS
    : area === "personal_injury"
      ? PI_STAGE_TASKS
      : GENERIC_STAGE_TASKS;
  return byStage[stage] ?? [];
}

export function matterTaskTemplates(caseType: string, deliverableId?: string): MatterTaskTemplate[] {
  const area = resolvePracticeArea(caseType);
  const base = area === "personal_injury" ? PI_TASKS : IMMIGRATION_TASKS;
  const deliverable = deliverableId ? DELIVERABLE_TASKS[deliverableId] ?? [] : [];
  const seen = new Set<string>();
  return [...base, ...deliverable].filter((t) => {
    if (seen.has(t.id)) return false;
    seen.add(t.id);
    return true;
  });
}

export function deliverableLabel(deliverableId: string): string {
  return DELIVERABLE_CATALOG.find((d) => d.id === deliverableId)?.name ?? deliverableId;
}
