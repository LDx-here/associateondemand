import type { CaseAssessment } from "./types";

export function emptyCaseAssessment(matterId: string): CaseAssessment {
  return {
    matterId,
    courtAgency: "",
    judgeOfficer: "",
    currentStage: "",
    filingHistory: "",
    representationsOnRecord: "",
    vulnerability: "",
    deadlineRisk: "",
    additionalDeadlines: "",
    claimType: "",
    legalStandard: "",
    claimElementsNotes: "",
    documentsInFile: "",
    areasToStrengthen: "",
    overallAssessment: "",
    immediateActions: ["", "", "", ""],
    lastClientContact: "",
    outstandingClientTasks: "",
    nextScheduledContact: "",
    attorneyReviewNeeded: "",
    strategyQuestions: "",
    reminders: "",
    reviewedBy: "",
    reviewDate: "",
    referredTo: "",
    escalationRequired: "",
  };
}

export function parseCaseAssessment(raw: unknown, matterId: string): CaseAssessment {
  if (!raw || typeof raw !== "string" || !raw.trim()) {
    return emptyCaseAssessment(matterId);
  }
  try {
    const parsed = JSON.parse(raw) as Partial<CaseAssessment>;
    const base = emptyCaseAssessment(matterId);
    return {
      ...base,
      ...parsed,
      matterId,
      immediateActions: normalizeActions(parsed.immediateActions),
    };
  } catch {
    return { ...emptyCaseAssessment(matterId), overallAssessment: raw };
  }
}

function normalizeActions(value: unknown): CaseAssessment["immediateActions"] {
  if (Array.isArray(value)) {
    const slots = value.map(String).slice(0, 4);
    while (slots.length < 4) slots.push("");
    return slots as CaseAssessment["immediateActions"];
  }
  return ["", "", "", ""];
}

export function serializeCaseAssessment(assessment: CaseAssessment): string {
  return JSON.stringify(assessment);
}

export const COMMAND_PREFILL_EVENT = "aod:command-prefill";

export function prefillCommandPanel(query: string, autoDispatch = false): void {
  window.dispatchEvent(
    new CustomEvent(COMMAND_PREFILL_EVENT, { detail: { query, autoDispatch } }),
  );
}
