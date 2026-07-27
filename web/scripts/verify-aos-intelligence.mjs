#!/usr/bin/env node
/** Verify AOS extract + scorecard helpers. */
import assert from "node:assert/strict";

import {
  applyAosExtractToPayload,
  heuristicExtractAosFacts,
} from "../src/lib/aos-fact-extract.ts";
import { mergeFollowUpAnswers, runAosFactScorecard } from "../src/lib/aos-fact-scorecard.ts";
import { cloneFromPriorMatter } from "../src/lib/fact-template.ts";
import { emptyDraftingFacts } from "../src/lib/practice-area-facts.ts";

const sample = `
Applicant entered on B-2 in March 2019. U.S. citizen daughter petitioner. Out of status since 2020.
Primary equity: care for autistic grandson — IEP at school. Extreme hardship to daughter.
`;

const extract = heuristicExtractAosFacts(sample);
assert.ok(extract.fields.clientStatus || extract.fields.entryDate);

const base = emptyDraftingFacts("AOD-2001", "Immigration - Adjustment of Status", "aos-discretionary-brief");
const { payload, filledFieldIds } = applyAosExtractToPayload(base, extract);
assert.ok(filledFieldIds.length >= 2);

const scorecard = runAosFactScorecard(payload);
assert.ok(Array.isArray(scorecard.questions));

const answered = mergeFollowUpAnswers(payload, {
  "missing-caseTheme": "Nurse caring for autistic grandson — denial would leave family without caregiver.",
});
assert.ok(answered.fields.caseTheme || answered.followUpAnswers);

const prior = emptyDraftingFacts("AOD-1001", "Immigration - Family", "aos-discretionary-brief");
prior.fields.applicantName = "Maria Elena";
prior.fields.aNumber = "A-123456789";
prior.paragraphSelections = { section_a: "care.v3" };

const cloned = cloneFromPriorMatter(prior, "AOD-1001", "AOD-2002", "Immigration - Family", {
  keepParagraphSelections: true,
});
assert.equal(cloned.fields.applicantName, "");
assert.equal(cloned.paragraphSelections?.section_a, "care.v3");
assert.equal(cloned.sourceMatterId, "AOD-1001");

console.log("verify-aos-intelligence: OK");
