# AssociateOnDemand — strategic context index

**North star (July 2026):** B2B Overflow Counsel — verified associate-quality deliverables for solo/small firm attorneys who need capacity relief, not raw AI output.

Read this index before architecture or product changes. Constitution + `LEGAL_BOUNDARIES.md` still govern integrations.

## Strategic lock

| # | Decision |
|---|----------|
| 1 | External attorneys/firms submit; **RMV only verifier** (Phase 0–2) |
| 2 | Year-one: **RMV-verified deliverables** — associate marketplace Phase 3+ |
| 3 | Jurisdiction-aware disclaimers on intake |
| 4 | $99/mo self-serve AI: roadmap only — bar counsel gate |
| 5 | Day-one SKUs: `aos-discretionary-brief`, `custom-motion`, `hearing-packet`, `research-memo` |

Full lock: [`docs/strategy/README.md`](../docs/strategy/README.md) · live status: [`CHECKPOINT.md`](../CHECKPOINT.md)

## Directory map

### `strategy/` — why and what

| Document | Purpose |
|----------|---------|
| [AssociateOnDemand_B2B_Law_Firm_Strategy.md](./strategy/AssociateOnDemand_B2B_Law_Firm_Strategy.md) | B2B overflow counsel positioning |
| [B2B_Law_Firm_Strategic_Shift_Analysis.md](./strategy/B2B_Law_Firm_Strategic_Shift_Analysis.md) | Pivot rationale and market fit |
| [AssociateOnDemand_Branding_Positioning_Strategy.md](./strategy/AssociateOnDemand_Branding_Positioning_Strategy.md) | Brand voice and positioning |
| [AssociateOnDemand_Master_Implementation_Roadmap.md](./strategy/AssociateOnDemand_Master_Implementation_Roadmap.md) | **Master build roadmap** — Phase 1–4 directives for Cursor |
| [AssociateOnDemand_Deep_UX_Audit.md](./strategy/AssociateOnDemand_Deep_UX_Audit.md) | Deep UX audit — relief gap, nav overload, onboarding |

### `features/` — how (product design)

| Document | Purpose |
|----------|---------|
| [AssociateOnDemand_Firm_Memory_Design.md](./features/AssociateOnDemand_Firm_Memory_Design.md) | Firm style memory — v1 shipped via Strategy Patterns |
| [AssociateOnDemand_Workflow_Fluency_Design.md](./features/AssociateOnDemand_Workflow_Fluency_Design.md) | Intelligent Intake Engine design |
| [AssociateOnDemand_Production_Cost_Pricing.md](./features/AssociateOnDemand_Production_Cost_Pricing.md) | Flat fee + sample discount model |

### `technical/` — implementation specs

| Document | Purpose |
|----------|---------|
| [AssociateOnDemand_Practice_Fact_Mapping.md](./technical/AssociateOnDemand_Practice_Fact_Mapping.md) | Deliverable-aware fact schemas |
| [Airtable schema (live)](../docs/strategy/AssociateOnDemand_Associate_Services_Airtable_Schema.md) | Phase 3+ contractor schema sketch |
| [Associate workflow](../docs/strategy/AssociateOnDemand_Associate_Services_Workflow.md) | Phase 3+ marketplace workflow |

### `agent/` — AI partner rules

| Document | Purpose |
|----------|---------|
| [AssociateOnDemand_Context_Integration_Guide.md](./agent/AssociateOnDemand_Context_Integration_Guide.md) | How this directory was set up |
| [AssociateOnDemand_Site_Reviewer_Agent_Instructions.md](./agent/AssociateOnDemand_Site_Reviewer_Agent_Instructions.md) | **Site Reviewer Agent** — persistent PM/QA for UX vs roadmap |
| [Agent_Rules_of_Engagement.md](./agent/Agent_Rules_of_Engagement.md) | Agent engagement rules |
| [CHECKPOINT.md](../CHECKPOINT.md) | Current build status and next step |
| [LEGAL_BOUNDARIES.md](../LEGAL_BOUNDARIES.md) | Integration guardrails |
| [Site Reviewer runbook](../docs/runbooks/site-reviewer-agent.md) | Checklist + review protocol (`.cursor/rules/site-reviewer.mdc`) |
| [Continuation agent runbook](../docs/runbooks/continuation-agent.md) | Autonomous build protocol |

## Pending external docs

| Document | Status |
|----------|--------|
| `AssociateOnDemand_Deep_UX_Audit.md` | [`strategy/AssociateOnDemand_Deep_UX_Audit.md`](./strategy/AssociateOnDemand_Deep_UX_Audit.md) — UX audit themes (July 2026) |

## Code touchpoints (strategy → implementation)

| Strategy feature | Code location |
|------------------|---------------|
| Intelligent Intake v2 | `web/src/lib/practice-area-facts.ts`, `PracticeAreaFactGuide.tsx` |
| Firm Memory v1 | `POST /api/firm-memory`, Strategy Patterns (`category: firm_memory`), `/templates#firm-memory` |
| Sample discount | `deliverable-catalog.ts`, `AssignmentIntakeForm.tsx`, assignment `options` JSON |
| Deliverable catalog | `web/src/lib/deliverable-catalog.ts`, `/templates` |
| Phase 1 UX (roadmap) | `SidebarNav.tsx`, `dashboard/page.tsx`, `CommandPanel.tsx`, `GettingStartedBanner.tsx` |
