"""Pre-verified immigration sources for AOS discretionary briefs (public URLs + excerpts)."""

from __future__ import annotations

from typing import Any

# Curated from Kingdom Counsel citation package — public DOJ/USCIS sources only.
VERIFIED_AOS_SOURCES: list[dict[str, Any]] = [
    {
        "match": ["matter of arai", "13 i&n dec. 494", "13 i&n dec 494"],
        "filename": "REF_01_Matter_of_Arai_13_IN_Dec_494.pdf",
        "title": "Matter of Arai",
        "citation": "13 I&N Dec. 494, 496 (BIA 1970)",
        "url": "https://www.justice.gov/sites/default/files/eoir/legacy/2012/08/27/2027.pdf",
        "proposition": (
            "In the absence of adverse factors, adjustment will ordinarily be granted, "
            "still as a matter of discretion."
        ),
        "highlight_phrases": ["In the absence of adverse factors, adjustment will ordinarily be granted"],
        "excerpt_parts": [
            {"highlight": False, "text": "Section 245 reposes discretionary power to grant adjustment of status."},
            {
                "highlight": True,
                "text": "In the absence of adverse factors, adjustment will ordinarily be granted, "
                "still as a matter of discretion.",
            },
        ],
    },
    {
        "match": ["matter of marin", "16 i&n dec. 581", "16 i&n dec 581"],
        "filename": "REF_02_Matter_of_Marin_16_IN_Dec_581.pdf",
        "title": "Matter of Marin",
        "citation": "16 I&N Dec. 581, 584-85 (BIA 1978)",
        "url": "https://www.justice.gov/sites/default/files/eoir/legacy/2012/08/17/2666.pdf",
        "proposition": (
            "Adverse factors must be balanced against social and humane considerations; "
            "serious negative factors require offsetting favorable evidence."
        ),
        "highlight_phrases": [
            "balance the adverse factors evidencing an alien",
            "as the negative factors grow more serious",
        ],
        "excerpt_parts": [
            {
                "highlight": True,
                "text": "The immigration judge must balance the adverse factors evidencing an alien's "
                "undesirability as a permanent resident with the social and humane considerations "
                "presented in his behalf.",
            },
            {
                "highlight": True,
                "text": "As the negative factors grow more serious, it becomes incumbent upon the applicant "
                "to introduce additional offsetting favorable evidence.",
            },
        ],
    },
    {
        "match": ["matter of patel", "17 i&n dec. 597", "17 i&n dec 597"],
        "filename": "REF_03_Matter_of_Patel_17_IN_Dec_597.pdf",
        "title": "Matter of Patel",
        "citation": "17 I&N Dec. 597 (BIA 1980)",
        "url": "https://www.justice.gov/sites/default/files/eoir/legacy/2012/08/17/2842.pdf",
        "proposition": (
            "Adjustment is a matter of administrative grace; the applicant bears the burden "
            "of showing discretion should be exercised in his or her favor."
        ),
        "highlight_phrases": ["matter of administrative grace", "burden of showing that discretion"],
        "excerpt_parts": [
            {
                "highlight": True,
                "text": "The grant of an application for adjustment of status under section 245 is a matter "
                "of administrative grace. An applicant has the burden of showing that discretion "
                "should be exercised in his favor.",
            },
        ],
    },
    {
        "match": ["matter of edwards", "20 i&n dec. 191", "20 i&n dec 191"],
        "filename": "REF_04_Matter_of_Edwards_20_IN_Dec_191.pdf",
        "title": "Matter of Edwards",
        "citation": "20 I&N Dec. 191, 196 (BIA 1990)",
        "url": "https://www.justice.gov/sites/default/files/eoir/legacy/2012/08/14/3134.pdf",
        "proposition": (
            "Reformation is not an absolute prerequisite; criminal-history cases require "
            "case-by-case analysis with rehabilitation as a factor."
        ),
        "highlight_phrases": ["clear showing of reformation is not an absolute prerequisite", "case-by-case basis"],
        "excerpt_parts": [
            {
                "highlight": True,
                "text": "Section 212(c) applications involving convicted aliens must be evaluated on a "
                "case-by-case basis, with rehabilitation a factor to be considered in the exercise of discretion.",
            },
        ],
    },
    {
        "match": ["matter of mendez", "21 i&n dec. 296", "21 i&n dec 296"],
        "filename": "REF_05_Matter_of_Mendez_Morales_21_IN_Dec_296.pdf",
        "title": "Matter of Mendez-Morales",
        "citation": "21 I&N Dec. 296, 301 (BIA 1996)",
        "url": "https://www.justice.gov/sites/default/files/eoir/legacy/2014/07/25/3272.pdf",
        "proposition": "The quality of family relationships must be considered in weighing the family-ties equity.",
        "highlight_phrases": ["quality of their relationship must be considered"],
        "excerpt_parts": [
            {
                "highlight": True,
                "text": "If the alien has relatives in the United States, the quality of their relationship "
                "must be considered in determining the weight to be awarded this equity.",
            },
        ],
    },
    {
        "match": ["uscis-pm e.8", "1 uscis-pm e.8", "policy manual e.8", "volume 1, part e, chapter 8"],
        "filename": "REF_06_USCIS_Policy_Manual_E8_Discretion.pdf",
        "title": "1 USCIS-PM E.8 — Discretionary Analysis",
        "citation": "USCIS Policy Manual, Volume 1, Part E, Chapter 8",
        "url": "https://www.uscis.gov/policy-manual/volume-1-part-e-chapter-8",
        "proposition": (
            "Meeting statutory requirements alone does not entitle the applicant to the benefit; "
            "discretion is administrative grace with burden on the applicant."
        ),
        "highlight_phrases": [
            "meeting the statutory and regulatory requirements alone does not entitle",
            "matter of administrative grace where the applicant has the burden",
        ],
        "excerpt_parts": [
            {
                "highlight": True,
                "text": "Where an immigration benefit is discretionary, meeting the statutory and regulatory "
                "requirements alone does not entitle the requestor to the benefit sought.",
            },
        ],
    },
    {
        "match": ["pm-602-0199", "602-0199", "adjustment of status and discretion"],
        "filename": "REF_07_PM_602_0199_VERIFICATION_NEEDED.pdf",
        "title": "USCIS Policy Memorandum PM-602-0199",
        "citation": "Adjustment of Status and Discretion (May 21, 2026)",
        "url": "https://www.uscis.gov/sites/default/files/document/memos/PM-602-0199-AdjustmentOfStatusAndDiscretion-20260521.pdf",
        "proposition": "May 2026 policy on heightened discretionary scrutiny in AOS applications.",
        "verified": False,
        "instructions": [
            "Navigate to the URL above and download the PDF.",
            "Attach the PDF to the case file alongside this package.",
            "Locate passages on discretionary review and AOS vs. consular processing.",
        ],
    },
]
