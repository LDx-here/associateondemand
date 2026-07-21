# Overflow counsel billing model

**Last updated:** July 21, 2026  
**Related:** [`phase0-invoicing-setup.md`](./phase0-invoicing-setup.md) · [`stripe-activation.md`](./stripe-activation.md) · [`LEGAL_BOUNDARIES.md`](../../LEGAL_BOUNDARIES.md) · [`.aod-context/features/AssociateOnDemand_Production_Cost_Pricing.md`](../../.aod-context/features/AssociateOnDemand_Production_Cost_Pricing.md)

**Pass 20:** External partner funnel shipped at `/partner/submit` — partner metadata on PM Inbox; Stripe checkout when `STRIPE_CHECKOUT_ENABLED=true`.

## Who pays whom

| Role | Pays | Receives |
|------|------|----------|
| **Partner law firm** (client) | RMV flat fee for deliverable | Verified overflow counsel work product |
| **RMV / La'Dajia** (vendor) | Nothing through the internal firm OS | Partner firm payment (invoice or future checkout) |

RMV is the **vendor**, not the payer. The internal operator dashboard (`/assignments/new`, inbox, matter workbench) is for **doing work**, not for RMV paying itself.

Flat-fee ranges on `/templates` and intake are **quotes to partner firms**, not self-checkout for RMV staff.

---

## Phase 0 — Off-platform invoice (now)

**Operator flow:** Submit assignment → PM dispatch → inbox → approve → export. No Stripe redirect.

**Partner payment:**

1. Agree fee in email or intake follow-up (see [`phase0-b2b-overflow-launch.md`](./phase0-b2b-overflow-launch.md)).
2. Send **Stripe Payment Link** or PDF invoice manually ([`phase0-invoicing-setup.md`](./phase0-invoicing-setup.md)).
3. Track `payment_status: invoice` on the assignment (default in PM Inbox options JSON). Mark paid in books when received — optional manual update to `paid` in options JSON for reporting.

Agent work is **not blocked** on partner payment unless your engagement letter requires a deposit first.

---

## Phase 1 — External partner submission + Stripe at submit

**Target:** Public or partner-authenticated funnel (early assignment submission on site) where the **partner firm** pays RMV at submit.

**Code status (kept, not wired to internal intake):**

- `POST /api/stripe/checkout` — create Checkout Session for an inbox item
- `POST /api/stripe/webhook` — `checkout.session.completed` → mark paid → dispatch
- `web/src/lib/stripe-pricing.ts` — catalog midpoint + sample discount
- Enable with `STRIPE_CHECKOUT_ENABLED=true` on the **external** funnel only (internal intake ignores checkout)

**Not built yet:** ~~Separate public `/assignments/new` (or marketing intake) route~~ **Shipped Pass 20:** `/partner/submit` + `POST /api/partner/assignments` — sets `source: partner` on PM Inbox options JSON; checkout when `STRIPE_CHECKOUT_ENABLED=true`.

---

## Phase 2+ — Clio trust → operating on delivery (document only)

**Vision:** Partner fee flows through Clio trust accounting; RMV recognizes revenue on delivery per bar-compliant rules.

**Status:** Documented only — **do not build** until bar counsel and [`LEGAL_BOUNDARIES.md`](../../LEGAL_BOUNDARIES.md) approve Clio trust integration. No IOLTA automation in Phase 0–1.

Reference: Clio eImmigration / trust modules remain out of scope per LEGAL_BOUNDARIES until explicitly enabled (`CLIO_ENABLED=true`).

---

## UI copy (internal dashboard)

| Surface | Message |
|---------|---------|
| Settings → Billing | Partner firms invoiced; RMV does not pay through this dashboard |
| Intake / Templates | Quoted flat fee for partner firm — invoiced off-platform |
| Dashboard | No “awaiting payment” banner for RMV operator (legacy `pending` badges read “Partner payment pending”) |

---

## Environment variables

| Variable | Phase 0 internal | Phase 1 external funnel |
|----------|------------------|-------------------------|
| `STRIPE_SECRET_KEY` | Optional (Payment Links manual) | Required for Checkout |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Optional | Required for Checkout |
| `STRIPE_WEBHOOK_SECRET` | Optional | Required for pay-before-dispatch |
| `STRIPE_CHECKOUT_ENABLED` | `false` or unset (default) | `true` on external routes only |

---

## Smoke / verify

```bash
cd web && npm run test:catalog && npm run test:stripe-pricing && npm run test:stripe-webhook
bash scripts/smoke-assignment-e2e.sh   # submit → dispatch → inbox (no checkout redirect)
```
