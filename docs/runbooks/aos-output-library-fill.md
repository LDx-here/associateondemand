# AOS brief output — library FILL + verbatim PRESERVE

**Pass 34 (2026-07-23):** Filing-quality AOS briefs without Anthropic by default.

## What changed

1. **PRESERVE** — Legal Standard, AOS mechanism, and Conclusion use Fix 1 verbatim prose (`Matter of Patel` / `Matter of Arai`). Firm DOCX labels fall back to canonical text.
2. **FILL** — Paragraph library (`aos_paragraph_library.json`) selects equity / adverse / balancing prose. No raw fact dump.
3. **Certificate of service** — Proper BOILERPLATE block (Fix 5).
4. **Optional API** — Set `AOD_AOS_USE_API=1` on Fly API to re-enable Claude FILL + thinking.

## Selection menu

- URL (auth): https://aod-next.vercel.app/tools/aos-brief-builder
- With matter: `/tools/aos-brief-builder?matterId=AOD-XXXX`
- Workflow: pick variants in the menu → **Export** (saves browser localStorage) → **Save to matter** → dispatch `aos-discretionary-brief`.

## Retest draft AOS brief

1. Fill AOS architecture facts on a matter (theme, Section A/B, adverse, balancing).
2. Optional: open selection menu, choose variants, save to matter.
3. Dispatch drafting for `aos-discretionary-brief`.
4. Confirm DOCX / memo: Legal Standard cites Patel + Arai; Section A is library prose (not `[FILL with matter facts]`); certificate of service present.
5. Gaps metadata may still list missing fields; FILL quality no longer depends on Anthropic unless `AOD_AOS_USE_API=1`.
