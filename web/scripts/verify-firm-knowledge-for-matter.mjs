#!/usr/bin/env node
/** Verify matter-type → Firm Knowledge mapping (Pass 26). */
import assert from "node:assert/strict";

import {
  activeKnowledgeTopics,
  encodeFirmKnowledgeSource,
  firmKnowledgeBrowseHref,
  firmKnowledgeElementsForMatter,
  firmKnowledgeAppliedCount,
  missingFirmKnowledgeElements,
  parseFirmKnowledgeTopicId,
  scoreNeededFacts,
} from "../src/lib/firm-knowledge-for-matter.ts";

const familyTopics = activeKnowledgeTopics("Immigration - Family AOS");
assert.ok(familyTopics.includes("aos"), `expected aos in ${familyTopics}`);
assert.ok(familyTopics.includes("family"), `expected family in ${familyTopics}`);

const familyElements = firmKnowledgeElementsForMatter("Immigration - Family AOS");
assert.ok(familyElements.length >= 5, `expected ≥5 family elements, got ${familyElements.length}`);
const ids = new Set(familyElements.map((e) => e.topicId));
assert.ok(ids.has("marriage-based-aos") || ids.has("family-based-immigration"));
assert.ok(ids.has("aos-statutory-eligibility") || ids.has("aos-discretionary-checklist"));
assert.ok(familyElements.some((e) => e.neededFacts.length > 0), "expected needed facts from knowledge MD");

const asylum = firmKnowledgeElementsForMatter("General Asylum");
assert.ok(asylum.some((e) => e.topicId === "asylum-elements"));
assert.ok(asylum.some((e) => e.topicId === "asylum-bars"));

const removal = firmKnowledgeElementsForMatter("Cancellation of Removal");
assert.ok(removal.some((e) => e.topicId === "cancellation-of-removal"));
assert.ok(removal.some((e) => e.topicId === "procedural-posture-removal"));

const adjustment = firmKnowledgeElementsForMatter("Adjustment");
assert.ok(adjustment.length >= 3, "Adjustment case type should map to AOS knowledge");

const href = firmKnowledgeBrowseHref("Immigration - Family");
assert.match(href, /\/knowledge-map\?topics=/);
assert.match(href, /#firm-knowledge/);

const encoded = encodeFirmKnowledgeSource("extreme-hardship-factors", "INA § 212(i)");
assert.equal(parseFirmKnowledgeTopicId(encoded), "extreme-hardship-factors");
assert.equal(firmKnowledgeAppliedCount([{ supportingCases: encoded }]), 1);
assert.equal(firmKnowledgeAppliedCount([{ supportingCases: "" }]), 0);

const missing = missingFirmKnowledgeElements(
  "Immigration - Family",
  [
    {
      id: "1",
      matterId: "AOD-1003",
      element: "AOS statutory eligibility (§ 245)",
      assessment: "Gap",
      keyGap: "",
      nextAction: "",
      supportingCases: encodeFirmKnowledgeSource("aos-statutory-eligibility"),
    },
  ],
);
assert.ok(!missing.some((m) => m.topicId === "aos-statutory-eligibility"));
assert.ok(missing.length >= 1);

const scored = scoreNeededFacts(
  ["Medical → diagnoses, caregiver role", "Financial → income share"],
  [
    {
      fact_type: "medical",
      fieldId: "medical",
      label: "Medical records",
      value: "Diabetes diagnosis caregiver",
    },
  ],
);
assert.equal(scored[0].status, "present");
assert.equal(scored[1].status, "needed");

console.log("verify-firm-knowledge-for-matter: ok");
