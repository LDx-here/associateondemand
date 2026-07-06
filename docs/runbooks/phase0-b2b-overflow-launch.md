# Phase 0: B2B overflow launch (manual billing)

**Last updated:** July 5, 2026  
**Provisional decisions:** [`docs/strategy/AssociateOnDemand_Implementation_Phasing.md`](../strategy/AssociateOnDemand_Implementation_Phasing.md) — Strategic lock (2026-07-05)  
**Legal guardrails:** [`LEGAL_BOUNDARIES.md`](../../LEGAL_BOUNDARIES.md)

Phase 0 sells lawyer-reviewed deliverables through the **existing** assignment → PM Inbox → export workflow. No Stripe, chat intake, or e-sign in this phase.

---

## Scope

| In scope | Out of scope (later phases) |
|----------|----------------------------|
| Manual sales to 1–3 pilot clients (external solo immigration attorneys ± RMV overflow) | In-app Stripe / deposits |
| Off-platform invoicing (invoice + ACH/check/Stripe payment link sent manually) | Engagement letter + e-sign |
| Launch SKUs: **`aos-discretionary-brief`**, **`custom-motion`**, **`hearing-packet`**, **`research-memo`** (upsell) | In-app Stripe / deposits; chat-first intake |
| RMV signs every deliverable (Phase 0–2) | Contract associate routing (Phase 3+) |
| Form intake at `/assignments/new` | Chat-first intake |
| Manual conflict check | Conflict-check UX in app |
| Catalog turnaround SLAs (+ optional rush fee quoted at intake) | "Usable by Tomorrow" blanket promise |

**Production URLs:** Web https://aod-next.vercel.app · API https://associateondemand-api.fly.dev

---

## Launch SKU list

| Catalog ID | Name | Tier | Turnaround (client-facing) | Flat-fee range (USD) |
|------------|------|------|----------------------------|------------------------|
| `aos-discretionary-brief` | AOS Discretionary Brief | Template | 1–2 business days | $750–$1,500 |
| `custom-motion` | Motion or Short Filing | Custom | 1–3 business days | $250–$450 |
| `hearing-packet` | Hearing Packet / Exhibit Organization | Template | 1–2 business days | $500–$1,250 |
| `research-memo` | Research Memo | Research | 1–3 business days (scope-dependent) | $500–$900 |

Source of truth: [`web/src/lib/deliverable-catalog.ts`](../../web/src/lib/deliverable-catalog.ts). Rush: quote **+30–50%** at intake for expedited queue priority — not a guaranteed next-calendar-day delivery unless explicitly scoped and priced as rush.

Intake requires **limited-scope disclaimer acknowledgment** (jurisdiction/practice-area aware) before submit.

---

## SLA language for client comms

Use **catalog turnaround**, not "Usable by Tomorrow."

**Standard (AOS brief):**  
*"Typical turnaround is 1–2 business days after we receive complete facts and attachments. Attorney review and sign-off are included."*

**Research memo:**  
*"Typical turnaround is 1–3 business days depending on scope, after facts are complete."*

**Rush (optional, quoted in writing before work starts):**  
*"Expedited queue priority is available at a rush fee of 30–50% above the quoted flat fee. Rush does not guarantee same-calendar-day delivery unless we explicitly confirm that scope in writing."*

Clock starts when the facts packet is **complete** (intake form submitted with sufficient detail + any requested documents uploaded).

---

## Step-by-step: first external client matter

### 1. Pre-sale (off-platform)

1. Confirm deliverable type and flat fee (within catalog range; sample discount if offered — document in your own CRM/Notes).
2. Quote turnaround from catalog + rush terms if applicable.
3. Run a **manual conflict check** (client name, adverse parties, RMV relationships). No automated conflict UX in Phase 0.
4. Send MN-aligned disclaimer language (see [Compliance notes](#compliance-notes-legal_boundariesmd)).
5. Collect agreement to scope and fee **in email or signed engagement outside the platform** (Phase 0 — no in-app engagement letter).

### 2. Intake (platform)

1. Client or RMV opens **New assignment**: https://aod-next.vercel.app/assignments/new  
   - Or prefill from catalog: `/assignments/new?deliverable=aos-discretionary-brief`, `?deliverable=custom-motion`, `?deliverable=hearing-packet`, or `?deliverable=research-memo`
2. Complete: deliverable type, tier (prefilled), facts packet, attachments, priority, due date if rush.
3. Acknowledge the **limited-scope disclaimer** (required checkbox).
4. Submit — creates Matter, Task, facts Note, and PM Inbox row in **Submitted**.
5. PM auto-dispatches on submit; row may advance to **In progress** then **Ready for review** when a reviewable draft exists.

Optional: set `ASSIGNMENT_NOTIFY_EMAIL` + `RESEND_API_KEY` on Vercel so RMV gets email on new assignments.

### 3. Production (RMV inbox)

1. Open **PM Inbox**: https://aod-next.vercel.app/inbox  
2. **Submitted → In progress → Ready for review** as work proceeds.
3. Review draft on matter workbench; fix linter issues before export if flagged.
4. **Approve** with sign-off note when deliverable meets RMV standard.
5. **Return** with revision note if client facts were incomplete or draft needs rework.

### 4. Delivery (export)

1. From matter workbench / Associate panel, export DOCX (and citation ZIP if applicable).
2. RMV performs final edit and **signs** the deliverable (RMV-only sign-off in Phase 0).
3. Deliver to client via secure channel (encrypted email, portal, or agreed method — outside AOD billing scope).

### 5. Billing (off-platform)

1. Send invoice for agreed flat fee (plus rush if applicable).
2. Accept payment via ACH, check, or manual Stripe payment link.
3. Track payment status in Airtable Note or external spreadsheet until Phase 2 automation.

**Phase 0 invoicing setup (hands-off):** No in-app Stripe yet — use one of these until Phase 2:

| Option | Setup | Phase 0 workflow |
|--------|--------|------------------|
| **Stripe Invoicing** | [dashboard.stripe.com](https://dashboard.stripe.com) → Invoicing → create customer + send invoice or **Payment Link** | Email link after deliverable approved; mark paid in Airtable Note |
| **LawPay** (IOLTA-friendly) | [lawpay.com](https://www.lawpay.com) → trust/IOLTA account if holding client funds; otherwise operating account for flat B2B fees | Send LawPay payment request from dashboard |
| **Manual** | ACH/check details on your letterhead | No third-party keys needed |

**Phase 2 env vars (Vercel — do not set until integration ships):** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`. Phase 0 = manual invoice from Stripe/LawPay dashboard only.

---

## Consultation booking (`/book`)

Low-volume scheduling for overflow prospects or scope calls:

1. In Google Calendar: **Create** → **Appointment schedule** (or use [Cal.com](https://cal.com)).
2. Copy the public booking URL.
3. In Vercel → Project → Settings → Environment Variables, set `NEXT_PUBLIC_BOOKING_URL` to that URL (Production + Preview).
4. Redeploy. The app route https://aod-next.vercel.app/book embeds the scheduler; sidebar link **Book consultation** appears in the app shell.

If the env var is unset, `/book` shows setup instructions instead of a broken iframe.

---

## Checklist before accepting first paid matter

- [ ] Provisional phasing decisions reviewed; user overrides captured in Implementation Phasing doc if any
- [ ] Conflict check completed manually
- [ ] Flat fee and turnaround quoted in writing; rush terms documented if applicable
- [ ] MN-aligned disclaimers sent (limited scope, supervising attorney, AI assists under attorney review)
- [ ] No implied Harvey/Clio/partnership language in client comms ([`LEGAL_BOUNDARIES.md`](../../LEGAL_BOUNDARIES.md))
- [ ] Client understands no attorney–client relationship with the platform alone; RMV is supervising attorney of record
- [ ] Intake URL tested (`/assignments/new` with correct deliverable prefill)
- [ ] RMV inbox access confirmed (Supabase auth)
- [ ] Export path tested on a smoke matter (DOCX + linter)
- [ ] Off-platform invoice template ready
- [ ] Payment method agreed (ACH / check / Stripe link)

---

## Compliance notes (LEGAL_BOUNDARIES.md)

- **No implied integrations:** Do not tell clients AOD integrates with Harvey, Wordsmith, or Clio unless separately authorized. Chat UI is AOD-native.
- **Self-service AI tier:** Do not sell $99/month raw AI access in Phase 0; bar-counsel review required before any self-serve tier ([`LEGAL_BOUNDARIES.md`](../../LEGAL_BOUNDARIES.md)).
- **Data handling:** Default `AOD_PII_TIER=0`; documents traverse OCR/LLM only after anonymization when Tier 1 is enabled (see root `.env.example`).
- **eImmigration / USCIS portals:** Prefer exports and official APIs; no silent scraping.
- **Fee sharing / multi-state practice:** MN Rule 5.4 and target-state bar rules apply to overflow arrangements — confirm with bar counsel before scaling multi-state marketing (provisional default: MN-anchored disclaimers).

---

## After first paid matter closes

1. Record gross margin (fee minus RMV review time + tool costs) — target 70–80% per Monetization Strategy.
2. Update [`CHECKPOINT.md`](../../CHECKPOINT.md) when Phase 0 milestone completes.
3. Begin Phase 1: pricing on catalog cards, disclaimer copy on submit, expanded external outreach.

**Related docs:** [`AssociateOnDemand_Monetization_Strategy.md`](../../AssociateOnDemand_Monetization_Strategy.md) · [`AssociateOnDemand_B2B_Service_Analysis.md`](../../AssociateOnDemand_B2B_Service_Analysis.md) · [`CHECKPOINT.md`](../../CHECKPOINT.md)
