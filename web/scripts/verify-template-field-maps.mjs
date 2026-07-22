#!/usr/bin/env tsx
import {
  TELEPHONIC_REQUEST_FIELD_MAP,
  buildTemplateFieldDefaults,
  editableFieldsForMap,
  renderFilledTemplate,
  resolveSectionPreview,
} from "../src/lib/template-field-maps.ts";
import { fillMergeFields, extractMergeFields } from "../src/lib/merge-fields.ts";
import {
  formatFirmLetterhead,
  LETTERHEAD_EMPTY_HINT,
  DEFAULT_CERTIFICATE_OF_SERVICE,
} from "../src/lib/firm-letterhead.ts";
import { getDeliverableTemplateSpec } from "../src/lib/deliverable-template-specs.ts";

const editable = editableFieldsForMap(TELEPHONIC_REQUEST_FIELD_MAP);
if (editable.length < 5) {
  console.error("Expected telephonic template to define multiple editable fields");
  process.exit(1);
}

const defaults = buildTemplateFieldDefaults(TELEPHONIC_REQUEST_FIELD_MAP, {
  matterHints: { matter_id: "AOD-1001", client_name: "Test Client" },
});
if (defaults.matter_id !== "AOD-1001") {
  console.error("Autofill matter_id failed");
  process.exit(1);
}

const emptyFirm = {
  firmName: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  zip: "",
  phone: "",
  email: "",
  attorneyName: "",
  barNumber: "",
  certificateOfService: DEFAULT_CERTIFICATE_OF_SERVICE,
};

const letterhead = formatFirmLetterhead(emptyFirm);
if (!letterhead.includes(LETTERHEAD_EMPTY_HINT) && !letterhead.includes("Settings")) {
  console.error("Empty letterhead must show Settings placeholder, not invented address");
  process.exit(1);
}
if (letterhead.includes("123 Legal Plaza") || letterhead.includes("555-0100")) {
  console.error("Must not invent fake Detroit letterhead");
  process.exit(1);
}

const realFirm = {
  ...emptyFirm,
  firmName: "Acme Immigration, PLLC",
  addressLine1: "100 Main St",
  city: "Austin",
  state: "TX",
  zip: "78701",
  phone: "(512) 555-1212",
  attorneyName: "Jane Doe",
  barNumber: "24012345",
};
const realLh = formatFirmLetterhead(realFirm);
if (!realLh.includes("Acme Immigration") || !realLh.includes("100 Main St")) {
  console.error("Real firm letterhead not formatted");
  process.exit(1);
}

const filled = fillMergeFields("Hello {{client_name}} — {{a_number}}", {
  client_name: "Test Client",
  a_number: "A123",
});
if (filled !== "Hello Test Client — A123") {
  console.error("fillMergeFields failed:", filled);
  process.exit(1);
}

const keys = extractMergeFields(DEFAULT_CERTIFICATE_OF_SERVICE);
if (!keys.includes("date") || !keys.includes("method") || !keys.includes("parties_served")) {
  console.error("Certificate must expose date/method/parties_served merge fields");
  process.exit(1);
}

const spec = getDeliverableTemplateSpec("hearing-packet");
const certPreview = resolveSectionPreview(
  "Certificate of service",
  spec,
  { method: "Email", parties_served: "DHS counsel" },
  realFirm,
);
if (!certPreview.text.includes("CERTIFICATE OF SERVICE") || !certPreview.text.includes("Email")) {
  console.error("Certificate preview should assemble merge fields:", certPreview.text.slice(0, 200));
  process.exit(1);
}
if (certPreview.lockKind !== "firm_editable") {
  console.error("Certificate must be firm_editable");
  process.exit(1);
}

const lhPreview = resolveSectionPreview("Firm letterhead block", spec, {}, realFirm);
if (!lhPreview.text.includes("Acme Immigration")) {
  console.error("Letterhead preview must use firm profile");
  process.exit(1);
}

const rendered = renderFilledTemplate(
  TELEPHONIC_REQUEST_FIELD_MAP,
  {
    ...defaults,
    records_requested: "I-589",
    method: "Mail",
    parties_served: "ICE OPLA",
  },
  { firm: realFirm },
);
if (!rendered.includes("Test Client") && !rendered.includes("AOD-1001")) {
  console.error("Rendered template missing matter hints");
  process.exit(1);
}
if (!rendered.includes("Acme Immigration")) {
  console.error("Rendered template must include firm letterhead");
  process.exit(1);
}
if (
  !rendered.includes("[Firm profile —") &&
  !rendered.includes("[Built-in structure —") &&
  !rendered.includes("[Preserve —")
) {
  console.error("Rendered template must label structure sections:", rendered.slice(0, 400));
  process.exit(1);
}
if (rendered.includes("123 Legal Plaza") || rendered.includes("Service instructions footer")) {
  console.error("Must not use invented letterhead or old service footer label");
  process.exit(1);
}

console.log("OK template field maps + merge fields + letterhead");
