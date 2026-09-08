#!/usr/bin/env node
/** Verify invoicing — money in cents, no work billed twice, honest emails. */
import assert from "node:assert/strict";

import {
  addDays,
  billedNoteIds,
  buildTimeLinesFromNotes,
  centsToUsd,
  createInvoice,
  formatInvoiceEmail,
  INVOICE_NOTE_TYPE,
  invoiceTotals,
  nextInvoiceNumber,
  parseInvoicesNote,
  serializeInvoices,
  timeLineAmountCents,
  usdToCents,
} from "../src/lib/invoice.ts";

// --- Money ------------------------------------------------------------------
assert.equal(centsToUsd(125000), "$1250.00");
assert.equal(centsToUsd(0), "$0.00");
assert.equal(centsToUsd(5), "$0.05");
assert.equal(centsToUsd(-2500), "-$25.00");

assert.equal(usdToCents("1,250.00"), 125000);
assert.equal(usdToCents("$1250"), 125000);
assert.equal(usdToCents("12.34"), 1234);
assert.equal(usdToCents("0"), 0);
// A typo must not silently become zero dollars.
assert.equal(usdToCents("abc"), null);
assert.equal(usdToCents(""), null);
assert.equal(usdToCents("12.3.4"), null);

// Cents-only arithmetic: 0.1 + 0.2 problems never reach an invoice.
const rate = 25000; // $250/hr
assert.equal(timeLineAmountCents(60, rate), 25000);
assert.equal(timeLineAmountCents(30, rate), 12500);
// Billing increment rounds up first — 7 minutes bills as 12 (0.2 hr).
assert.equal(timeLineAmountCents(7, rate), timeLineAmountCents(12, rate));

// --- Due dates are local, not UTC -------------------------------------------
assert.equal(addDays("2026-08-14", 30), "2026-09-13");
assert.equal(addDays("2026-12-31", 1), "2027-01-01", "year rollover");
assert.equal(addDays("2026-02-28", 1), "2026-03-01", "non-leap February");

// --- Lines from logged work --------------------------------------------------
const note = (id, extra = {}) => ({
  id,
  matterId: "AOD-1007",
  author: "Attorney",
  content: "Call with the adjuster about the UM limits.",
  createdAt: "2026-08-14T15:00:00.000Z",
  type: "Manual",
  ...extra,
});

const notes = [
  note("n1", { activity: "Call", minutes: 30, billable: true }),
  note("n2", { activity: "Drafting", minutes: 60, billable: true, content: "Drafted the LOR." }),
  note("n3", { activity: "Review", minutes: 15, billable: false }), // no charge
  note("n4"), // no work entry at all
];

const lines = buildTimeLinesFromNotes(notes, rate);
assert.equal(lines.length, 2, "only billable entries with time become lines");
assert.deepEqual(
  lines.map((l) => l.noteId),
  ["n1", "n2"],
);
assert.equal(lines[0].amountCents, 12500);
assert.match(lines[0].description, /^Call — /, "activity leads the description");
assert.match(lines[1].description, /Drafted the LOR/);
assert.equal(lines[0].date, "2026-08-14", "date, not timestamp");

// The same hour must never go out twice.
const second = buildTimeLinesFromNotes(notes, rate, ["n1"]);
assert.deepEqual(second.map((l) => l.noteId), ["n2"]);

// --- Totals ------------------------------------------------------------------
const invoice = createInvoice({
  matterId: "AOD-1007",
  number: "AOD-1007-001",
  lines: [
    ...lines,
    {
      id: "e1",
      kind: "expense",
      date: "2026-08-10",
      description: "Certified medical records",
      amountCents: 4500,
    },
    { id: "f1", kind: "fee", date: "2026-08-01", description: "Flat intake fee", amountCents: 50000 },
  ],
  issuedAt: new Date(2026, 7, 20),
  termDays: 30,
});

const totals = invoiceTotals(invoice);
assert.equal(totals.timeCents, 37500);
assert.equal(totals.expenseCents, 4500);
assert.equal(totals.feeCents, 50000);
assert.equal(totals.totalCents, 92000);
assert.equal(totals.billedMinutes, 90);
assert.equal(invoice.status, "draft", "new invoices are drafts, never sent");
assert.equal(invoice.dueDate, "2026-09-19");

// --- Numbering ---------------------------------------------------------------
assert.equal(nextInvoiceNumber("AOD-1007", []), "AOD-1007-001");
assert.equal(nextInvoiceNumber("AOD-1007", [invoice]), "AOD-1007-002");
assert.equal(
  nextInvoiceNumber("AOD-1008", [invoice]),
  "AOD-1008-001",
  "numbering is per matter, not global",
);

// --- The email ---------------------------------------------------------------
const withoutLink = formatInvoiceEmail({
  invoice,
  matterTitle: "Jeremiah Hammond — Personal Injury",
  clientName: "Jeremiah",
  firmName: "Kingdom Counsel Firm",
});
assert.match(withoutLink.subject, /Invoice AOD-1007-001/);
assert.match(withoutLink.body, /^Hi Jeremiah,/);
assert.match(withoutLink.body, /\$920\.00/, "the total appears as money");
assert.match(withoutLink.body, /Certified medical records/, "expenses are itemized");
assert.match(withoutLink.body, /September 19, 2026/, "due date reads as a date");
// No link exists, so the email must not promise one.
assert.doesNotMatch(withoutLink.body, /pay online/i);
assert.match(withoutLink.body, /Reply to this email/i);

const withLink = formatInvoiceEmail({
  invoice: { ...invoice, paymentUrl: "https://invoice.stripe.com/i/test_123" },
  matterTitle: "Jeremiah Hammond — Personal Injury",
});
assert.match(withLink.body, /pay online/i);
assert.match(withLink.body, /invoice\.stripe\.com/);
assert.match(withLink.body, /^Hello,/, "no client name falls back to a neutral greeting");

// --- Round-trip through a Note ------------------------------------------------
const serialized = serializeInvoices([invoice]);
assert.ok(serialized.startsWith(INVOICE_NOTE_TYPE));
const restored = parseInvoicesNote(serialized);
assert.equal(restored.length, 1);
assert.equal(restored[0].number, "AOD-1007-001");
assert.equal(invoiceTotals(restored[0]).totalCents, 92000);

assert.deepEqual(parseInvoicesNote(""), []);
assert.deepEqual(parseInvoicesNote("garbage"), []);
assert.deepEqual(parseInvoicesNote(JSON.stringify({ invoices: "nope" })), []);
assert.deepEqual(
  parseInvoicesNote(JSON.stringify({ invoices: [{ id: "x" }, invoice] })).map((i) => i.id),
  [invoice.id],
  "malformed invoices are dropped, valid ones survive",
);

// Billed-note tracking across a history of invoices.
assert.deepEqual([...billedNoteIds([invoice])].sort(), ["n1", "n2"]);
assert.equal(billedNoteIds([]).size, 0);

console.log("invoice: all checks passed");
