/**
 * Verify assessment document metadata helpers (pass 11).
 */
import assert from "node:assert/strict";

import {
  CASE_ASSESSMENT_CATEGORY,
  buildCaseAssessmentSummaryRows,
  buildExtractionContext,
  encodeAssessmentTemplateCategory,
  factDisplayValue,
  findCaseAssessmentDocument,
  formatAssessmentOcrForAgents,
  isCaseAssessmentDocument,
  parseAssessmentOcrPayload,
  parseDocumentCategory,
  practiceAreaFromCaseType,
  serializeAssessmentOcrPayload,
} from "../src/lib/assessment-documents.ts";

function testParseDocumentCategory() {
  assert.deepEqual(parseDocumentCategory("case_assessment"), { role: "case_assessment" });
  assert.deepEqual(parseDocumentCategory("Case Assessment"), { role: "case_assessment" });
  assert.deepEqual(parseDocumentCategory("assessment_template:immigration"), {
    role: "assessment_template",
    practiceArea: "immigration",
  });
  assert.deepEqual(parseDocumentCategory("court_filing"), { role: "other" });
}

function testTemplateCategoryEncoding() {
  assert.equal(
    encodeAssessmentTemplateCategory("immigration"),
    "assessment_template:immigration",
  );
}

function testFindCaseAssessmentDocument() {
  const docs = [
    {
      id: "1",
      matterId: "AOD-1001",
      title: "I-589",
      category: "court_filing",
      uploadedAt: "2026-01-02T00:00:00Z",
    },
    {
      id: "2",
      matterId: "AOD-1001",
      title: "Client assessment scan",
      category: CASE_ASSESSMENT_CATEGORY,
      uploadedAt: "2026-01-03T00:00:00Z",
    },
  ];
  const found = findCaseAssessmentDocument(docs);
  assert.ok(found);
  assert.equal(found?.id, "2");
  assert.equal(isCaseAssessmentDocument(found), true);
}

function testPracticeAreaFromCaseType() {
  assert.equal(practiceAreaFromCaseType("Immigration - Asylum"), "immigration");
  assert.equal(practiceAreaFromCaseType("Personal Injury - MVA"), "personal_injury");
}

function testAssessmentOcrPayloadRoundTrip() {
  const payload = {
    v: 1,
    documentId: "doc-1",
    title: "assessment.pdf",
    ocrText: "Client entered US in 2019. Relief sought: AOS.",
    facts: [{ fact_type: "entry_date", value: "2019", confidence: 0.9 }],
  };
  const raw = serializeAssessmentOcrPayload(payload);
  const parsed = parseAssessmentOcrPayload(raw);
  assert.ok(parsed);
  assert.equal(parsed?.title, "assessment.pdf");
  const block = formatAssessmentOcrForAgents(parsed);
  assert.match(block, /Case assessment document/);
  // formatAssessmentOcrForAgents renders fact_type through factDisplayLabel,
  // which humanizes machine keys (underscores -> spaces) for attorney/LLM
  // readability — assert on the rendered label, not the raw fact_type.
  assert.match(block, /entry date/);
  assert.match(block, /\[needs review\]/);
}

function testFactDisplayValuePrefersEdited() {
  assert.equal(
    factDisplayValue({ fact_type: "date", value: "2019", editedValue: "March 2019" }),
    "March 2019",
  );
}

function testBuildExtractionContext() {
  const ctx = buildExtractionContext({
    practiceArea: "immigration",
    caseType: "Immigration - AOS",
    deliverableId: "aos-discretionary-brief",
    legalElements: ["Extreme hardship"],
  });
  assert.equal(ctx.document_category, "case_assessment");
  assert.ok(Array.isArray(ctx.fact_field_hints));
  assert.ok(ctx.fact_field_hints.length >= 5);
}

function testCaseAssessmentSummaryRows() {
  const rows = buildCaseAssessmentSummaryRows({
    payload: {
      v: 1,
      documentId: "d1",
      title: "scan.pdf",
      facts: [
        {
          fact_type: "qualifyingRelative",
          value: "U.S. citizen spouse",
          fieldId: "qualifyingRelative",
          verified: true,
        },
      ],
    },
    caseType: "Immigration - AOS",
    deliverableId: "aos-discretionary-brief",
  });
  const qualifying = rows.find((r) => r.fieldId === "qualifyingRelative");
  assert.ok(qualifying);
  assert.equal(qualifying?.status, "verified");
}

function main() {
  testParseDocumentCategory();
  testTemplateCategoryEncoding();
  testFindCaseAssessmentDocument();
  testPracticeAreaFromCaseType();
  testAssessmentOcrPayloadRoundTrip();
  testFactDisplayValuePrefersEdited();
  testBuildExtractionContext();
  testCaseAssessmentSummaryRows();
  console.log("verify-assessment-documents: all checks passed");
}

main();
