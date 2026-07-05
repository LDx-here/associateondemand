# AssociateOnDemand Strategic Business & Platform Plan

**Last updated:** July 5, 2026  
**Status:** Index document — source-of-truth detail lives in the linked files below.

This document consolidates the strategic direction for AssociateOnDemand as a B2B legal overflow service. It does **not** duplicate the full text of each plan; read the linked documents for implementation detail.

---

## Executive Summary

AssociateOnDemand will operate as a **B2B legal overflow service** under Recover My Value, LLC d/b/a Associate on Demand, delivering **lawyer-reviewed work product** (not raw AI drafts) to solo attorneys and small firms. The initial wedge is **immigration brief support**, with flat-fee pricing, rush premiums, and sample discounts.

The platform already supports much of this workflow: assignment intake, Airtable-backed matters, PM Inbox Kanban review, specialist agents, OCR ingestion, and DOCX export. Net-new work for external B2B launch includes payments, engagement letters, conflict-check UX, pricing in catalog, and (optionally) chat-enhanced intake—phased after the first paid matters validate unit economics.

**Positioning:** *AI can draft. We deliver lawyer-reviewed work product attorneys can actually use.*

---

## Platform Baseline (July 2026)

Before implementing strategic enhancements, align plans with what is already shipped. See [`CHECKPOINT.md`](CHECKPOINT.md) for the live inventory.

| Capability | Status |
|------------|--------|
| Assignment intake form + file upload | ✅ `/assignments/new` |
| PM Inbox Kanban (Submitted → Approved) | ✅ `AssignmentBoard` |
| Template / deliverable catalog | ✅ `web/src/lib/deliverable-catalog.ts` |
| Matter workbench (tabs, documents, export) | ✅ |
| Specialist agents + Strong Reader OCR | ✅ |
| Supabase auth + attorney portal shell | ✅ Partial (single verifying attorney model) |
| Chat-centric intake | ❌ Not built |
| In-app payments / deposits | ❌ Not built |
| Engagement letter + e-sign | ❌ Not built |
| Pricing surfaced in UI | ❌ Not built |

**Schema note:** Extracted document text is stored in **Documents** and **Notes** (facts packet), not a separate "Facts" table. PM Inbox assignment metadata lives in `options` JSON.

**Legal guardrails:** See [`LEGAL_BOUNDARIES.md`](LEGAL_BOUNDARIES.md). Harvey and Clio references are **UI inspiration only**—no implied integrations. Self-service AI tiers require bar-counsel review before launch.

**Implementation anchors:** `web/` (Next.js app), `CHECKPOINT.md`, `web/src/lib/deliverable-catalog.ts`, `docs/pivot/BUILD_SPEC-GAP-AUDIT.md`.

---

## Strategic Documents (Source of Truth)

| Document | Scope |
|----------|--------|
| [`AssociateOnDemand_B2B_Service_Analysis.md`](AssociateOnDemand_B2B_Service_Analysis.md) | B2B overflow model, onboarding workflow, platform capability mapping, immigration-first focus |
| [`AssociateOnDemand_UI_UX_Enhancement_Plan.md`](AssociateOnDemand_UI_UX_Enhancement_Plan.md) | Harvey-style chat UX, attorney portal, branding, implementation priorities for Cursor |
| [`AssociateOnDemand_Monetization_Strategy.md`](AssociateOnDemand_Monetization_Strategy.md) | Flat-fee pricing, margin targets, subscriptions (future), payments, GTM |
| [`AssociateOnDemand_Implementation_Phasing.md`](AssociateOnDemand_Implementation_Phasing.md) | Recommended defaults for 8 open decisions; Phase 0–3 rollout table; sign-off checklist |

Supporting context: [`AssociateOnDemand Project DNA: The Vision and Context.md`](AssociateOnDemand%20Project%20DNA%3A%20The%20Vision%20and%20Context.md)

---

## Recommended Phasing

1. **Phase 0 (now):** Manual sales and off-platform invoicing using existing assignment → inbox → export flow.
2. **Phase 1:** Pricing in catalog, intake autosave, client notifications—not a full chat rewrite.
3. **Phase 2:** Stripe deposits, engagement letters, conflict-check workflow once bar/ops model is locked.
4. **Phase 3:** Multi-attorney marketplace, retainers, chat-first intake (enhance or wrap the existing form; form remains source of truth until chat MVP is validated).

---

## Open Decisions

Recommended defaults and phasing impact for each item are in [`AssociateOnDemand_Implementation_Phasing.md`](AssociateOnDemand_Implementation_Phasing.md). **Provisional lock (July 5, 2026):** defaults applied for Phase 0 prep — see *Provisional Lock* section in that doc; override any item with explicit user sign-off. Resolve remaining **Blocked — needs user** items before building net-new monetization or intake UX:

1. First paying customer: external solo immigration attorneys vs. RMV/internal overflow only?
2. Launch SKU: immigration brief only, or also motion/hearing packet at day one?
3. Revenue collection for launch: off-platform invoicing acceptable for first 5–10 clients?
4. Supervising attorney model: RMV signs every deliverable initially, or contract associates in year one?
5. Jurisdiction and bar rules for marketing and disclaimers?
6. SLA commitments ("Usable by Tomorrow" vs. catalog turnaround + rush fee clock)?
7. $99/month self-service AI tier: still desired? Bar counsel approval required.
8. Intake UX: chat replaces form, wraps form (pre-fill), or form-first for v1?

---

## References

- Minnesota Rules of Professional Conduct, [Rule 5.4](https://www.revisor.mn.gov/court_rules/pr/subtype/cond/id/5.4/) (fee sharing)
- Ohio Revised Code, [Section 4705.07](https://codes.ohio.gov/ohio-revised-code/section-4705.07)
- Platform pricing and service definitions: see B2B Service Analysis and Monetization Strategy documents above
