#!/usr/bin/env node
/**
 * Smoke checks for contact role catalog.
 */

import { CONTACT_ROLES } from "../src/lib/types.ts";

const required = ["Client", "Co-Counsel", "Opposing Counsel", "Judge", "Other"];
for (const role of required) {
  if (!CONTACT_ROLES.includes(role)) {
    console.error(`Missing contact role: ${role}`);
    process.exit(1);
  }
}

function hasClient(contacts) {
  return contacts.some((c) => /client/i.test(c.role));
}

if (hasClient([{ role: "Co-Counsel" }])) {
  console.error("False positive client detection");
  process.exit(1);
}
if (!hasClient([{ role: "Client" }, { role: "Judge" }])) {
  console.error("Expected client contact");
  process.exit(1);
}

console.log("contacts helpers OK");
