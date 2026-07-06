# AssociateOnDemand strategy docs (July 2026)

Canonical strategy for the **B2B Overflow Counsel** pivot lives in **[`.aod-context/`](../.aod-context/README.md)**. This folder retains the July 2025 strategic lock and phasing index.

Code inventory: [`CHECKPOINT.md`](../../CHECKPOINT.md) · legal guardrails: [`LEGAL_BOUNDARIES.md`](../../LEGAL_BOUNDARIES.md)

## B2B Overflow Counsel pivot (2026-07-06)

New strategic documents are integrated under `.aod-context/`:

- **Strategy:** B2B law firm strategy, shift analysis, branding
- **Features:** Firm Memory, Workflow Fluency, Production Cost Pricing
- **Technical:** Practice Fact Mapping, Airtable/workflow refs

See [`.aod-context/README.md`](../.aod-context/README.md) for the full index.

## Strategic lock (2026-07-05)

| # | Decision |
|---|----------|
| 1 | **Pilot clients:** External attorneys/firms may submit; **La'Dajia/RMV is the only verifying attorney** until scaled. |
| 2 | **Year-one model:** **RMV-verified deliverables only** — not LawClerk-style associate marketplace until **Phase 3+**. Associate Services docs are subordinate / future. |
| 3 | **Jurisdiction/disclaimers:** **Assignment-state and practice-area dependent** — client attorney is NOT the filing attorney; disclaimers reflect limited-scope overflow + RMV review (not MN-only lock). |
| 4 | **$99/mo self-serve AI tier:** **On roadmap** pending bar counsel — do **not** ship self-serve without counsel approval. |
| 5 | **Day-one SKUs:** **`aos-discretionary-brief`**, **`custom-motion`**, **`hearing-packet`** (+ **`research-memo`** upsell). Catalog: [`web/src/lib/deliverable-catalog.ts`](../../web/src/lib/deliverable-catalog.ts). |

## Index

| Document | Purpose |
|----------|---------|
| [AssociateOnDemand_Strategic_Business_Platform_Plan.md](./AssociateOnDemand_Strategic_Business_Platform_Plan.md) | North star, open decisions index |
| [AssociateOnDemand_Implementation_Phasing.md](./AssociateOnDemand_Implementation_Phasing.md) | **Locked phasing** — Phase 0–3 timeline |
| [AssociateOnDemand_Monetization_Strategy.md](./AssociateOnDemand_Monetization_Strategy.md) | Flat-fee SKUs, margins, future MRR |
| [AssociateOnDemand_B2B_Service_Analysis.md](./AssociateOnDemand_B2B_Service_Analysis.md) | B2B overflow market analysis |
| [AssociateOnDemand_UI_UX_Enhancement_Plan.md](./AssociateOnDemand_UI_UX_Enhancement_Plan.md) | Intake, catalog, inbox UX |
| [AssociateOnDemand_Associate_Services_Workflow.md](./AssociateOnDemand_Associate_Services_Workflow.md) | **Phase 3+** — contract associate marketplace (not year one) |
| [AssociateOnDemand_Associate_Services_Monetization_Strategy.md](./AssociateOnDemand_Associate_Services_Monetization_Strategy.md) | **Phase 3+** — marketplace monetization |
| [AssociateOnDemand_Associate_Services_Airtable_Schema.md](./AssociateOnDemand_Associate_Services_Airtable_Schema.md) | **Phase 3+** — contractor schema sketch |

## Ops runbooks

- [Phase 0 B2B overflow launch](../runbooks/phase0-b2b-overflow-launch.md)
- [Auth email setup](../runbooks/auth-email-setup.md)

## Superseded duplicates

Space-prefixed or duplicate exports live under [`docs/archive/strategy-duplicates/`](../archive/strategy-duplicates/) with a superseded banner — do not edit those copies; update files in this folder instead.
