/**
 * Jurisdiction-aware intake disclaimer copy (Phase 0 B2B overflow).
 * Conservative language — no legal advice claims. See LEGAL_BOUNDARIES.md.
 */

export type IntakeDisclaimerContext = {
  /** Case type from intake form, e.g. "Immigration - Asylum". */
  caseType?: string;
  /** Optional country field from new-matter intake. */
  country?: string;
  /** When linking to an existing matter, use its case type if known. */
  existingCaseType?: string;
};

function practiceAreaLabel(ctx: IntakeDisclaimerContext): string {
  const raw = ctx.caseType?.trim() || ctx.existingCaseType?.trim();
  if (!raw) return "the practice area and jurisdiction you describe in this assignment";
  return raw;
}

/** Full disclaimer body shown before submit acknowledgment. */
export function buildIntakeDisclaimerBody(ctx: IntakeDisclaimerContext): string {
  const practice = practiceAreaLabel(ctx);
  const countryNote = ctx.country?.trim()
    ? ` Matter context includes country: ${ctx.country.trim()}.`
    : "";

  return [
    "AssociateOnDemand provides limited-scope legal overflow support for licensed attorneys.",
    "La'Dajia Williams (Recover My Value, LLC) verifies deliverables produced through this platform in Phase 0–2.",
    "You remain the attorney of record for your client and for any filing, court appearance, or advice to your client.",
    "AssociateOnDemand does not establish an attorney–client relationship with your client and does not provide legal advice to non-attorney end clients.",
    `Scope, applicable rules, and filing responsibility depend on ${practice} and the governing jurisdiction for the matter — not on a single default state.${countryNote}`,
    "Deliverables are drafts or work product for your independent review, revision, and sign-off before use.",
    "AI-assisted drafting may be used under attorney supervision; you are responsible for final work product.",
  ].join(" ");
}

/** Checkbox label (shorter). */
export function intakeDisclaimerCheckboxLabel(ctx: IntakeDisclaimerContext): string {
  const practice = practiceAreaLabel(ctx);
  return `I am a licensed attorney (or authorized firm staff submitting on an attorney's behalf). I understand RMV verifies the deliverable, I retain filing and client responsibility, and scope varies by ${practice} and governing jurisdiction. I will independently review all work product before use.`;
}
