#!/usr/bin/env tsx
import {
  TELEPHONIC_REQUEST_FIELD_MAP,
  buildTemplateFieldDefaults,
  editableFieldsForMap,
  renderFilledTemplate,
} from "../src/lib/template-field-maps.ts";

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

const rendered = renderFilledTemplate(TELEPHONIC_REQUEST_FIELD_MAP, {
  ...defaults,
  records_requested: "I-589",
});
if (!rendered.includes("Test Client") && !rendered.includes("AOD-1001")) {
  console.error("Rendered template missing matter hints");
  process.exit(1);
}
if (!rendered.includes("[Boilerplate — locked]")) {
  console.error("Rendered template must mark boilerplate sections");
  process.exit(1);
}

console.log("OK template field maps");
