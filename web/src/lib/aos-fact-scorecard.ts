/**
 * AOS fact scorecard — substantive follow-up questions (no LLM required).
 * Runs against saved/extracted drafting facts + AOS library expectations.
 */

import {
  draftingFactsCompleteness,
  fieldsForDeliverable,
  type DraftingFactsPayload,
} from "./practice-area-facts";

export type ScorecardQuestion = {
  id: string;
  fieldIds: string[];
  question: string;
  priority: "high" | "medium";
  reason: string;
};

export type ScorecardResult = {
  questions: ScorecardQuestion[];
  completeness: { filled: number; total: number; percent: number };
};

function fieldText(payload: DraftingFactsPayload, fieldId: string): string {
  const val = payload.fields[fieldId];
  if (Array.isArray(val)) return val.join(" ");
  return String(val ?? "").trim();
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

/** Deterministic scorecard — max 5 substantive questions. */
export function runAosFactScorecard(payload: DraftingFactsPayload): ScorecardResult {
  const completeness = draftingFactsCompleteness(payload, "aos-discretionary-brief");
  const questions: ScorecardQuestion[] = [];
  const defs = fieldsForDeliverable("aos-discretionary-brief", payload.practiceArea);
  const requiredMissing = defs.filter((d) => d.required && !fieldText(payload, d.id));

  for (const def of requiredMissing.slice(0, 2)) {
    questions.push({
      id: `missing-${def.id}`,
      fieldIds: [def.id],
      question: `${def.label} is still blank — what should the brief say?`,
      priority: "high",
      reason: `Required for ${def.feedsSection ?? "draft sections"}.`,
    });
  }

  const sectionAFacts = fieldText(payload, "sectionAFacts");
  const sectionAHeading = fieldText(payload, "sectionAHeading");
  if (sectionAFacts && wordCount(sectionAFacts) < 25) {
    questions.push({
      id: "thin-section-a",
      fieldIds: ["sectionAFacts", "sectionAHeading"],
      question:
        "Primary equity narrative looks thin — any IEP, doctor letter, employer verification, or care schedule to support Section A?",
      priority: "high",
      reason: "Section A needs concrete facts, not category labels.",
    });
  }

  const combined = `${sectionAFacts} ${fieldText(payload, "additionalNotes")} ${fieldText(payload, "positiveEquities")}`;
  if (/autism|autistic|special needs|disabilit/i.test(combined) && !/iep|doctor|physician|medical|diagnosis/i.test(combined)) {
    questions.push({
      id: "disability-docs",
      fieldIds: ["sectionAFacts"],
      question:
        "You mention disability or special needs — is there an IEP, treating physician letter, or care plan on file?",
      priority: "high",
      reason: "Disability equities need documentary anchors.",
    });
  }

  const status = fieldText(payload, "clientStatus").toLowerCase();
  const adverse = fieldText(payload, "adverseFacts");
  if ((/overstay|out of status|unlawful/.test(status) || /overstay/i.test(combined)) && wordCount(adverse) < 15) {
    questions.push({
      id: "overstay-context",
      fieldIds: ["adverseFacts", "adverseHeading"],
      question:
        "Overstay timeline looks incomplete — when did lawful status end, and what happened since (without departure)?",
      priority: "high",
      reason: "Adverse section needs dated context for proportionality framing.",
    });
  }

  if (/overstay|out of status/i.test(combined) && !fieldText(payload, "departureHarm")) {
    questions.push({
      id: "departure-harm",
      fieldIds: ["departureHarm"],
      question:
        "If the client departed for consular processing, what specific harm would result (bars, separation, medical risk)?",
      priority: "medium",
      reason: "AOS mechanism §C needs departure/consular harm.",
    });
  }

  if (!fieldText(payload, "caseTheme") && completeness.percent >= 40) {
    questions.push({
      id: "case-theme",
      fieldIds: ["caseTheme", "caseThemeBrief"],
      question:
        "What is the one-sentence case theme with stakes? (Who + compelling equity + consequence if denied.)",
      priority: "medium",
      reason: "Theme feeds cover, opening, balancing close, and conclusion.",
    });
  }

  const selections = payload.paragraphSelections ?? {};
  if (completeness.percent >= 60 && !selections.section_a) {
    questions.push({
      id: "variant-section-a",
      fieldIds: ["paragraphSelections"],
      question:
        "Facts look solid — pick a Section A library variant that matches the primary equity (care, employment, hardship).",
      priority: "medium",
      reason: "Library variants carry pre-drafted argument structure.",
    });
  }

  const deduped = questions.filter(
    (q, i, arr) => arr.findIndex((x) => x.id === q.id) === i,
  );

  return {
    questions: deduped.slice(0, 5),
    completeness,
  };
}

export function mergeFollowUpAnswers(
  payload: DraftingFactsPayload,
  answers: Record<string, string>,
): DraftingFactsPayload {
  const followUpAnswers = { ...(payload.followUpAnswers ?? {}), ...answers };
  const fields = { ...payload.fields };

  for (const [qId, answer] of Object.entries(answers)) {
    const trimmed = answer.trim();
    if (!trimmed) continue;
    if (qId.startsWith("missing-")) {
      const fieldId = qId.replace("missing-", "");
      if (!fieldText({ ...payload, fields }, fieldId)) {
        fields[fieldId] = trimmed;
      }
    } else if (qId === "thin-section-a" && !fieldText({ ...payload, fields }, "sectionAFacts")) {
      fields.sectionAFacts = trimmed;
    } else if (qId === "overstay-context" && wordCount(fieldText({ ...payload, fields }, "adverseFacts")) < 15) {
      fields.adverseFacts = trimmed;
    } else if (qId === "departure-harm") {
      fields.departureHarm = trimmed;
    } else if (qId === "case-theme") {
      fields.caseTheme = trimmed;
      if (!fieldText({ ...payload, fields }, "caseThemeBrief")) {
        fields.caseThemeBrief = trimmed.split(/[.!?]/)[0]?.trim() ?? trimmed;
      }
    }
  }

  return {
    ...payload,
    fields,
    followUpAnswers,
    updatedAt: new Date().toISOString(),
  };
}
