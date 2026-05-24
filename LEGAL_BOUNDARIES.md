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

## Data handling summary

- **Tier 0 (default)** — descriptive / minimized handling until Presidio + LiteLLM pass regression tests (`AOD_PII_TIER=0`).  
- **Tier 1** — documents may traverse OCR/LLM stacks only **after anonymization succeeds** upstream.

See root `.env.example` for the authoritative environment flags.
