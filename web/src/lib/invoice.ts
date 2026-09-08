/**
 * Client invoices — the money loop she asked for: "generate an email that can
 * be sent directly to the client with their invoice, and then it's set up with
 * billing for them to just pay."
 *
 * Two sources of lines, because her practice has both:
 *   - time she already logged on notes (see work-entry.ts), and
 *   - lines she adds by hand: a flat fee, or a case expense she advanced —
 *     "what expenses did I incur handling this?"
 *
 * Money is held in integer cents everywhere. Floating-point dollars drift, and
 * an invoice that is off by a cent is a phone call.
 */

import type { Note } from "./types";
import { parseWorkEntry, roundToBillingIncrement } from "./work-entry";

export type InvoiceLineKind = "time" | "fee" | "expense";

export type InvoiceLine = {
  id: string;
  kind: InvoiceLineKind;
  /** ISO date (YYYY-MM-DD) the work was done or the cost incurred. */
  date: string;
  description: string;
  /** Time lines only. */
  minutes?: number;
  rateCents?: number;
  amountCents: number;
  /** Note this line came from, so the same work is never billed twice. */
  noteId?: string;
};

export type InvoiceStatus = "draft" | "sent" | "paid";

export type Invoice = {
  v: 1;
  id: string;
  matterId: string;
  /** Human-facing number, e.g. "AOD-1007-001". */
  number: string;
  issuedAt: string;
  /** ISO date the invoice is due. */
  dueDate: string;
  lines: InvoiceLine[];
  status: InvoiceStatus;
  /** Stripe hosted payment URL, once one exists. */
  paymentUrl?: string;
  sentAt?: string;
  paidAt?: string;
  notes?: string;
};

export const DEFAULT_PAYMENT_TERM_DAYS = 30;

export function centsToUsd(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(Math.round(cents));
  return `${sign}$${(abs / 100).toFixed(2)}`;
}

/**
 * Parse a typed dollar amount into cents. Accepts "1,250.00", "$1250", "1250".
 * Returns null for anything that is not a number, so a typo becomes a visible
 * error rather than a zero-dollar line.
 */
export function usdToCents(input: string): number | null {
  const cleaned = input.replace(/[$,\s]/g, "");
  if (!cleaned || !/^-?\d*\.?\d*$/.test(cleaned)) return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 100);
}

/** Billable value of a time entry, rounded to her billing increment first. */
export function timeLineAmountCents(minutes: number, rateCents: number): number {
  const billed = roundToBillingIncrement(minutes);
  return Math.round((billed / 60) * rateCents);
}

export type InvoiceTotals = {
  timeCents: number;
  feeCents: number;
  expenseCents: number;
  totalCents: number;
  billedMinutes: number;
};

export function invoiceTotals(invoice: Pick<Invoice, "lines">): InvoiceTotals {
  let timeCents = 0;
  let feeCents = 0;
  let expenseCents = 0;
  let billedMinutes = 0;

  for (const line of invoice.lines) {
    if (line.kind === "time") {
      timeCents += line.amountCents;
      billedMinutes += roundToBillingIncrement(line.minutes ?? 0);
    } else if (line.kind === "fee") {
      feeCents += line.amountCents;
    } else {
      expenseCents += line.amountCents;
    }
  }

  return {
    timeCents,
    feeCents,
    expenseCents,
    totalCents: timeCents + feeCents + expenseCents,
    billedMinutes,
  };
}

/** First line of a note, trimmed — what reads as the description on a bill. */
function noteDescription(note: Note): string {
  const first = note.content.split("\n")[0]?.trim() ?? "";
  return first || "Work on this matter";
}

/**
 * Turn logged work into invoice lines.
 *
 * Only billable entries are included, and only notes not already billed on a
 * previous invoice — `alreadyBilledNoteIds` is what keeps the same hour from
 * going out twice.
 */
export function buildTimeLinesFromNotes(
  notes: Note[],
  rateCents: number,
  alreadyBilledNoteIds: Iterable<string> = [],
): InvoiceLine[] {
  const billed = new Set(alreadyBilledNoteIds);
  const lines: InvoiceLine[] = [];

  for (const note of notes) {
    if (billed.has(note.id)) continue;
    const work = parseWorkEntry({
      activity: note.activity,
      minutes: note.minutes,
      billable: note.billable,
    });
    if (!work || !work.billable || work.minutes <= 0) continue;

    lines.push({
      id: `time-${note.id}`,
      kind: "time",
      date: note.createdAt.slice(0, 10),
      description: `${work.activity} — ${noteDescription(note)}`,
      minutes: work.minutes,
      rateCents,
      amountCents: timeLineAmountCents(work.minutes, rateCents),
      noteId: note.id,
    });
  }

  return lines.sort((a, b) => a.date.localeCompare(b.date));
}

/** Which notes a set of invoices has already billed. */
export function billedNoteIds(invoices: Invoice[]): Set<string> {
  const ids = new Set<string>();
  for (const invoice of invoices) {
    for (const line of invoice.lines) {
      if (line.noteId) ids.add(line.noteId);
    }
  }
  return ids;
}

export function nextInvoiceNumber(matterId: string, existing: Invoice[]): string {
  const forMatter = existing.filter((i) => i.matterId === matterId);
  const seq = String(forMatter.length + 1).padStart(3, "0");
  return `${matterId}-${seq}`;
}

export function addDays(isoDate: string, days: number): string {
  // Date-only values are built as local dates on purpose. Parsing "2026-08-14"
  // as UTC renders a day early anywhere behind UTC — the same bug that once
  // showed a filing deadline on the wrong day.
  const [y, m, d] = isoDate.slice(0, 10).split("-").map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  date.setDate(date.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function createInvoice(params: {
  matterId: string;
  number: string;
  lines: InvoiceLine[];
  issuedAt?: Date;
  termDays?: number;
}): Invoice {
  const issued = params.issuedAt ?? new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const issuedDate = `${issued.getFullYear()}-${pad(issued.getMonth() + 1)}-${pad(issued.getDate())}`;

  return {
    v: 1,
    id: `inv-${issued.getTime()}`,
    matterId: params.matterId,
    number: params.number,
    issuedAt: issued.toISOString(),
    dueDate: addDays(issuedDate, params.termDays ?? DEFAULT_PAYMENT_TERM_DAYS),
    lines: params.lines,
    status: "draft",
  };
}

function formatDateLong(isoDate: string): string {
  const [y, m, d] = isoDate.slice(0, 10).split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export type InvoiceEmail = { subject: string; body: string };

/**
 * The email she sends. Plain text on purpose — it pastes into any mail client
 * without carrying styling that will not survive the trip.
 *
 * When no payment URL exists the email still works; it just asks them to reply
 * for payment details rather than promising a link that is not there.
 */
export function formatInvoiceEmail(params: {
  invoice: Invoice;
  matterTitle: string;
  clientName?: string;
  firmName?: string;
  signature?: string;
}): InvoiceEmail {
  const { invoice, matterTitle, clientName, firmName, signature } = params;
  const totals = invoiceTotals(invoice);
  const greeting = clientName?.trim() ? `Hi ${clientName.trim()},` : "Hello,";

  const lines: string[] = [
    greeting,
    "",
    `Attached is invoice ${invoice.number} for work on ${matterTitle}, in the amount of ${centsToUsd(
      totals.totalCents,
    )}. Payment is due ${formatDateLong(invoice.dueDate)}.`,
    "",
  ];

  for (const line of invoice.lines) {
    const detail =
      line.kind === "time" && line.minutes
        ? `${(roundToBillingIncrement(line.minutes) / 60).toFixed(2)} hr`
        : line.kind === "expense"
          ? "expense"
          : "";
    lines.push(
      `  ${formatDateLong(line.date)} — ${line.description}${detail ? ` (${detail})` : ""}: ${centsToUsd(
        line.amountCents,
      )}`,
    );
  }

  lines.push("", `  Total due: ${centsToUsd(totals.totalCents)}`, "");

  if (invoice.paymentUrl) {
    lines.push("You can pay online here:", invoice.paymentUrl, "");
  } else {
    lines.push("Reply to this email and I will send payment details.", "");
  }

  lines.push(
    "If anything on this invoice looks off, tell me and I will take another look.",
    "",
    signature?.trim() || firmName?.trim() || "",
  );

  return {
    subject: `Invoice ${invoice.number} — ${matterTitle}`,
    body: lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd(),
  };
}

export const INVOICE_NOTE_TYPE = "Invoice";

export function serializeInvoices(invoices: Invoice[]): string {
  return `${INVOICE_NOTE_TYPE}\n${JSON.stringify({ v: 1, invoices })}`;
}

export function parseInvoicesNote(content: string): Invoice[] {
  const body = content.startsWith(INVOICE_NOTE_TYPE)
    ? content.slice(INVOICE_NOTE_TYPE.length).trim()
    : content.trim();
  if (!body) return [];
  try {
    const parsed = JSON.parse(body) as { invoices?: unknown };
    if (!Array.isArray(parsed.invoices)) return [];
    // Drop anything malformed rather than rendering a broken invoice.
    return parsed.invoices.filter(
      (i): i is Invoice =>
        Boolean(i) &&
        typeof i === "object" &&
        typeof (i as Invoice).id === "string" &&
        Array.isArray((i as Invoice).lines),
    );
  } catch {
    return [];
  }
}
