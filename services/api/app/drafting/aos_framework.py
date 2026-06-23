"""AOS discretionary brief structure and legal propositions for drafting prompts."""

from __future__ import annotations

AOS_BRIEF_SECTIONS = """
Required AOS Discretionary Brief structure (PM-602-0199 / 1 USCIS-PM E.8):

I. Introduction and Purpose
   - Frame as I-485 discretionary memorandum; cite PM-602-0199 and 1 USCIS-PM E.8.

II. Legal Standard
   A. Statutory framework (INA §245(a); Patel v. Garland)
   B. Totality-of-the-circumstances / administrative grace (Matter of Patel, Marin, Arai)
   C. Why AOS rather than consular processing (changed circumstances, family unity, CP impracticality)

III. Statement of Statutory Eligibility
   - Inspection/admission; visa availability; admissibility/waiver status.

IV. Argument — Totality of the Circumstances
   A. Positive equities (family ties, hardship, residence, community, employment, GMC, rehabilitation)
   B. Adverse factors (address candidly; rebut with Marin/Mendez-Morales balancing)
   C. No overwhelmingly negative factors (PM-602-0188 anti-American/terrorism factors absent)

V. Conclusion
   - Request favorable exercise of discretion; preponderance standard.

Use bracketed placeholders [FACT NEEDED] for missing client facts.
Never invent citations — use only authorities from matter context or mark [CITE NEEDED].
"""

KEY_LEGAL_PROPOSITIONS = """
Citation-ready legal propositions (use verbatim in Legal Standard section where applicable):

1. INA §245(a): adjustment "may be adjusted ... in his discretion" when inspected/admitted,
   eligible for visa, admissible, and visa immediately available.

2. Matter of Patel: adjustment is "a matter of administrative grace" with burden on applicant.

3. 1 USCIS-PM E.8(A): meeting statutory requirements alone does not entitle applicant to benefit.

4. Matter of Marin: balance adverse factors against social/humane considerations; serious negatives
   require offsetting favorable evidence.

5. Matter of Arai: in absence of adverse factors, adjustment will ordinarily be granted.

6. Matter of Mendez-Morales: quality of family relationships determines weight of family-ties equity.

7. Matter of Edwards: reformation not absolute prerequisite; case-by-case analysis required.

8. PM-602-0199: AOS is extraordinary relief; explain why CP is not appropriate; totality standard.
"""

ELEMENT_FRAMEWORK_NOTE = """
Universal factor framework for each equity category:
Equity → Authority → Legal Principle → Elements → Facts → Evidence →
Government Argument → Rebuttal → Weight → Draft paragraph.
Organize Section IV arguments using this structure.
"""

CASE_THEME_PROMPT = """
Before drafting Section IV, state a one-sentence case theme (persuasive, not legal jargon).
Example: "A devoted caregiver whose continued presence is essential to her U.S. citizen family."
Thread the theme through the argument and conclusion.
"""

CITATION_VERIFICATION_RULES = """
After completing the brief:
- List every citation used in a "Sources Cited" subsection.
- Flag any citation you could not verify as VERIFICATION NEEDED.
- Do not fabricate quotes or page pinpoints.
- The system will auto-build a citation verification package for matched public sources.
"""

def aos_drafting_context() -> str:
    return "\n\n".join(
        [
            AOS_BRIEF_SECTIONS.strip(),
            KEY_LEGAL_PROPOSITIONS.strip(),
            ELEMENT_FRAMEWORK_NOTE.strip(),
            CASE_THEME_PROMPT.strip(),
            CITATION_VERIFICATION_RULES.strip(),
        ]
    )
