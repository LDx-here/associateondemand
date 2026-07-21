#!/usr/bin/env tsx
/** Matter-scoped document filter — regression guard for cross-matter document leak. */

import {
  matterLinkFilterFormula,
  recordMatchesMatterLink,
} from "../src/lib/airtable/matter-link-filter.ts";

const resolved = { recordId: "recMATTER111", matterId: "AOD-1001" };
const formula = matterLinkFilterFormula("matter_id", resolved);

if (!formula.includes("recMATTER111")) {
  console.error("Formula must include matter record id");
  process.exit(1);
}
if (!formula.includes("AOD-1001")) {
  console.error("Formula must include matter code");
  process.exit(1);
}
if (!formula.includes("FIND(',' & 'AOD-1001' & ','")) {
  console.error("Formula must use comma-boundary FIND for matter code");
  process.exit(1);
}

const linked = recordMatchesMatterLink({ matter_id: ["recMATTER111"] }, "matter_id", resolved);
if (!linked) {
  console.error("Expected linked record id to match matter");
  process.exit(1);
}

const wrongMatter = recordMatchesMatterLink({ matter_id: ["recOTHER999"] }, "matter_id", resolved);
if (wrongMatter) {
  console.error("Wrong matter record id must not match");
  process.exit(1);
}

const legacy = recordMatchesMatterLink({ matter_id: "AOD-1001" }, "matter_id", resolved);
if (!legacy) {
  console.error("Legacy plain matter code must match");
  process.exit(1);
}

const substringTrap = recordMatchesMatterLink({ matter_id: ["recAOD10010"] }, "matter_id", {
  recordId: "recAOD1001",
  matterId: "AOD-1001",
});
if (substringTrap) {
  console.error("Different record id must not match");
  process.exit(1);
}

console.log("OK matter-link-filter guards document isolation");
