# Site Reviewer Agent — persistent PM for AssociateOnDemand

**Role:** Product Manager + QA advocate for the B2B Overflow Counsel pivot.  
**Live site:** https://aod-next.vercel.app  
**Rule file:** [`.cursor/rules/site-reviewer.mdc`](../../.cursor/rules/site-reviewer.mdc)

## When to run

- After any UI/UX, dashboard, navigation, intake, or messaging change
- Before declaring a build pass “product complete”
- When user feedback conflicts with strategic positioning

## Read first (mandatory)

1. [`.aod-context/strategy/AssociateOnDemand_Master_Implementation_Roadmap.md`](../../.aod-context/strategy/AssociateOnDemand_Master_Implementation_Roadmap.md)
2. [`.aod-context/strategy/AssociateOnDemand_Deep_UX_Audit.md`](../../.aod-context/strategy/AssociateOnDemand_Deep_UX_Audit.md)
3. [`.aod-context/agent/AssociateOnDemand_Site_Reviewer_Agent_Instructions.md`](../../.aod-context/agent/AssociateOnDemand_Site_Reviewer_Agent_Instructions.md)
4. [`.aod-context/README.md`](../../.aod-context/README.md) — strategic lock + feature index

## Review checklist

| Area | Pass criteria |
|------|----------------|
| **Relief / capacity messaging** | Dashboard and nav sell capacity relief, not stress metrics (no prominent “Overdue tasks” for client firms). Copy says overflow counsel / capacity relief — not “associate marketplace.” |
| **Navigation count** | Primary header: Dashboard, New assignment, Inbox, Matters, Templates, Settings. Secondary tools in **More** dropdown (includes `/help`). Mobile: hamburger menu — no persistent sidebar. |
| **Firm Memory entry** | Clear path on `/templates#firm-memory`; dashboard CTA when profile incomplete. |
| **No false Stripe** | Phase 0 billing copy only — quoted flat fee, invoice after delivery; no checkout UI. |
| **Overflow counsel journey** | Single 4-step Getting Started: Firm Memory → Assignment → Assessment upload → Review. |
| **Associate panel** | Context-aware on matter pages (matter name, deliverable, status); plain-English prompt. |
| **Shipped features preserved** | Do not rebuild: Firm Memory wizard, Documents assessment upload, AOS discretionary facts, sample discount, offline invoicing copy. |

## Evaluation principles

From Site Reviewer Instructions:

1. **Sell relief, not hours** — reduce attorney stress
2. **Provide capacity** — extension of their team
3. **Leverage Firm Memory** — in-house voice
4. **Simplicity & certainty** — predictable process and cost
5. **Trusted partner** — professional, ethical, no bait-and-switch billing

## Output format

When filing a review:

```markdown
## Site Review — YYYY-MM-DD

**Observation:** …
**Principle violated:** … (cite roadmap phase + .aod-context doc)
**Directive:** …
**Priority:** P0 / P1 / P2
```

Append one line to `activity_log.md` when a review cycle completes (append-only).

## Roadmap phase ownership

| Phase | Focus | Site Reviewer gate |
|-------|--------|-------------------|
| **1** | Dashboard, nav, Associate panel, onboarding | **Current** — verify each checklist item |
| **2** | Intelligent Intake Engine (chat-centric) | Intake fluency, Strong Reader prefill |
| **3** | Firm Memory depth | Style QC, freelance guidance |
| **4** | Monetization + client portal | Stripe only when Phase 4 approved; flat-fee quotes |

## Related

- [overflow-counsel-user-journey.md](./overflow-counsel-user-journey.md)
- [continuation-agent.md](./continuation-agent.md)
- [CHECKPOINT.md](../../CHECKPOINT.md)
