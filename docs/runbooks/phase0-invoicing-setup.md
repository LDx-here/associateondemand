# Phase 0 invoicing setup (Stripe + LawPay)

**Last updated:** July 6, 2026  
**Related:** [`phase0-b2b-overflow-launch.md`](./phase0-b2b-overflow-launch.md) · [`LEGAL_BOUNDARIES.md`](../../LEGAL_BOUNDARIES.md)

Phase 0 has **no in-app checkout**. RMV collects flat fees **off-platform** after scope is agreed and before or after delivery. This runbook covers the manual accounts and workflows to use until Phase 2 in-app billing ships.

---

## What to set up

| Tool | Role in Phase 0 | In-app integration |
|------|-----------------|-------------------|
| **Stripe** (Recover My Value business account) | One-off payment links, ACH/card for pilot clients | None — send links by email |
| **LawPay** (optional, if RMV already uses it for trust/IOLTA) | Client trust deposits or operating payments under bar-compliant flows | None — manual invoice + portal link |
| **QuickBooks / Wave / spreadsheet** | Invoice numbering, revenue tracking, sample-discount audit trail | None |

Pick **one primary card/ACH path** for pilot clients (Stripe Payment Links is fastest). Use LawPay when the engagement requires trust-account handling or the client expects a law-firm payment portal.

---

## Stripe (recommended for pilot flat fees)

### 1. Account

1. Sign in at [stripe.com](https://stripe.com) with the **Recover My Value, LLC** business entity (not a personal account).
2. Complete business verification (EIN, bank account for payouts, MN business address).
3. Enable **Payment Links** (Dashboard → Payment links → Create).

### 2. Product catalog (mirror launch SKUs)

Create products or ad-hoc links that match [`web/src/lib/deliverable-catalog.ts`](../../web/src/lib/deliverable-catalog.ts):

| SKU | Suggested Stripe product name | Amount (quote within range) |
|-----|------------------------------|-----------------------------|
| `aos-discretionary-brief` | AOD — AOS Discretionary Brief | $750–$1,500 |
| `custom-motion` | AOD — Motion or Short Filing | $250–$450 |
| `hearing-packet` | AOD — Hearing Packet | $500–$1,250 |
| `research-memo` | AOD — Research Memo | $500–$900 |

Use **fixed amounts per quote** (not a range on the link). Apply **20% sample discount** manually when intake used the sample checkbox — create a discounted link or issue a credit note in your books.

### 3. Pilot workflow

1. Agree fee in email (see [phase0-b2b-overflow-launch.md](./phase0-b2b-overflow-launch.md) pre-sale steps).
2. Create a **Payment Link** for the exact quoted amount (or send an **Invoice** from Stripe Billing if you prefer PDF + due date).
3. Email the link with: matter reference, deliverable name, turnaround, and disclaimer that payment is for limited-scope overflow counsel (not platform subscription).
4. Mark paid in your CRM/spreadsheet when Stripe notifies you; do **not** block agent work on payment in Phase 0 unless your engagement letter requires deposit first.

### 4. Receipts and books

- Stripe Dashboard → Payments → export for accounting.
- Map each payment to Airtable matter ID in a Note or external CRM field for audit.

---

## LawPay (optional — trust / IOLTA)

Use when the pilot engagement is structured as a **client fee through RMV's trust or operating account** rather than a simple B2B overflow invoice.

### 1. Account

1. Confirm RMV's existing LawPay merchant profile (or apply at [lawpay.com](https://www.lawpay.com)).
2. Verify **IOLTA vs operating** account routing with your bookkeeper — overflow flat fees to external attorneys may belong in **operating**, not trust, unless bar rules require otherwise for your engagement structure.

### 2. Manual invoice flow

1. LawPay Dashboard → **Invoices** (or **Payment Pages**) → create invoice for quoted flat fee.
2. Send to client email; client pays via LawPay-hosted page.
3. Record LawPay transaction ID on the matter (Airtable Note or external ledger).

### 3. When to prefer LawPay over Stripe

- Client insists on paying through a **law-firm payment portal**.
- Engagement letter references **LawPay** or trust deposit language.
- RMV already reconciles all client revenue through LawPay for bar audit consistency.

For simple B2B overflow (external solo pays RMV for a deliverable), **Stripe Payment Links on the operating side** is usually enough for Phase 0.

---

## Booking URL (consultation front door)

Not billing, but part of Phase 0 front door:

1. Create a **Google Calendar Appointment Schedule** or **Cal.com** event type for "Overflow counsel scope call" (15–30 min).
2. In Vercel → Project → Settings → Environment Variables, set:
   - `NEXT_PUBLIC_BOOKING_URL` = full embed or schedule URL
3. Redeploy web. Verify https://aod-next.vercel.app/book shows the scheduler (or setup instructions if unset).

Sidebar link: **Book consultation** → `/book`.

---

## Checklist before first paid pilot

- [ ] Stripe (or LawPay) business account verified and bank linked
- [ ] Payment link or invoice template tested with $1 test charge
- [ ] Flat fee quoted in writing matches catalog range + any rush/sample discount
- [ ] Manual conflict check documented (email or CRM)
- [ ] Engagement / scope agreement signed or confirmed in email **outside** the app
- [ ] Assignment submitted at `/assignments/new` with disclaimer acknowledged
- [ ] Payment link sent (deposit or full fee per engagement terms)
- [ ] RMV sign-off on deliverable before client delivery (Phase 0 lock)

---

## Phase 2+ (do not build yet)

- In-app Stripe Checkout or LawPay embed on assignment submit
- Automatic invoice generation from assignment `options` JSON (deliverable, tier, discount flags)
- Deposit-hold before PM dispatch

Track product decisions in [`docs/strategy/AssociateOnDemand_Implementation_Phasing.md`](../strategy/AssociateOnDemand_Implementation_Phasing.md).
