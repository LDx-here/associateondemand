"use client";

import { useCallback, useEffect, useState } from "react";

import {
  billedNoteIds,
  buildTimeLinesFromNotes,
  centsToUsd,
  createInvoice,
  formatInvoiceEmail,
  invoiceTotals,
  nextInvoiceNumber,
  usdToCents,
  type Invoice,
  type InvoiceLine,
} from "@/lib/invoice";
import { getBillingSettings, saveBillingSettings, type BillingSettings } from "@/lib/billing-settings";
import type { Contact, Note } from "@/lib/types";
import { roundToBillingIncrement } from "@/lib/work-entry";

/**
 * Billing for one matter: turn logged work into an invoice, get a payment
 * link, and copy the email that goes to the client.
 *
 * Her ask: "generate an email that can be sent directly to the client with
 * their invoice, and then it's set up with billing for them to just pay."
 *
 * Nothing is emailed from here. The draft is hers to send from her own mail,
 * so a client never receives a message she has not read.
 */
export function MatterBillingPanel({
  matterId,
  matterTitle,
  notes,
  contacts = [],
}: {
  matterId: string;
  matterTitle: string;
  notes: Note[];
  contacts?: Contact[];
}) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [settings, setSettings] = useState<BillingSettings | null>(null);
  const [rateInput, setRateInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [manual, setManual] = useState({ kind: "expense" as "fee" | "expense", description: "", amount: "" });

  useEffect(() => {
    const s = getBillingSettings();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: browser-only localStorage read, unsafe during SSR render
    setSettings(s);
    setRateInput(s.hourlyRateCents ? (s.hourlyRateCents / 100).toFixed(2) : "");
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/matters/${matterId}/invoices`)
      .then((r) => r.json())
      .then((data: { invoices?: Invoice[] }) => {
        if (!cancelled) setInvoices(data.invoices ?? []);
      })
      .catch(() => {
        if (!cancelled) setInvoices([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [matterId]);

  const persist = useCallback(
    async (next: Invoice[]) => {
      setInvoices(next);
      setBusy(true);
      setError(null);
      try {
        const resp = await fetch(`/api/matters/${matterId}/invoices`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ invoices: next }),
        });
        if (!resp.ok) setError("Could not save. Your changes are on screen but not stored yet.");
      } catch {
        setError("Could not save. Your changes are on screen but not stored yet.");
      } finally {
        setBusy(false);
      }
    },
    [matterId],
  );

  function commitRate() {
    const cents = usdToCents(rateInput);
    if (cents === null || cents <= 0) {
      setError("Enter an hourly rate like 250 or 250.00.");
      return;
    }
    setError(null);
    setSettings(saveBillingSettings({ hourlyRateCents: cents }));
  }

  const rateCents = settings?.hourlyRateCents ?? null;
  const alreadyBilled = billedNoteIds(invoices);
  const unbilledLines = rateCents ? buildTimeLinesFromNotes(notes, rateCents, alreadyBilled) : [];
  const unbilledMinutes = unbilledLines.reduce(
    (sum, l) => sum + roundToBillingIncrement(l.minutes ?? 0),
    0,
  );
  const unbilledCents = unbilledLines.reduce((sum, l) => sum + l.amountCents, 0);
  const draft = invoices.find((i) => i.status === "draft") ?? null;
  const clientName = contacts[0]?.displayName?.split(" ")[0];

  function startInvoice() {
    if (!rateCents) return;
    const invoice = createInvoice({
      matterId,
      number: nextInvoiceNumber(matterId, invoices),
      lines: unbilledLines,
      termDays: settings?.termDays ?? 30,
    });
    void persist([...invoices, invoice]);
  }

  function addManualLine() {
    if (!draft) return;
    const cents = usdToCents(manual.amount);
    if (cents === null || cents === 0 || !manual.description.trim()) {
      setError("A description and an amount like 45.00 are both needed.");
      return;
    }
    setError(null);
    const line: InvoiceLine = {
      id: `${manual.kind}-${Date.now()}`,
      kind: manual.kind,
      date: new Date().toISOString().slice(0, 10),
      description: manual.description.trim(),
      amountCents: cents,
    };
    void persist(
      invoices.map((i) => (i.id === draft.id ? { ...i, lines: [...i.lines, line] } : i)),
    );
    setManual({ ...manual, description: "", amount: "" });
  }

  function removeLine(invoiceId: string, lineId: string) {
    void persist(
      invoices.map((i) =>
        i.id === invoiceId ? { ...i, lines: i.lines.filter((l) => l.id !== lineId) } : i,
      ),
    );
  }

  async function requestPaymentLink(invoice: Invoice) {
    setBusy(true);
    setError(null);
    try {
      const resp = await fetch(
        `/api/matters/${matterId}/invoices/${invoice.id}/payment-link`,
        { method: "POST" },
      );
      const data = (await resp.json()) as { paymentUrl?: string; error?: string };
      if (!resp.ok || !data.paymentUrl) {
        setError(data.error ?? "Could not create a payment link.");
        return;
      }
      setInvoices((current) =>
        current.map((i) => (i.id === invoice.id ? { ...i, paymentUrl: data.paymentUrl } : i)),
      );
    } catch {
      setError("Could not reach Stripe.");
    } finally {
      setBusy(false);
    }
  }

  async function copyEmail(invoice: Invoice) {
    const email = formatInvoiceEmail({
      invoice,
      matterTitle,
      clientName,
      signature: settings?.signature,
    });
    try {
      await navigator.clipboard.writeText(`Subject: ${email.subject}\n\n${email.body}`);
      setCopied(invoice.id);
      window.setTimeout(() => setCopied(null), 2500);
    } catch {
      setError("Could not copy. Select the text below instead.");
    }
  }

  function markSent(invoice: Invoice) {
    void persist(
      invoices.map((i) =>
        i.id === invoice.id ? { ...i, status: "sent" as const, sentAt: new Date().toISOString() } : i,
      ),
    );
  }

  function markPaid(invoice: Invoice) {
    void persist(
      invoices.map((i) =>
        i.id === invoice.id ? { ...i, status: "paid" as const, paidAt: new Date().toISOString() } : i,
      ),
    );
  }

  if (loading) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600">
        Loading billing…
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Billing</h2>

        {error ? (
          <p role="alert" className="mt-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
            {error}
          </p>
        ) : null}

        {/* Rate first — nothing downstream can be right without it. */}
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="hourly-rate" className="block text-xs font-medium text-slate-700">
              Your hourly rate
            </label>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="text-sm text-slate-500">$</span>
              <input
                id="hourly-rate"
                inputMode="decimal"
                className="w-28 rounded-md border border-slate-300 px-2 py-1 text-sm"
                value={rateInput}
                placeholder="250.00"
                onChange={(e) => setRateInput(e.target.value)}
                onBlur={commitRate}
              />
              <span className="text-sm text-slate-500">/ hr</span>
            </div>
          </div>
          {rateCents ? (
            <p className="pb-1 text-xs text-slate-500">
              Saved on this browser. Change it any time.
            </p>
          ) : (
            <p className="pb-1 text-xs text-amber-800">
              Set this before invoicing — nothing is billed at a rate you didn&rsquo;t choose.
            </p>
          )}
        </div>

        {/* Unbilled work */}
        <div className="mt-4 border-t border-slate-100 pt-4">
          {!rateCents ? (
            <p className="text-sm text-slate-600">Enter your rate to see unbilled work.</p>
          ) : unbilledLines.length === 0 ? (
            <p className="text-sm text-slate-600">
              No unbilled time on this matter. Time logged on a note — pick an activity when you save
              one — shows up here ready to invoice.
            </p>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-700">
                <span className="font-medium text-slate-900">
                  {(unbilledMinutes / 60).toFixed(2)} hr
                </span>{" "}
                unbilled · {centsToUsd(unbilledCents)} across {unbilledLines.length} entr
                {unbilledLines.length === 1 ? "y" : "ies"}
              </p>
              <button
                type="button"
                disabled={busy || Boolean(draft)}
                className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                onClick={startInvoice}
              >
                {draft ? "Draft already open" : "Create invoice"}
              </button>
            </div>
          )}
        </div>
      </div>

      {invoices.length === 0 ? null : (
        <div className="space-y-4">
          {[...invoices].reverse().map((invoice) => {
            const totals = invoiceTotals(invoice);
            const email = formatInvoiceEmail({
              invoice,
              matterTitle,
              clientName,
              signature: settings?.signature,
            });
            return (
              <div key={invoice.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">
                      Invoice {invoice.number}
                    </h3>
                    <p className="mt-0.5 text-sm text-slate-600">
                      {centsToUsd(totals.totalCents)} · due {invoice.dueDate}
                    </p>
                  </div>
                  <span
                    className={
                      invoice.status === "paid"
                        ? "rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-900"
                        : invoice.status === "sent"
                          ? "rounded-full bg-sky-100 px-2.5 py-1 text-xs font-medium text-sky-900"
                          : "rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
                    }
                  >
                    {invoice.status}
                  </span>
                </div>

                <ul className="mt-3 divide-y divide-slate-100">
                  {invoice.lines.map((line) => (
                    <li key={line.id} className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
                      <span className="min-w-0 text-slate-700">
                        <span className="font-mono text-xs text-slate-500">{line.date}</span>{" "}
                        {line.description}
                        {line.kind === "time" && line.minutes ? (
                          <span className="text-slate-500">
                            {" "}
                            ({(roundToBillingIncrement(line.minutes) / 60).toFixed(2)} hr)
                          </span>
                        ) : null}
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className="tabular-nums text-slate-800">
                          {centsToUsd(line.amountCents)}
                        </span>
                        {invoice.status === "draft" ? (
                          <button
                            type="button"
                            aria-label={`Remove ${line.description}`}
                            className="text-xs text-slate-400 hover:text-rose-700"
                            onClick={() => removeLine(invoice.id, line.id)}
                          >
                            ×
                          </button>
                        ) : null}
                      </span>
                    </li>
                  ))}
                  {invoice.lines.length === 0 ? (
                    <li className="py-1.5 text-sm text-slate-500">No lines yet.</li>
                  ) : null}
                </ul>

                <p className="mt-2 flex justify-between border-t border-slate-200 pt-2 text-sm font-semibold text-slate-900">
                  <span>Total</span>
                  <span className="tabular-nums">{centsToUsd(totals.totalCents)}</span>
                </p>

                {/* Fees and expenses she adds by hand — "what expenses did I
                    incur handling this?" */}
                {invoice.status === "draft" ? (
                  <div className="mt-3 flex flex-wrap items-end gap-2 rounded-md border border-dashed border-slate-200 bg-slate-50/60 p-3">
                    <select
                      aria-label="Line type"
                      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
                      value={manual.kind}
                      onChange={(e) => setManual({ ...manual, kind: e.target.value as "fee" | "expense" })}
                    >
                      <option value="expense">Expense</option>
                      <option value="fee">Flat fee</option>
                    </select>
                    <input
                      aria-label="Line description"
                      placeholder="Certified medical records"
                      className="min-w-48 flex-1 rounded-md border border-slate-300 px-2 py-1 text-sm"
                      value={manual.description}
                      onChange={(e) => setManual({ ...manual, description: e.target.value })}
                    />
                    <input
                      aria-label="Amount"
                      inputMode="decimal"
                      placeholder="45.00"
                      className="w-24 rounded-md border border-slate-300 px-2 py-1 text-sm"
                      value={manual.amount}
                      onChange={(e) => setManual({ ...manual, amount: e.target.value })}
                    />
                    <button
                      type="button"
                      disabled={busy}
                      className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-sm text-slate-700 hover:border-slate-400 disabled:opacity-50"
                      onClick={addManualLine}
                    >
                      Add
                    </button>
                  </div>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2">
                  {invoice.status !== "paid" ? (
                    invoice.paymentUrl ? (
                      <a
                        href={invoice.paymentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:border-slate-400"
                      >
                        Open payment link
                      </a>
                    ) : (
                      <button
                        type="button"
                        disabled={busy || totals.totalCents <= 0}
                        className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:border-slate-400 disabled:opacity-50"
                        onClick={() => void requestPaymentLink(invoice)}
                      >
                        Create Stripe payment link
                      </button>
                    )
                  ) : null}
                  <button
                    type="button"
                    className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
                    onClick={() => void copyEmail(invoice)}
                  >
                    {copied === invoice.id ? "Copied" : "Copy email to client"}
                  </button>
                  {invoice.status === "draft" ? (
                    <button
                      type="button"
                      disabled={busy}
                      className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:border-slate-400 disabled:opacity-50"
                      onClick={() => markSent(invoice)}
                    >
                      Mark sent
                    </button>
                  ) : null}
                  {invoice.status === "sent" ? (
                    <button
                      type="button"
                      disabled={busy}
                      className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:border-slate-400 disabled:opacity-50"
                      onClick={() => markPaid(invoice)}
                    >
                      Mark paid
                    </button>
                  ) : null}
                </div>

                <details className="mt-3">
                  <summary className="cursor-pointer text-sm text-sky-800 hover:underline">
                    Preview the email
                  </summary>
                  <p className="mt-2 text-xs text-slate-500">Subject: {email.subject}</p>
                  <pre className="mt-1 max-h-72 overflow-auto whitespace-pre-wrap rounded-md border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-700">
{email.body}
                  </pre>
                </details>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
