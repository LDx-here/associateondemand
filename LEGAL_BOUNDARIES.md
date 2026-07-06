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

- **Fee-collecting entity**  
  - **Recover My Value, LLC (RMV)** — a lawyer-owned firm — collects all marketplace fees. Payments to freelance attorneys are **lawyer-to-lawyer**, not fee-sharing with a non-lawyer.

- **Cross-firm fee division (Rule 1.5(e))**  
  - Being lawyer-owned does **not** by itself cure fee division across firms. Any split must satisfy **RPC 1.5(e)**: proportional to services **or** joint responsibility; **client informed written consent** (including each lawyer's share); total fee reasonable. Watch **Rule 7.2(b)** referral characterization for percentage commissions.

- **Verification before activation**  
  - **All participants** — freelance attorneys **and** requesting-firm attorneys — must be **bar-verified (good standing) + background-checked (Clear)** before they can post, match, or apply. Default-deny; annual re-verification. FCRA consent + adverse-action handling required for background checks.

- **Escrow, trust accounting, and supervision**  
  - **Escrow / trust-accounting (IOLTA)** and the **supervision / attorney-of-record + malpractice** model must be **designed with bar counsel before build**. Client funds cannot sit in an operating account; the attorney of record and malpractice allocation must be explicit.

## Data handling summary

- **Tier 0 (default)** — descriptive / minimized handling until Presidio + LiteLLM pass regression tests (`AOD_PII_TIER=0`).  
- **Tier 1** — documents may traverse OCR/LLM stacks only **after anonymization succeeds** upstream.

See root `.env.example` for the authoritative environment flags.
