# Legal & integration boundaries (AssociateOnDemand)

AssociateOnDemand learns **UX patterns** from commercial legal products but does **not** claim partnership, endorsement, or interoperability unless explicitly documented.

## Third-party products

- **Harvey / Wordsmith AI (and similar)**  
  - **No integration:** no API connections, no credential exchange, no data export into those services as part of this build unless separately authorized.  
  - **UI reference only:** the in-app **Associate Command Panel** mimics commonly used chat placement; it is AOD-native.

- **Clio**  
  - **No stub, no connector** until there is both a paying Clio subscription and a scoped business need.  
  - Future work must use the **official Clio REST API** only.

- **Needles / eImmigration (Cerenade) / USCIS portals**  
  - **Prefer exports & official APIs.** Default path for eImmigration is **tiered CSV/JSON import**.  
  - **Observe-and-learn sessions** may use authenticated browser tooling while *you* are logged in — no silent scraping behind your back.  
  - **Logged-in automation** is gated behind ToS/practice guidance and explicit configuration flags (`EIMMIGRATION_UI_AUTOMATION_ENABLED` — future).

## Associate Services Marketplace (Phase 3)

Guardrails for the contract-associate marketplace (Phase 3 target — **not** Phase 0–2). See [`docs/strategy/AssociateOnDemand_Implementation_Phasing.md`](docs/strategy/AssociateOnDemand_Implementation_Phasing.md) and the [marketplace strategic plan](AssociateOnDemand_%20Associate%20Services%20Marketplace%20Strategic%20Plan.md).

- **Service scope / UPL guardrail**  
  - AOD provides **substantive drafting and preparation of items FOR licensed attorneys**. It is **not the attorney of record**, **does not represent the requesting firm's clients**, and **does not appear in court**. The requesting/supervising attorney remains responsible to the end client. This scoping supports the UPL posture.

- **Fee mechanism (RESOLVED — La'Dajia, July 6, 2026)**  
  - **Flat platform fee + firm subscription tiers (LawClerk-style, 0% of the legal fee)** — **not** a percentage commission. Because the platform fee is **not a division of the client's legal fee**, this **substantially reduces the Rule 1.5(e) fee-division and Rule 7.2(b) referral concerns** (bar-counsel confirmation still recommended).

- **Fee-collecting entity**  
  - **Recover My Value, LLC (RMV)** — a lawyer-owned firm — collects all platform/subscription fees. Payments to freelance attorneys are **lawyer-to-lawyer**, not fee-sharing with a non-lawyer.

- **Cross-firm fee division (Rule 1.5(e))**  
  - *Largely mooted by the flat-fee choice* (the platform fee is not a share of the legal fee). Only re-opens if any residual share-of-legal-fee division is reintroduced; then any split must satisfy **RPC 1.5(e)**: proportional to services **or** joint responsibility; **client informed written consent** (including each lawyer's share); total fee reasonable. **Rule 7.2(b)** referral characterization is substantially de-risked by the flat fee — confirm with bar counsel it reads as payment for services, not referrals.

- **Verification before activation**  
  - **All participants** — freelance attorneys **and** requesting-firm attorneys — must be **bar-verified (good standing) + background-checked (Clear)** before they can post, match, or apply. Default-deny; annual re-verification. FCRA consent + adverse-action handling required for background checks.

- **IOLTA / escrow / trust-account holder (RESOLVED — RMV)**  
  - Any escrow/trust funds are held by **Recover My Value, LLC**, subject to **IOLTA / trust-accounting** rules (client funds cannot sit in an operating account). **Cleaner option:** with a flat platform fee, the platform may **avoid holding the legal fee entirely** — the firm pays the attorney directly and the platform bills its flat fee separately. This is the preferred structure and a **bar-counsel confirm** item.

- **Supervision / attorney-of-record (RESOLVED — La'Dajia)**  
  - **La'Dajia is the supervising attorney** for now — consistent with the Phase 0 lock (RMV/La'Dajia signs deliverables). **Still open / bar-counsel gated:** **malpractice coverage confirmation** and **final bar-counsel review** of the marketplace structure before build.

## Data handling summary

- **Tier 0 (default)** — descriptive / minimized handling until Presidio + LiteLLM pass regression tests (`AOD_PII_TIER=0`).  
- **Tier 1** — documents may traverse OCR/LLM stacks only **after anonymization succeeds** upstream.

See root `.env.example` for the authoritative environment flags.
