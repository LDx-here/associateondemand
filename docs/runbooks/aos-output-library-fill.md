# AOS brief output — library FILL + verbatim PRESERVE

**Pass 34 (2026-07-23):** Filing-quality AOS briefs without Anthropic by default.

## What changed

1. **PRESERVE** — Legal Standard, AOS mechanism, and Conclusion use Fix 1 verbatim prose (`Matter of Patel` / `Matter of Arai`). Firm DOCX labels fall back to canonical text.
2. **FILL** — Paragraph library (`aos_paragraph_library.json`) selects equity / adverse / balancing prose. No raw fact dump.
3. **Certificate of service** — Proper BOILERPLATE block (Fix 5).
4. **Optional API** — Set `AOD_AOS_USE_API=1` on Fly API to re-enable Claude FILL + thinking.

## Variant selection (integrated — pass 36)

The standalone `/tools/aos-brief-builder` HTML tool was removed. Argument-variant
selection now lives **inside the normal template + drafting flow** as native React:

- **API:** `GET /api/aos/library` normalizes `AOS_Paragraph_Library.json` into
  `{ caseThemes, equity, adverse, balancing, novelCombinationAlerts }`.
- **UI:** `AosVariantSelector` renders as step 4 ("Choose argument variants") of the
  AOS fact guide (`PracticeAreaFactGuide`) — recommended badges, novel-combination
  alerts, and live per-variant preview.
- **Surfacing:** `/templates` AOS card + preview show **"Draft with variants"** →
  `/assignments/new?deliverable=aos-discretionary-brief`.
- **Storage:** picks save to drafting facts under `fields.paragraphSelections`
  (`section_a`, `section_d_adverse`, `section_e_balancing` →
  `"<library_key>.<variant_id>"`), consumed unchanged by the backend generator.
- `/tools/aos-brief-builder` now permanently redirects to `/templates`.

## Retest draft AOS brief

1. `/templates` → AOS card → **Draft with variants** (or open a matter's fact guide).
2. Fill AOS architecture facts (theme, Section A/B, adverse, balancing), then pick
   variants under **Choose argument variants**. Save facts.
3. Dispatch drafting for `aos-discretionary-brief`.
4. Confirm DOCX / memo: Legal Standard cites Patel + Arai; Section A is library prose (not `[FILL with matter facts]`); certificate of service present.
5. Gaps metadata may still list missing fields; FILL quality no longer depends on Anthropic unless `AOD_AOS_USE_API=1`.
