/**
 * Matter-type task templates — suggested checklist items from practice area
 * and deliverable catalog (not auto-created; attorney applies from Tasks tab).
 */

import { DELIVERABLE_CATALOG } from "./deliverable-catalog";
import { resolvePracticeArea } from "./practice-area-facts";

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
