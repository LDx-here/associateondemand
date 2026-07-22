# PROPOSAL — legal-element-templates.ts & knowledge loader

Curated immigration `.md` files added 2026-07-21. Suggested product wiring (partially implemented where mappings were clear).

## Implemented in `web/src/lib/legal-element-templates.ts`

- Extended `IMMIGRATION_CORE` / asylum-related templates with `referenceSlug` values that align to Firm Memory refs **and** map conceptually to these brain files:
  - `immigration-discretion` → `aos-discretionary-checklist.md`
  - `immigration-statutory-eligibility` → `aos-statutory-eligibility.md`
  - `immigration-extreme-hardship` → `extreme-hardship-factors.md`
  - `immigration-admissibility` → `inadmissibility-overview.md` + `ina-212a-waiver.md`
  - `immigration-procedure` → `procedural-posture-removal.md`
  - Asylum slugs → `asylum-elements.md` / `asylum-bars.md` / `withholding-cat.md`

## Proposed follow-ups (not all coded)

1. **Topic-aware excerpt loader** — `firm_context.load_firm_knowledge_excerpts` currently takes the first 8 `.md` files alphabetically. Prefer selecting by matter practice area / legal-element ids (e.g., waiver matter → hardship + 212 waiver + UL presence).
2. **Add templates** for high-frequency RMV work:
   - `unlawful-presence` → `unlawful-presence-bars.md`
   - `false-claim-usc` → `false-claim-usc.md`
   - `cancellation` → `cancellation-of-removal.md`
   - `marriage-bona-fides` → `marriage-based-aos.md`
   - `affidavit-of-support` → `affidavit-of-support.md`
   - `vawa-u-t` → `vawa-u-t-overview.md`
3. **Firm ops** live in `brain/03_Firm_Knowledge/firm_ops/` — optional separate loader for ops agents; do not merge into immigration excerpt budget.
4. **Fly redeploy** required for production API to ship new brain files in the Docker image.
