# Overflow counsel user journey (Phase 0)

**Audience:** External solo/small-firm attorneys submitting overflow work to Recover My Value (RMV).  
**Verifier:** RMV (La'Dajia) signs every deliverable in Phase 0 — not a self-serve AI product.

## End-to-end flow (5 steps)

1. **Set up Firm Memory** — [`/templates#firm-memory`](https://aod-next.vercel.app/templates#firm-memory)  
   Upload your blank assessment template, 1–2 sample briefs in your firm's style, and save tone/citation/header preferences. This teaches the platform your voice before the first assignment.

2. **Submit an assignment** — [`/assignments/new`](https://aod-next.vercel.app/assignments/new)  
   Pick a deliverable (hero SKU: **AOS Discretionary Brief**), link or create a matter, answer deliverable-specific fact questions, optionally attach documents and a sample for the 20% discount. Acknowledge the limited-scope disclaimer. **No in-app payment** — you receive a quoted flat fee and invoice after delivery.

3. **Upload case assessment on the matter** — Matter → **Documents** tab  
   Upload the completed case assessment scan (PDF/photo). OCR extracts fields that feed agent drafts. Optional: collapse **Or fill quick facts below** for structured facts without a scan.

4. **RMV produces & you review** — Matter workbench + [`/inbox`](https://aod-next.vercel.app/inbox)  
   PM orchestrator dispatches specialist agents. When ready, the assignment moves to **Ready for review**. Approve the deliverable or request revision with notes — inline on the matter page or on the inbox board.

5. **Export & invoice** — Matter Notes / export  
   Attorney edits agent output if needed (Save to Firm Memory refines future drafts). Export DOCX/citation package. RMV invoices off-platform (ACH, check, or manual payment link). In-app Stripe/checkout is **Phase 2**.

## Who does what

| Role | Responsibility |
|------|----------------|
| **External firm** | Firm Memory setup, facts, assessment upload, review/approve deliverable, client filing responsibility |
| **RMV** | Verify every deliverable, conflict check (manual Phase 0), quality gate, invoice |
| **Platform agents** | Draft/research from facts + assessment OCR + Firm Memory — attorney always signs off |

## Key URLs

| Step | URL |
|------|-----|
| Firm Memory setup | `/templates#firm-memory` |
| Firm assessment templates | `/templates#firm-assessment-templates` |
| New assignment | `/assignments/new?deliverable=aos-discretionary-brief` |
| PM Inbox | `/inbox` |
| Settings (billing honesty) | `/settings` |

## AOS discretionary brief — correct intake fields

When `deliverable=aos-discretionary-brief`, intake asks for **waiver/equities** facts, not asylum persecution narrative:

- Current immigration status  
- Relief requested (e.g. AOS + I-601A waiver)  
- Qualifying relative and relationship  
- Extreme hardship factors to qualifying relative  
- Grounds of inadmissibility (INA §212(a))  
- Negative discretionary factors  
- Positive discretionary factors  
- Prior immigration history relevant to waiver context  

Asylum-specific fields (protected ground, persecution narrative, country conditions for nexus) belong on a future **asylum brief** SKU or generic immigration matters — not on the AOS discretionary brief intake.

## Billing (Phase 0 honesty)

- Catalog and intake show: **Quoted flat fee — invoice after delivery**  
- No Stripe plugin, checkout route, or in-app payment collection  
- Phase 2: Stripe deposits + automated invoicing (after bar/ops sign-off)

## Related runbooks

- [phase0-b2b-overflow-launch.md](./phase0-b2b-overflow-launch.md) — pilot ops checklist  
- [CHECKPOINT.md](../../CHECKPOINT.md) — current build status
