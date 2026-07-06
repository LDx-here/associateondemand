# AssociateOnDemand: Implementation Phasing & Open Decisions

**Last updated:** July 5, 2026  
**Purpose:** Resolve the eight open decisions from the [Strategic Business & Platform Plan](AssociateOnDemand%20Strategic%20Business%20%26%20Platform%20Plan.md) with practical defaults aligned to the live platform ([`CHECKPOINT.md`](CHECKPOINT.md), [`web/src/lib/deliverable-catalog.ts`](web/src/lib/deliverable-catalog.ts), [`LEGAL_BOUNDARIES.md`](LEGAL_BOUNDARIES.md)).

---

## Strategic lock (2026-07-05) — La'Dajia confirmed

These five decisions **override** the provisional defaults below:

| # | Locked decision |
|---|-----------------|
| 1 | **Pilot clients:** External attorneys/firms may submit; **RMV is the only verifying attorney** (Phase 0–2). |
| 2 | **Year-one model:** **RMV-verified deliverables only** — associate marketplace **Phase 3+** (Associate Services docs subordinate). |
| 3 | **Jurisdiction/disclaimers:** **Assignment-state and practice-area dependent** — requesting attorney retains filing/client responsibility; not MN-only lock. |
| 4 | **$99/mo self-serve AI tier:** **On roadmap** — **do not ship** without bar counsel approval (Phase 3+ gate). |
| 5 | **Day-one SKUs:** **`aos-discretionary-brief`**, **`custom-motion`**, **`hearing-packet`** (+ **`research-memo`** upsell). |

---

## Provisional Lock (July 5, 2026) — superseded where noted above

**Status:** Items below remain for reference; rows **2, 5** updated by strategic lock table.

| # | Decision | Provisional status |
|---|----------|-------------------|
| 1 | First paying customer: external solo immigration attorneys (+ 1–3 friendly/internal RMV overflow pilots first) | **Applied (default)** — pilot attorney queue still **Blocked — needs user** |
| 2 | Launch SKU: **`aos-discretionary-brief`**, **`custom-motion`**, **`hearing-packet`** at day one; **`research-memo`** upsell | **Locked (2026-07-05)** |
| 3 | Revenue collection: off-platform invoicing OK for first 5–10 clients | **Applied (default)** |
| 4 | Supervising attorney: RMV signs every deliverable initially (year one) | **Applied (default)** — contract-associate timeline / co-sign jurisdiction **Blocked — needs user** |
| 5 | Jurisdiction & disclaimers: **assignment-state and practice-area dependent** on intake; RMV verifies deliverable | **Locked (2026-07-05)** — bar counsel for multi-state scale still **Blocked — needs user** |
| 6 | SLA: catalog turnaround + rush fee (+30–50%); retire blanket "Usable by Tomorrow" | **Applied (default)** — hard calendar-day rush guarantees **Blocked — needs user** (default: business-day SLAs only) |
| 7 | $99/month self-service AI tier: defer to Phase 3+ pending bar counsel | **Applied (default)** — keep vs. drop entirely **Blocked — needs user** |
| 8 | Intake UX: form-first for v1; chat wraps form in Phase 3 | **Applied (default)** |

**Phase 0 artifacts using this lock:** [`docs/runbooks/phase0-b2b-overflow-launch.md`](../runbooks/phase0-b2b-overflow-launch.md), pricing fields in [`web/src/lib/deliverable-catalog.ts`](../../web/src/lib/deliverable-catalog.ts), intake disclaimer in [`web/src/lib/intake-disclaimer.ts`](../../web/src/lib/intake-disclaimer.ts).

---

## Platform Baseline (July 2026)

Production firm OS is live: assignment intake (`/assignments/new`), PM Inbox Kanban, template catalog, specialist agents, OCR → **Documents**, facts/agent memos → **Notes**, assignment metadata in PM Inbox `options` JSON. Not built: in-app payments, engagement letters, chat intake, pricing in UI, multi-attorney marketplace. Fastest path to revenue is selling through the existing workflow with manual billing—not waiting on net-new infrastructure.

---

## Open Decisions

### 1. First paying customer: external solo immigration attorneys vs. RMV/internal overflow only?

**Recommended default:** **External solo immigration attorneys** as the target market, with **1–3 friendly or internal RMV overflow matters** used first to validate intake → inbox → export → invoicing before cold outreach.

**Rationale:** CHECKPOINT shows the full assignment and review pipeline is production-ready; what remains unproven is unit economics and attorney willingness to pay. A short internal or trusted-contacts pilot de-risks ops without delaying external GTM. Immigration is the stated wedge and matches catalog SKUs (`aos-discretionary-brief`, `research-memo`, etc.).

**Needs user confirmation:** Whether RMV has enough internal overflow volume to run a meaningful pilot without external clients, and whether any existing attorney relationships should be first in queue.

**Phasing impact:** **Phase 0** — manual sales to first 1–3 clients; **Phase 1** — scale outreach to external solos once one paid deliverable closes cleanly.

---

### 2. Launch SKU: immigration brief only, or also motion/hearing packet at day one?

**Recommended default:** **Immigration brief only at launch** — sell **`aos-discretionary-brief`** (Template tier, 1–2 business days in catalog) as the hero SKU. Offer **research memo** (`research-memo`) as a secondary upsell. Defer **motion** (`custom-motion`, Custom tier) and **hearing packet** (not in catalog) until after 5+ successful brief deliveries.

**Rationale:** The catalog already wires AOS discretionary brief to a firm template and drafting SKILL; Custom tier motions require setup labor that breaks "flat fee" predictability on day one; hearing packet has pricing in strategy docs but no catalog entry or workflow. Narrow SKU focus speeds sales collateral and QA.

**Phasing impact:** **Phase 0** — brief (+ optional research memo); **Phase 1** — add `custom-motion` to sold offerings with explicit setup surcharge; **Phase 2+** — add hearing-packet SKU to catalog when exhibit-organization workflow exists.

---

### 3. Revenue collection: off-platform invoicing OK for first 5–10 clients?

**Recommended default:** **Yes — off-platform invoicing is acceptable** for the first 5–10 paying clients (invoice + ACH/check/Stripe payment link sent manually).

**Rationale:** CHECKPOINT and the master plan already designate Phase 0 as "manual sales and off-platform invoicing." In-app Stripe/deposits are Phase 2 work; building payments before proving deliverable quality delays revenue. Airtable can track payment status in a simple field or Note until billing is automated.

**Phasing impact:** **Phase 0** — manual invoice; **Phase 2** — Stripe deposits + automated invoicing once bar/ops model and SKU mix are stable.

---

### 4. Supervising attorney model: RMV signs every deliverable initially, or contract associates year one?

**Recommended default:** **RMV (La'Dajia) signs every deliverable initially** for all external client work in year one.

**Rationale:** CHECKPOINT explicitly describes the current model as "single verifying attorney (Supabase auth + RMV inbox)." Contract associates require bar rules, malpractice coverage, payout routing, and permissions work documented as "Later" in CHECKPOINT. RMV sign-off preserves UPL/fee-sharing compliance under the existing firm brand and matches the "lawyer-reviewed work product" positioning.

**Needs user confirmation:** Timeline for onboarding contract associates and whether any work will be co-signed under another supervising attorney's bar membership in a non-MN jurisdiction.

**Phasing impact:** **Phase 0–2** — RMV-only sign-off; **Phase 3** — contractor roles, assignment routing, and payout after legal/ops design in `LEGAL_BOUNDARIES.md`.

---

### 5. Jurisdiction and bar rules for marketing and disclaimers?

**Recommended default:** **Anchor marketing and disclaimers to Minnesota** (Recover My Value, LLC / RMV home jurisdiction) unless La'Dajia confirms a different primary bar state for the overflow entity. Disclaimers must state: limited-scope engagement, no attorney-client relationship with the platform alone, supervising attorney of record, and that AI assists drafting under attorney review—not legal advice to the end client from the platform.

**Rationale:** Strategic docs already cite MN Rule 5.4 and Ohio ORC 4705.07 for fee-sharing context; RMV operates as the law firm brand. `LEGAL_BOUNDARIES.md` requires bar-counsel review before self-service AI tiers and prohibits implied Harvey/Clio partnerships. Multi-state marketing needs per-state disclaimer review.

**Needs user confirmation:** Primary bar state(s) for RMV overflow practice, states where first target clients practice, and whether bar counsel has been engaged for the B2B overflow model (not just platform build).

**Phasing impact:** **Phase 0** — MN-aligned disclaimers on intake confirmation and deliverable cover notes; **Phase 1** — expand disclaimer set if selling across state lines; **Phase 2+** — formal engagement letter templates per jurisdiction.

---

### 6. SLA commitments: "Usable by Tomorrow" vs. catalog turnaround + rush?

**Recommended default:** **Retire "Usable by Tomorrow" as a blanket marketing promise.** Publish **catalog turnaround** from `deliverable-catalog.ts` (e.g., AOS brief: 1–2 business days) plus a **rush fee (+30–50%)** for expedited queue priority—not a hard next-calendar-day guarantee unless scoped and priced as rush.

**Rationale:** Catalog entries already define realistic turnarounds; immigration briefs often need fact-gathering and attorney review that exceed 24 hours. Rush premium is in the pricing strategy; tying SLA to catalog + rush protects margin and sets honest expectations. Marketing can still emphasize *relief* without over-promising.

**Phasing impact:** **Phase 0** — verbal/written SLA per matter at intake; **Phase 1** — surface turnaround + rush on catalog cards and `/assignments/new`; **Phase 2** — optional due-date enforcement in inbox.

---

### 7. $99/month self-service AI tier — still desired? Bar counsel required.

**Recommended default:** **Defer — not a year-one revenue priority.** Do not launch a self-service AI subscription until (a) external brief revenue is recurring and (b) bar counsel approves the tier structure. Keep the idea in the roadmap as a **Phase 3+ optional SKU**, not Phase 0–1.

**Rationale:** Master plan and `LEGAL_BOUNDARIES.md` flag bar-counsel review for self-service AI access. The $99 tier blurs the "lawyer-reviewed deliverable" brand and creates UPL/marketing risk if attorneys use raw agent output without RMV sign-off. Retainer/credits model ($1,500/mo) is a safer future upsell once delivery track record exists.

**Needs user confirmation:** Whether La'Dajia still wants a low-tier self-serve product at all, or prefers 100% human-reviewed deliverables only.

**Phasing impact:** **Phase 0–2** — no self-serve tier; **Phase 3** — bar-counsel review, then optional platform-access tier if approved.

---

### 8. Intake UX: chat replaces form, wraps form, or form-first for v1?

**Recommended default:** **Form-first for v1; chat wraps/pre-fills the form in Phase 3** after paid matters validate the structured intake path.

**Rationale:** `/assignments/new` is live, creates Matter + Task + facts Note + PM Inbox row, and auto-dispatches PM on submit (CHECKPOINT July 2026). Replacing it with chat-first would delay revenue for unproven UX. Harvey-style chat should **enhance** intake by conversational pre-fill; the form remains submission source of truth until chat MVP is validated—consistent with the updated UI/UX plan.

**Phasing impact:** **Phase 0–1** — form-only + autosave/lead capture improvements; **Phase 3** — optional chat layer that populates `/assignments/new` query params and fields.

---

## Recommended Locked Phasing Table

| Phase | Timeline (assumption) | Deliverables | Revenue / ops |
|-------|----------------------|--------------|---------------|
| **Phase 0** | Now – first paid matter (~2–4 weeks) | Sell **`aos-discretionary-brief`**, **`custom-motion`**, **`hearing-packet`** (+ **`research-memo`** upsell) via intake → inbox → export; RMV signs all work; jurisdiction-aware disclaimer on submit; manual conflict check; off-platform invoice | 1–3 pilot clients (external solos ± RMV overflow); validate unit economics |
| **Phase 1** | +4–8 weeks after first payment | Assignment email notify; expand sales; gross margin tracking | 5–10 clients; repeatable sales one-pager |
| **Phase 2** | +2–3 months after Phase 1 stable | Stripe deposit/checkout; limited-scope engagement letter template; conflict-check checklist UX | Predictable cash collection |
| **Phase 3** | +6–12 months | Chat-enhanced intake; **Associate Services Marketplace** (matching engine, freelance attorney profiles, bar + background-check **verification**, project applications, **escrow**, ratings) — see below; retainer/credits; bar-counsel-reviewed self-serve tier *if approved* | Marketplace scale; MRR from retainers |

**Timeline assumptions:** Phase 0 can start immediately with no code blockers. Phase 1 is mostly UI/config (1–2 dev passes). Phase 2 depends on bar/ops sign-off and Stripe. Phase 3 depends on contractor legal design and chat MVP validation.

### Phase 3 — Associate Services Marketplace (detail)

The marketplace graduates the contract-associate track (CHECKPOINT "Later: contractor roles, payout/assignment routing") into a LawClerk/Docketly-style lawyer-to-lawyer platform. Reference docs: [`AssociateOnDemand_ Associate Services Marketplace Strategic Plan.md`](../../AssociateOnDemand_%20Associate%20Services%20Marketplace%20Strategic%20Plan.md), [workflow](AssociateOnDemand_Associate_Services_Workflow.md), [schema](AssociateOnDemand_Associate_Services_Airtable_Schema.md), [monetization](AssociateOnDemand_Associate_Services_Monetization_Strategy.md).

**Scope:** smart matching engine · freelance attorney profiles · bar + background-check **verification gate** (default-deny; annual re-verification) · project applications · **escrow**/payment release · ratings & reviews.

**Marketplace decisions (RESOLVED — La'Dajia, July 6, 2026):**

*   **Fee model:** **flat platform fee + firm subscription tiers (LawClerk-style, 0% of the legal fee)** — not a percentage commission. Materially de-risks Rule 1.5(e) / 7.2(b).
*   **Trust / escrow holder:** **Recover My Value, LLC (RMV)** (IOLTA/trust-accounting rules); flat-fee structure may let the platform avoid holding the legal fee entirely (firm pays attorney directly) — bar-counsel confirm.
*   **Supervisor / attorney-of-record:** **La'Dajia** for now — consistent with the Phase 0 lock (RMV signs deliverables).
*   **Service scope:** **drafting/preparation of items for licensed attorneys** — AOD is not the attorney of record, does not represent the requesting firm's client, and does not appear in court (UPL guardrail). See [`LEGAL_BOUNDARIES.md`](../../LEGAL_BOUNDARIES.md).

**Dependencies (remaining — must land before build):**

*   **Bar-counsel sign-off + malpractice confirmation** — final bar-counsel review of the marketplace structure and confirmation of malpractice coverage allocation. The flat-fee choice de-risks Rule 1.5(e)/7.2(b), but confirmation is still required (Rule 1.5(e) client-consent flow only if any residual share-of-legal-fee division is reintroduced). See [`LEGAL_BOUNDARIES.md`](../../LEGAL_BOUNDARIES.md).
*   **In-app payments (Phase 2)** — Stripe/escrow rails and RMV trust-accounting (IOLTA) handling must exist before funds move (or the cleaner "firm pays attorney directly; platform bills flat fee separately" path is adopted).
*   **Multi-role auth** — freelance-attorney vs. requesting-firm vs. RMV-verifier roles/permissions (CHECKPOINT: contractor roles are "Later").

---

## Decisions Requiring La'Dajia's Explicit Sign-Off

- **First customer mix:** Internal RMV overflow only vs. external solos from day one, and which attorney relationships to pilot first.
- **Primary bar jurisdiction(s)** for marketing disclaimers and engagement letters (default MN assumed).
- **Whether bar counsel has been or will be retained** for the B2B overflow model and any future self-serve AI tier.
- **Contract associate timeline:** RMV-only sign-off for all of year one, or early contractor onboarding in a specific state.
- **$99/month self-service AI tier:** keep on roadmap vs. drop entirely in favor of human-reviewed-only brand.
- **Rush SLA hard limits:** whether any SKU gets a guaranteed calendar-day turnaround at a premium, or catalog business-day SLAs only.
- **Launch SKU confirmation:** immigration brief only at day one (recommended) vs. also selling motion/hearing packet immediately despite catalog gaps.
- **Multi-state client marketing:** which states to accept clients from in Phase 0–1 before expanded disclaimer review.

---

## References

- [`CHECKPOINT.md`](CHECKPOINT.md) — live platform inventory (July 2026)
- [`web/src/lib/deliverable-catalog.ts`](web/src/lib/deliverable-catalog.ts) — SKU IDs and turnaround defaults
- [`LEGAL_BOUNDARIES.md`](LEGAL_BOUNDARIES.md) — integration and bar-risk guardrails
- [`AssociateOnDemand Strategic Business & Platform Plan.md`](./AssociateOnDemand_Strategic_Business_Platform_Plan.md) — index and phasing summary
