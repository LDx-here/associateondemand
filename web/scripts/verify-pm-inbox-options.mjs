/**
 * PM Inbox options parse/serialize round-trip (offline).
 */
import assert from "node:assert/strict";

import {
  assignmentOptionsFromItem,
  inboxItemFromParsedFields,
  parsePmInboxOptions,
  serializeAssignmentOptions,
} from "../src/lib/pm-inbox-options.ts";

const history = [{ status: "Submitted", note: "Test", at: "2026-07-28T00:00:00.000Z", by: "Attorney" }];
const serialized = serializeAssignmentOptions({
  deliverableType: "AOS Discretionary Brief",
  tier: "Template",
  facts: "Client facts here",
  priority: "High",
  dueDate: "2026-08-01",
  history,
});

const parsed = parsePmInboxOptions(serialized);
assert.equal(parsed.kind, "assignment");
assert.equal(parsed.deliverableType, "AOS Discretionary Brief");
assert.equal(parsed.tier, "Template");
assert.equal(parsed.facts, "Client facts here");
assert.equal(parsed.history?.length, 1);

const item = inboxItemFromParsedFields({
  id: "inbox-1",
  title: "Test assignment",
  matterId: "AOD-1001",
  agent: "PM Orchestrator",
  whatTried: "Submitted",
  whatNeeded: "Facts",
  optionsRaw: serialized,
  status: "Submitted",
  createdAt: "2026-07-28T00:00:00.000Z",
});
assert.equal(item.kind, "assignment");
assert.equal(item.deliverableType, "AOS Discretionary Brief");

const roundTrip = serializeAssignmentOptions(assignmentOptionsFromItem(item, item.history));
const reparsed = parsePmInboxOptions(roundTrip);
assert.equal(reparsed.deliverableType, "AOS Discretionary Brief");
assert.equal(reparsed.tier, "Template");

const agentFlag = parsePmInboxOptions(JSON.stringify(["Approve", "Defer"]));
assert.deepEqual(agentFlag.buttons, ["Approve", "Defer"]);
assert.equal(agentFlag.kind, "agent_flag");

console.log("pm-inbox-options verify OK");
