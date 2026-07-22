#!/usr/bin/env node
/** Verify matter-type → Firm Knowledge mapping (core auto-seed + optional). */
import assert from "node:assert/strict";

import {
  activeKnowledgeTopics,
  coreFirmKnowledgeElementsForMatter,
  encodeFirmKnowledgeSource,
  firmKnowledgeBrowseHref,
  firmKnowledgeElementsForMatter,
  firmKnowledgeAppliedCount,
  missingCoreFirmKnowledgeElements,
  missingFirmKnowledgeElements,
  missingOptionalFirmKnowledgeElements,
  optionalFirmKnowledgeElementsForMatter,
  parseFirmKnowledgeTopicId,
  scoreNeededFacts,
} from "../src/lib/firm-knowledge-for-matter.ts";

const familyTopics = activeKnowledgeTopics("Immigration - Family AOS");
assert.ok(familyTopics.includes("aos"), `expected aos in ${familyTopics}`);
assert.ok(familyTopics.includes("family"), `expected family in ${familyTopics}`);

const familyCore = coreFirmKnowledgeElementsForMatter("Immigration - Family AOS");
assert.ok(familyCore.length >= 5, `expected ≥5 family core elements, got ${familyCore.length}`);
const coreIds = new Set(familyCore.map((e) => e.topicId));
assert.ok(coreIds.has("marriage-based-aos") || coreIds.has("family-based-immigration"));
assert.ok(coreIds.has("aos-statutory-eligibility") || coreIds.has("aos-discretionary-checklist"));
assert.ok(familyCore.some((e) => e.neededFacts.length > 0), "expected needed facts from knowledge MD");

// Asylum topics are optional on a family AOS matter (not auto-seeded).
const familyOptional = optionalFirmKnowledgeElementsForMatter("Immigration - Family AOS");
assert.ok(
  familyOptional.some((e) => e.topicId === "asylum-elements" || e.topicId.includes("asylum")),
  "expected asylum as optional on family AOS",
);
assert.ok(!coreIds.has("asylum-elements"), "asylum-elements must not be core for family AOS");

const familyAll = firmKnowledgeElementsForMatter("Immigration - Family AOS");
assert.ok(familyAll.length >= familyCore.length);

const asylum = coreFirmKnowledgeElementsForMatter("General Asylum");
assert.ok(asylum.some((e) => e.topicId === "asylum-elements"));
assert.ok(asylum.some((e) => e.topicId === "asylum-bars"));

const removal = coreFirmKnowledgeElementsForMatter("Cancellation of Removal");
assert.ok(removal.some((e) => e.topicId === "cancellation-of-removal"));
assert.ok(removal.some((e) => e.topicId === "procedural-posture-removal"));

const adjustment = coreFirmKnowledgeElementsForMatter("Adjustment");
assert.ok(adjustment.length >= 3, "Adjustment case type should map to AOS knowledge");

const href = firmKnowledgeBrowseHref("Immigration - Family");
assert.match(href, /\/knowledge-map\?topics=/);
assert.match(href, /#firm-knowledge/);

const encoded = encodeFirmKnowledgeSource("extreme-hardship-factors", "INA § 212(i)");
assert.equal(parseFirmKnowledgeTopicId(encoded), "extreme-hardship-factors");
assert.equal(firmKnowledgeAppliedCount([{ supportingCases: encoded }]), 1);
assert.equal(firmKnowledgeAppliedCount([{ supportingCases: "" }]), 0);

const missing = missingCoreFirmKnowledgeElements(
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
assert.equal(
  missingFirmKnowledgeElements("Immigration - Family", []).length,
  missingCoreFirmKnowledgeElements("Immigration - Family", []).length,
);
assert.ok(missingOptionalFirmKnowledgeElements("Immigration - Family", []).length >= 1);

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
