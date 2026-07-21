# Activate Stripe Checkout on Vercel (Pass 16)

Plain-English steps for turning on **pay-before-dispatch** on production. Code is already deployed on `aod-next`; checkout goes live only after these secrets exist on Vercel (never commit them to git).

## 1. Add three environment variables (Vercel)

Project: **aod-next** → Settings → Environment Variables → **Production** (and Preview if you test there).

| Variable | Purpose |
|----------|---------|
| `STRIPE_SECRET_KEY` | Server-side Stripe API (`sk_test_…` for test, `sk_live_…` for live) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Browser Stripe.js (`pk_test_…` or `pk_live_…`) |
| `STRIPE_WEBHOOK_SECRET` | Verifies webhook signatures (`whsec_…` from the Stripe Dashboard endpoint) |

After saving, **redeploy** the web app (or trigger a new production deployment) so Next.js picks up the new values.

**Where to get keys:** Stripe Dashboard → Developers → API keys (secret + publishable). Use **test** keys first.

## 2. Register the webhook in Stripe

1. Stripe Dashboard → Developers → **Webhooks** → Add endpoint.
2. **Endpoint URL:** `https://aod-next.vercel.app/api/stripe/webhook`
3. **Events to send:** `checkout.session.completed` (only this event is required for assignment checkout).
4. Copy the signing secret into Vercel as `STRIPE_WEBHOOK_SECRET`.

If the secret or URL is wrong, checkout may succeed in Stripe but the assignment will stay **awaiting payment** in the inbox.

## 3. Smoke-test with Stripe’s test card

Use [Stripe test mode](https://stripe.com/docs/testing) keys on Vercel, then:

1. Sign in at https://aod-next.vercel.app
2. Open **New assignment** (e.g. `/assignments/new?deliverable=aos-discretionary-brief`), submit with valid facts.
3. You should be redirected to **Stripe Checkout**; pay with:
   - **Card:** `4242 4242 4242 4242`
   - **Expiry:** any future date
   - **CVC:** any 3 digits
4. After success, you should land on the inbox with a payment success toast; the row should show **paid** and move into **In progress** (PM dispatch).

Optional checks: **Settings → Billing** shows Stripe status (test vs live); dashboard **awaiting payment** banner clears when nothing is pending.

Automated checks in repo:

```bash
cd web && npm run test:stripe-pricing && npm run test:stripe-webhook
bash scripts/stripe-setup-checklist.sh
```

## Local webhook testing (Stripe CLI)

For development before Vercel secrets exist:

```bash
# Terminal 1 — Next.js (demo or with test keys in web/.env.local)
cd web && npm run dev

# Terminal 2 — forward webhooks to local route
stripe listen --forward-to localhost:3000/api/stripe/webhook
# Copy whsec_… from CLI output into STRIPE_WEBHOOK_SECRET (web/.env.local, not committed)

# Terminal 3 — trigger test event after a checkout session
stripe trigger checkout.session.completed
```

Production webhook URL remains `https://aod-next.vercel.app/api/stripe/webhook`.

Abandoned intake follow-up cron (separate): set `RESEND_API_KEY` + optional `CRON_SECRET` on Vercel; schedule in `web/vercel.json` hits `/api/cron/abandoned-intake`.

## 4. Pay-before-dispatch flow (when keys are set)

```text
Intake submit → assignment saved (Submitted) with payment_status pending
             → redirect to Stripe Checkout
             → customer pays
             → Stripe POSTs checkout.session.completed to /api/stripe/webhook
             → app marks assignment paid and runs PM dispatch (In progress → Ready for review when draft is ready)
```

Pricing uses catalog midpoint (cents) with optional sample discount logic in `stripe-pricing.ts`. Payment metadata lives on the PM Inbox item options JSON (no Airtable schema change).

## 5. Fallback when keys are missing

If **either** `STRIPE_SECRET_KEY` **or** `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is unset:

- Intake still works; assignments use **invoice-after-delivery** (`payment_status: invoice`).
- PM dispatch runs **immediately** on submit (same as pre–Pass 16 behavior).
- UI shows billing honesty copy (no fake checkout); Settings → Billing indicates Stripe is not configured.

Webhook route returns **503** if `STRIPE_WEBHOOK_SECRET` is missing while checkout keys are set — configure all three before going live.

## Related

- Pass 16 summary in `CHECKPOINT.md` (autonomous pass log).
- Off-platform invoicing for pilots without Checkout: invoicing runbook (LawPay / Payment Links).
