# -*- coding: utf-8 -*-
import os
from pathlib import Path

import openpyxl
from openpyxl import load_workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.formatting.rule import CellIsRule

SRC = Path(
    os.environ.get(
        "AOD_ASSESSMENT_XLSX",
        Path(__file__).resolve().parents[2] / "data" / "templates" / "AOS_Discretionary_Factors_Case_Assessment_Tool.xlsx",
    )
)

wb = load_workbook(SRC)

# Rename existing sheets (handle both pre- and post-rename states)
for old_name, new_name in [("AOS Discretion Assessment", "1. Case Intake"),
                             ("Legal Framework Reference", "3. Legal Framework Reference")]:
    if old_name in wb.sheetnames:
        wb[old_name].title = new_name

# Remove existing Brief Development Matrix if present (full rebuild)
if "2. Brief Development Matrix" in wb.sheetnames:
    del wb["2. Brief Development Matrix"]

ws = wb.create_sheet("2. Brief Development Matrix", index=1)

# ---- Styles ----
TITLE_FONT  = Font(name="Arial", size=14, bold=True, color="FFFFFF")
SUBTITLE_FONT = Font(name="Arial", size=10, italic=True, color="404040")
HEADER_FONT = Font(name="Arial", size=10, bold=True, color="FFFFFF")
SECTION_FONT = Font(name="Arial", size=11, bold=True, color="FFFFFF")
POS_SECTION_FILL  = PatternFill("solid", start_color="2E7D32")
ADV_SECTION_FILL  = PatternFill("solid", start_color="C0392B")
THRESH_SECTION_FILL = PatternFill("solid", start_color="2E5395")
TITLE_FILL   = PatternFill("solid", start_color="1F3864")
HEADER_FILL  = PatternFill("solid", start_color="4472C4")
SUMMARY_FILL = PatternFill("solid", start_color="FFF2CC")
NOTE_FONT    = Font(name="Arial", size=9, italic=True, color="595959")
QUESTION_FONT = Font(name="Arial", size=10)
BOLD = Font(name="Arial", size=10, bold=True)
PROP_FONT = Font(name="Arial", size=10, italic=True, color="1F3864")

POS_FILL = PatternFill("solid", start_color="C6E0B4")
NEG_FILL = PatternFill("solid", start_color="F8CBAD")
NEU_FILL = PatternFill("solid", start_color="F2F2F2")

THIN   = Side(border_style="thin", color="BFBFBF")
BORDER = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)
WRAP   = Alignment(wrap_text=True, vertical="top")
WRAP_CENTER = Alignment(wrap_text=True, vertical="center", horizontal="center")

# ---- Column layout (10 columns A-J) ----
# A: Category | B: Factor/Issue | C: Authority | D: Legal Proposition (NEW)
# E: Equity Proven / Gov't Arg | F: Case Facts | G: Evidence | H: Weight
# I: Counterargument / Rebuttal | J: Draft Brief Paragraph
widths = {"A": 24, "B": 28, "C": 24, "D": 38,
          "E": 30, "F": 26, "G": 22, "H": 13, "I": 34, "J": 60}
for col, w in widths.items():
    ws.column_dimensions[col].width = w

row = 1

ws.merge_cells(f"A{row}:J{row}")
c = ws.cell(row=row, column=1, value="AOS DISCRETIONARY FACTORS — BRIEF DEVELOPMENT MATRIX")
c.font = TITLE_FONT; c.fill = TITLE_FILL
c.alignment = Alignment(horizontal="left", vertical="center")
ws.row_dimensions[row].height = 22
row += 1

ws.merge_cells(f"A{row}:J{row}")
c = ws.cell(row=row, column=1,
    value=("Layer 2 of the assessment tool. Use AFTER completing the '1. Case Intake' tab. Column D (Legal Proposition) "
           "feeds the brief's Legal Standard section verbatim — cite it, don't paraphrase it. Column J (Draft) feeds the "
           "Analysis section. Set Weight in column H to generate the Balancing Dashboard and to control what appears in "
           "the generated brief."))
c.font = SUBTITLE_FONT; c.alignment = WRAP
ws.row_dimensions[row].height = 46
row += 1
row += 1

# ---- CASE THEME BLOCK ----
ws.merge_cells(f"A{row}:J{row}")
c = ws.cell(row=row, column=1, value="CASE THEME (set this FIRST — it drives how every factor below is framed)")
c.font = SECTION_FONT; c.fill = THRESH_SECTION_FILL
ws.row_dimensions[row].height = 20
row += 1

ws.cell(row=row, column=1, value="One-sentence theme:").font = BOLD
ws.cell(row=row, column=1).fill = SUMMARY_FILL
ws.merge_cells(f"B{row}:J{row}")
ws.cell(row=row, column=2).fill = SUMMARY_FILL
ws.cell(row=row, column=2).alignment = WRAP
ws.row_dimensions[row].height = 30
row += 1

ws.cell(row=row, column=1, value="Theme examples:").font = NOTE_FONT
ws.cell(row=row, column=1).fill = SUMMARY_FILL
ws.merge_cells(f"B{row}:J{row}")
c = ws.cell(row=row, column=2,
    value=("• Longtime caregiving parent/spouse seeking family unity   • Productive, tax-paying resident with one "
           "forgivable lapse   • Lawful entrant whose circumstances changed after admission, now seeking the family-based "
           "benefit Congress contemplated   • Rehabilitated individual with deep community ties and no recent adverse conduct"))
c.font = NOTE_FONT; c.fill = SUMMARY_FILL; c.alignment = WRAP
ws.row_dimensions[row].height = 30
row += 1
row += 1

# ---- SUMMARY DASHBOARD ----
SUMMARY_START = row
ws.merge_cells(f"A{row}:J{row}")
c = ws.cell(row=row, column=1, value="BALANCING DASHBOARD")
c.font = SECTION_FONT; c.fill = THRESH_SECTION_FILL
ws.row_dimensions[row].height = 20
row += 1

dash_labels = [
    "Positive Equities — Strong:", "Positive Equities — Moderate:", "Positive Equities — Limited:",
    "Adverse Factors — Strong:",   "Adverse Factors — Moderate:",   "Adverse Factors — Limited:",
]
dash_cells = {}
for lab in dash_labels:
    ws.cell(row=row, column=1, value=lab).font = BOLD
    ws.cell(row=row, column=1).fill = SUMMARY_FILL
    ws.cell(row=row, column=2).fill = SUMMARY_FILL
    dash_cells[lab] = row
    row += 1
row += 1

ws.cell(row=row, column=1, value="Why positives outweigh negatives (narrative):").font = BOLD
ws.cell(row=row, column=1).fill = SUMMARY_FILL
ws.merge_cells(f"B{row}:J{row+2}")
ws.cell(row=row, column=2).fill = SUMMARY_FILL
ws.cell(row=row, column=2).alignment = WRAP
for rr in range(row, row+3): ws.row_dimensions[rr].height = 18
row += 3

ws.cell(row=row, column=1, value="Recommended discretion conclusion:").font = BOLD
ws.cell(row=row, column=1).fill = SUMMARY_FILL
ws.merge_cells(f"B{row}:J{row+1}")
ws.cell(row=row, column=2).fill = SUMMARY_FILL
ws.cell(row=row, column=2).alignment = WRAP
for rr in range(row, row+2): ws.row_dimensions[rr].height = 18
row += 2
row += 1

# ---- Column headers ----
HEADER_LABELS = [
    "Category", "Factor / Issue", "Authority", "Legal Proposition",
    "Equity Proven / Government's Core Argument",
    "Case Facts (from Tab 1 Intake)", "Evidence to Cite", "Weight",
    "Government Counterargument / Our Rebuttal", "Draft Brief Paragraph"
]
for i, label in enumerate(HEADER_LABELS, start=1):
    cell = ws.cell(row=row, column=i, value=label)
    cell.font  = HEADER_FONT
    cell.fill  = HEADER_FILL
    cell.alignment = WRAP_CENTER
    cell.border = BORDER
ws.row_dimensions[row].height = 34
HEADER_ROW = row
row += 1

DATA_START = row

# ===========================================================
# VERIFIED LEGAL PROPOSITIONS
# All quotes drawn from: INA §245(a) (8 U.S.C. §1255(a));
# 1 USCIS-PM E.8 (Discretionary Analysis) and its cited cases.
# ===========================================================

PROP_ELIGIBILITY = (
    'Under INA §245(a), "[t]he status of an alien who was inspected and admitted or paroled into '
    'the United States . . . may be adjusted by the Attorney General, in his discretion," to lawful '
    'permanent resident status, if the alien: (1) applies; (2) "is eligible to receive an immigrant '
    'visa and is admissible to the United States for permanent residence"; and (3) "an immigrant visa '
    'is immediately available . . . at the time his application is filed." INA §245(a).'
)

PROP_GRACE = (
    'Adjustment of status is "a matter of administrative grace where the applicant has the burden of '
    'showing that discretion should be exercised in his or her favor." Matter of Patel, 17 I&N Dec. 597 '
    '(BIA 1980). Even where statutory eligibility is established, "meeting the statutory and regulatory '
    'requirements alone does not entitle the requestor to the benefit sought." 1 USCIS-PM E.8(A).'
)

PROP_CONSULAR = (
    'Adjustment of status serves applicants who develop grounds for immigration benefits after lawful '
    'admission; good-faith development of family or employment ties after entry is a favorable circumstance '
    'in the discretionary analysis. INA §245(a); 1 USCIS-PM E.8.'
)

PROP_PRACTICAL = (
    'USCIS considers all "relevant, specific facts and circumstances in an individual case" in the '
    'discretionary analysis, with no exhaustive list of factors; the analysis "must be comprehensive, '
    'specific to the case, and based on all relevant facts known at the time of adjudication." '
    '1 USCIS-PM E.8(B)(1).'
)

PROP_IR = (
    'Congress established that immediate relatives of U.S. citizens are exempt from numerical limitations '
    'and "are not subject to the numerical limitations" of the INA\'s preference system, reflecting '
    'a Congressional priority for preserving family unity. INA §201(b)(2)(A)(i); 8 U.S.C. §1151(b)(2)(A)(i).'
)

PROP_FAMILY = (
    'Family ties in the United States — "the applicant or beneficiary\'s ties to family members in the '
    'United States and the closeness of the underlying relationships" — are a recognized favorable '
    'discretionary factor. 1 USCIS-PM E.8(C)(2); Matter of Arai, 13 I&N Dec. 494, 496 (BIA 1970) '
    '("In the absence of adverse factors, adjustment will ordinarily be granted, still as a matter of '
    'discretion.").'
)

PROP_FAMILY_QUALITY = (
    '"[T]he quality of their relationship must be considered in determining the weight to be awarded '
    'this equity." Matter of Mendez-Morales, 21 I&N Dec. 296, 302 (BIA 1996); 1 USCIS-PM E.8(C)(2).'
)

PROP_HARDSHIP = (
    '"Hardship due to an adverse decision" to U.S. family members is a recognized favorable discretionary '
    'factor; the degree of hardship and its specific impact on qualifying relatives must be assessed. '
    '1 USCIS-PM E.8(C)(2); Matter of Marin, 16 I&N Dec. 581, 585 (BIA 1978).'
)

PROP_HUMANITARIAN = (
    '"[A]ny facts related to the person\'s conduct, character, family ties, other lawful ties to the '
    'United States, immigration status, or any other humanitarian concerns may be appropriate factors to '
    'consider in the exercise of discretion." Humanitarian concerns include health issues. '
    '1 USCIS-PM E.8(C)(2).'
)

PROP_COMMUNITY = (
    '"The applicant or beneficiary\'s value and service to the community" is a recognized favorable '
    'discretionary factor. 1 USCIS-PM E.8(C)(2); Matter of Marin, 16 I&N Dec. 581, 585 (BIA 1978).'
)

PROP_EMPLOYMENT = (
    '"History of employment" and "[p]roperty or business ties in the United States" are recognized '
    'favorable discretionary factors; "[i]t is important to consider the type of employment and its '
    'length and stability." 1 USCIS-PM E.8(C)(2); Matter of Mendez-Morales, 21 I&N Dec. 296, 302 '
    '(BIA 1996); Matter of Marin, 16 I&N Dec. 581, 585 (BIA 1978).'
)

PROP_CIVIC = (
    '"History of taxes paid" and "[e]vidence regarding respect for law and order, good character, and '
    'intent to hold family responsibilities" are recognized favorable discretionary factors. '
    '1 USCIS-PM E.8(C)(2).'
)

PROP_CHARACTER = (
    '"[E]vidence regarding respect for law and order, good character, and intent to hold family '
    'responsibilities" and "other indicators of an applicant or beneficiary\'s character" are recognized '
    'favorable discretionary factors. 1 USCIS-PM E.8(C)(2); Matter of Marin, 16 I&N Dec. 581, 585 '
    '(BIA 1978).'
)

PROP_REHAB = (
    '"Criminal history (in the United States and abroad) and whether the applicant or beneficiary has '
    'rehabilitated and reformed" is a recognized discretionary factor; "reformation is not an absolute '
    'prerequisite to a favorable exercise of discretion" and the analysis must be conducted "on a '
    'case-by-case basis." Matter of Edwards, 20 I&N Dec. 191, 196 (BIA 1990); 1 USCIS-PM E.8(C)(2).'
)

PROP_IMM_VIO = (
    '"Compliance with immigration laws" is a recognized adverse discretionary factor; however, "a record '
    'of immigration violations standing alone does not conclusively support a finding of lack of good moral '
    'character" and must be weighed against countervailing equities under the totality of the '
    'circumstances. 1 USCIS-PM E.8(C)(2); Matter of Mendez-Morales, 21 I&N Dec. 296, 301 (BIA 1996).'
)

PROP_FRAUD = (
    '"Previous instances of fraud or false testimony in dealings with USCIS or any government agency" '
    'are recognized adverse discretionary factors; willful misrepresentation of a material fact may '
    'also independently render an alien inadmissible. 1 USCIS-PM E.8(C)(2); INA §212(a)(6)(C)(i).'
)

PROP_CRIMINAL = (
    '"[M]oral depravity or criminal tendencies reflected by a single serious crime or an ongoing or '
    'continuing criminal record" is an adverse discretionary factor; USCIS "generally does not '
    'exercise discretion favorably" in cases involving violent or dangerous crimes, and "depending on '
    'the gravity of the alien\'s underlying criminal offense, a showing of extraordinary circumstances '
    'might still be insufficient to warrant a favorable exercise of discretion." 1 USCIS-PM E.8(C)(2); '
    '8 CFR §212.7(d).'
)

PROP_NATSEC = (
    '"Public safety or national security concerns" are among the most serious adverse discretionary '
    'factors; USCIS generally does not exercise discretion favorably where such concerns are present. '
    '1 USCIS-PM E.8(C)(2); 8 CFR §212.7(d).'
)

# ===========================================================
# DATA — 7-element tuples:
# (factor, authority, legal_proposition, equity_arg, evidence, counter_rebuttal, draft)
# ===========================================================
PM        = "PM-602-0199"
E8        = "1 USCIS-PM E.8"
A10       = "7 USCIS-PM A.10"
GMC       = "PM-602-0188"
ARAI      = "Matter of Arai, 13 I&N Dec. 494 (BIA 1970)"
MARIN     = "Matter of Marin, 16 I&N Dec. 581 (BIA 1978)"
EDWARDS   = "Matter of Edwards, 20 I&N Dec. 191 (BIA 1990)"
MENDEZ    = "Matter of Mendez-Morales, 21 I&N Dec. 296 (BIA 1996)"
CASTILLO  = "Matter of Castillo-Perez, 27 I&N Dec. 664 (A.G. 2019)"
BLAS      = "Matter of Blas, 15 I&N Dec. 626 (BIA 1974, A.G. 1976)"
PROC      = "Presidential Proclamation 10949 (6/4/2025)"
INA212C   = "INA §212(a)(6)(C)(i)"

blocks = []

# ---- BLOCK 1 ----
blocks.append(("THRESHOLD — STATUTORY ELIGIBILITY (not discretion)", "thresh", [
    ("Statutory eligibility for AOS",
     "INA §245(a); INA §245(c); 8 CFR Part 245",
     PROP_ELIGIBILITY,
     "Prerequisite, not a discretionary equity — confirms Applicant is legally eligible to adjust (inspection/admission, visa availability, admissibility).",
     "I-94, passport/visa, approved I-130/I-140/I-589, current Visa Bulletin chart, admissibility analysis / waiver if needed.",
     "Government may argue Applicant is statutorily barred or inadmissible → Address in eligibility section of the I-485 cover letter, not here; resolve any bar via waiver before reaching discretion.",
     "[This factor establishes jurisdiction and eligibility only and is addressed in the Statement of Eligibility section of the brief, not in the discretionary-balancing argument. No draft paragraph needed here.]"),
]))

# ---- BLOCK 2 ----
blocks.append(("WHY AOS INSTEAD OF CONSULAR PROCESSING (PM-602-0199 focus)", "thresh", [
    ("Changed circumstances after lawful entry",
     PM + "; " + A10,
     PROP_CONSULAR,
     "Equity Proven: The decision to seek AOS reflects a good-faith response to circumstances arising AFTER lawful admission — not an attempt to circumvent the consular process.",
     "Marriage certificate / birth certificate of USC child / approved employer petition / dated correspondence showing when circumstances changed.",
     "Government argument: Applicant always intended to remain and adjust, regardless of visa category. Our rebuttal: the specific timeline shows [event] occurred after admission and is what now supports AOS — consistent with the visa category's terms at the time of entry.",
     "The Applicant respectfully submits that adjustment of status — rather than consular processing — is appropriate because [describe the post-admission change: marriage to a U.S. citizen on [date]/birth of U.S. citizen child on [date]/approval of employer petition on [date]]. This change in circumstances arose after the Applicant's lawful admission and reflects the kind of good-faith development of family or employment ties that adjustment of status is designed to accommodate."),
    ("Practical impracticality or unavailability of consular processing",
     PM + "; " + PROC,
     PROP_PRACTICAL,
     "Equity Proven: AOS serves efficiency and fairness where consular processing is unsafe, effectively unavailable, or subject to extraordinary delay.",
     "Country-conditions reports (DOS), Proclamation 10949 list (if applicable), consular post processing-time data, evidence of post closures or backlogs.",
     "Government argument: Consular processing is, in theory, always an available alternative. Our rebuttal: the practical realities — [safety concerns / Proclamation 10949 listing / processing delays at Post X] — make CP a meaningfully different (and substantially worse) path for this Applicant, not a comparably available option.",
     "Although consular processing remains theoretically available, it is not a practical or comparably reasonable alternative for the Applicant given [country conditions in [country] / the inclusion of [country] on the list of countries subject to Presidential Proclamation 10949 (June 4, 2025) / current processing delays at the U.S. Embassy/Consulate in [city]]. Adjustment of status therefore serves the interests of both the Applicant and the efficient administration of the immigration laws."),
    ("Family unity through AOS",
     PM + "; INA §201(b)(2)(A)(i)",
     PROP_IR,
     "Equity Proven: Adjustment avoids unnecessary separation of the family unit during the consular-processing period.",
     "Evidence of cohabitation, lease/mortgage in joint names, joint tax returns, school enrollment records for children.",
     "Government argument: Temporary separation during CP is common and not, by itself, extraordinary. Our rebuttal: the specific facts here — [caregiving responsibilities / medical needs / minor children] — make this separation unusually disruptive, not merely routine inconvenience.",
     "Requiring the Applicant to depart the United States for consular processing — even temporarily — would separate the Applicant from [spouse/children/other qualifying relatives] during a period when [describe why separation would be unusually harmful]. Adjustment of status avoids this unnecessary disruption to the family unit."),
]))

# ---- BLOCK 3 ----
blocks.append(("FAMILY UNITY EQUITIES (Positive)", "pos", [
    ("U.S. citizen or LPR spouse",
     ARAI + "; " + E8,
     PROP_FAMILY,
     "Equity Proven: Family unity — a core positive discretionary factor.",
     "Marriage certificate, joint lease/mortgage, joint bank accounts, joint tax returns, photos, affidavits.",
     "Government may note marriage alone does not guarantee approval. Our rebuttal: combined with [other equities], the marriage reflects a bona fide, established family unit warranting family-unity consideration.",
     "The Applicant has been married to [spouse name], a United States citizen/lawful permanent resident, since [date]. Matter of Arai, 13 I&N Dec. 494 (BIA 1970), recognizes family relationships as an important positive discretionary factor. The couple [resides together at —/ shares joint finances —/ has built a life together in the United States], reflecting a substantial family-unity interest that favors a favorable exercise of discretion."),
    ("U.S. citizen or LPR children",
     ARAI + "; " + E8,
     PROP_FAMILY,
     "Equity Proven: Protection of dependent family members and family unity.",
     "Birth certificates, school records, medical records, custody/support documentation.",
     "Government may argue children can relocate or remain with the other parent. Our rebuttal: [describe specific reasons relocation/separation would harm the children — schooling, medical needs, sole caregiver status].",
     "The Applicant is the parent of [child name(s)], age(s) [ages], who are United States citizens. The Applicant [resides with / provides daily care and financial support for] the child(ren). Family relationships of this kind are accorded significant weight in the discretionary analysis. See Matter of Arai, 13 I&N Dec. 494 (BIA 1970); 1 USCIS-PM E.8(C)(2)."),
    ("U.S. citizen or LPR parents",
     ARAI + "; " + E8,
     PROP_FAMILY,
     "Equity Proven: Family support network / multigenerational family unity.",
     "Birth certificates establishing relationship, evidence of shared household or regular contact, evidence of support provided to or received from parent.",
     "Government may treat adult-child/parent ties as lower-weight than spouse/minor-child ties. Our rebuttal: [describe dependency — caregiving, cohabitation, financial interdependence] that elevates the significance of this relationship.",
     "The Applicant's [mother/father], [name], is a United States citizen/lawful permanent resident residing in [city, state]. The Applicant [provides regular care and support to / resides with] [his/her] [parent], who [describe any age, health, or dependency factors]. This relationship represents an additional family tie supporting a favorable exercise of discretion."),
    ("Cohabitation and depth of family ties",
     ARAI + "; " + MENDEZ,
     PROP_FAMILY_QUALITY,
     "Equity Proven: Depth and duration of family ties — distinguishes a genuine, integrated family unit from a nominal relationship.",
     "Lease/deed showing shared address over time, utility bills, joint insurance policies, photographs spanning the relationship, affidavits from family/friends.",
     "Government may discount ties as routine. Our rebuttal: the duration ([X years]) and the breadth of shared documentation establish an unusually well-documented, longstanding family unit.",
     "The Applicant has shared a household with [family member(s)] at [address] since [date], a period of [duration]. Matter of Mendez-Morales requires consideration of the quality of the relationship in determining the weight to be awarded this equity. The consistency and duration of this shared life — reflected in [joint leases, utility accounts, financial records] — demonstrates the depth of the Applicant's family ties in the United States."),
    ("Emotional interdependence / reliance",
     ARAI + "; " + E8,
     PROP_FAMILY_QUALITY,
     "Equity Proven: Substantial, demonstrable reliance between the Applicant and U.S. family members — elevates ordinary family ties to a significant equity.",
     "Affidavits from family members describing day-to-day reliance; therapist/counselor letters if applicable; evidence of role in family decision-making, childcare, or eldercare.",
     "Government may view emotional-hardship claims as generic/speculative. Our rebuttal: the affidavits and records here describe specific, ongoing reliance — not generalized hardship — e.g., [describe specific role].",
     "Beyond the formal family relationship, the record reflects substantial emotional and practical interdependence between the Applicant and [family member(s)]: [describe specific facts — e.g., the Applicant is the primary source of emotional support for a U.S. citizen child following [event], or provides daily assistance to an elderly parent]. This degree of reliance distinguishes the Applicant's family ties from the ordinary case and weighs strongly in favor of approval."),
]))

# ---- BLOCK 4 ----
blocks.append(("HARDSHIP EQUITIES — to U.S. family if Applicant must depart (Positive)", "pos", [
    ("Financial hardship to U.S. family",
     E8 + "; " + ARAI,
     PROP_HARDSHIP,
     "Equity Proven: Economic dependence of U.S. family members on the Applicant.",
     "Pay stubs, tax returns, household budget/expenses, evidence dependents have no other means of support.",
     "Government may note financial hardship is common in immigration cases. Our rebuttal: the specific numbers here show [percentage] of household income depends on the Applicant, with no realistic substitute income source.",
     "The Applicant provides [percentage or description] of the household's financial support for [spouse/children/other dependents]. If the Applicant were required to depart the United States, even temporarily, [dependents] would face the loss of [rent/mortgage payments, healthcare coverage, etc.], with no comparable alternative source of support."),
    ("Medical hardship to U.S. family member",
     E8,
     PROP_HARDSHIP,
     "Equity Proven: Health and welfare of U.S. citizen/LPR family members depends on the Applicant's presence.",
     "Medical records/letters from treating physicians describing the family member's condition and the Applicant's caregiving role.",
     "Government may question whether hardship is truly attributable to the Applicant's absence. Our rebuttal: treating-physician letter specifically identifies the Applicant's caregiving role as medically significant.",
     "The Applicant's [family member], [name], suffers from [condition], as documented in the attached letter from Dr. [name]. The Applicant provides [describe caregiving — transportation to appointments, medication management, daily assistance], which [physician] identifies as integral to [family member]'s care. Separation from the Applicant would directly affect [family member]'s medical wellbeing."),
    ("Educational hardship to U.S. citizen children",
     E8,
     PROP_HARDSHIP,
     "Equity Proven: Protection of children's stability, schooling, and development.",
     "School records, IEP/504 plans if applicable, letters from teachers/counselors.",
     "Government may note children can adapt to relocation. Our rebuttal: [describe specific disruption — IEP services unavailable abroad, language barriers, ongoing academic program].",
     "The Applicant's [child(ren)], [name(s)], [is/are] enrolled at [school] and [describe any individualized education plan, language considerations, or other factors]. Disruption of [his/her/their] education — whether through relocation or separation from a parent — would cause significant hardship that the totality-of-the-circumstances analysis should weigh in the Applicant's favor."),
    ("Caregiving responsibilities",
     E8,
     PROP_HARDSHIP,
     "Equity Proven: Humanitarian and family-welfare concern — Applicant is a necessary caregiver for a U.S. citizen/LPR family member.",
     "Medical/disability documentation for the care recipient, letters from healthcare providers, evidence no alternative caregiver is available.",
     "Government may ask whether another family member could provide care. Our rebuttal: [explain why no alternative caregiver exists — only adult child, other relatives live far away, etc.].",
     "The Applicant serves as the primary caregiver for [family member], who [describe condition/disability]. As reflected in the attached medical documentation, [family member] requires [describe level of care], and no alternative caregiver is reasonably available. The Applicant's continued presence in the United States is therefore essential to [family member]'s wellbeing."),
    ("Psychological / emotional hardship",
     E8,
     PROP_HARDSHIP,
     "Equity Proven: Family welfare — documented emotional impact of separation on U.S. family members.",
     "Letters from a licensed therapist/counselor; affidavits from family members describing impact of prior separations, if any.",
     "Government may treat generalized emotional-hardship claims skeptically. Our rebuttal: the record includes a professional evaluation, not merely lay assertions, addressing [specific family member]'s circumstances.",
     "As reflected in the attached letter from [therapist/counselor], [family member] has experienced [describe documented emotional impact], and separation from the Applicant would [describe anticipated effect]. This evidence supports a finding that family separation in this case would cause more than the ordinary hardship inherent in any family-based immigration matter."),
]))

# ---- BLOCK 5 ----
blocks.append(("HUMANITARIAN EQUITIES — to the Applicant (Positive)", "pos", [
    ("Applicant's own medical conditions",
     E8,
     PROP_HUMANITARIAN,
     "Equity Proven: Humanitarian consideration — ongoing U.S.-based treatment that would be interrupted or unavailable abroad.",
     "Treating-physician letters, treatment plans, evidence of treatment availability (or lack thereof) in home country.",
     "Government may ask whether treatment is available abroad. Our rebuttal: [describe specific gaps — cost, availability, continuity-of-care concerns].",
     "The Applicant is currently receiving treatment for [condition] under the care of Dr. [name], as described in the attached letter. This treatment [requires ongoing monitoring / is not readily available in [home country] / would be interrupted by travel]. The Applicant's continued presence in the United States to complete this course of treatment is a significant humanitarian consideration."),
    ("Age-related vulnerability",
     E8,
     PROP_HUMANITARIAN,
     "Equity Proven: Compassionate consideration given the Applicant's age and any associated health or support needs.",
     "Evidence of age, any age-related health conditions, evidence of who provides support to the Applicant in the U.S.",
     "Government may note age alone is not determinative. Our rebuttal: combined with [lack of support abroad / health conditions], age is one of several humanitarian considerations.",
     "The Applicant is [age] years old and [describe any relevant health or support considerations]. While age alone is not dispositive, it is one of several humanitarian factors — considered together with [cross-reference other factors] — that support a favorable exercise of discretion."),
    ("Lack of family or community support abroad",
     E8,
     PROP_HUMANITARIAN,
     "Equity Proven: Humanitarian concern — Applicant would face hardship returning to a country where they have no remaining support network.",
     "Affidavits describing family members who have died, emigrated, or lost contact; evidence of the Applicant's ties being concentrated in the U.S.",
     "Government may note the Applicant lived in the home country previously. Our rebuttal: circumstances have changed — [describe what changed: family members emigrated/passed away, property sold, etc.].",
     "The Applicant has no remaining immediate family or meaningful support network in [home country]: [describe — e.g., parents are deceased, siblings have also emigrated to the United States]. The Applicant's family, community, and support system are now centered entirely in the United States."),
    ("Dangerous or unstable country conditions",
     E8 + "; " + A10,
     PROP_HUMANITARIAN,
     "Equity Proven: Risk to the Applicant's safety if required to travel to or remain in the home country, even temporarily.",
     "U.S. Department of State country reports/travel advisories, human rights reports, news articles, expert affidavits.",
     "Government may note general country conditions affect all nationals, not just this Applicant. Our rebuttal: [describe Applicant-specific risk factors, if any, or explain why generalized conditions are nonetheless relevant to the AOS-vs-CP analysis].",
     "According to the U.S. Department of State's most recent country report, [country] is currently subject to [describe relevant travel advisory level / conditions]. These conditions bear directly on both the humanitarian equities in this case and on whether consular processing is a realistic alternative to adjustment of status."),
    ("Prior humanitarian-based status or relief",
     E8,
     PROP_HUMANITARIAN,
     "Equity Proven: Reflects Congressional/agency recognition of humanitarian circumstances — supports continued favorable treatment.",
     "Prior grant notices (asylum, TPS, U visa, VAWA approval, SIJS order, parole documents).",
     "Not typically subject to a government counterargument — prior grants are part of the record. If relevant, note any changed circumstances since the prior grant.",
     "The Applicant was previously granted [asylum / TPS / U nonimmigrant status / VAWA self-petition approval / SIJS-based classification / humanitarian parole] on [date], reflecting an existing administrative finding of humanitarian need. This history is part of the totality of the circumstances supporting the Applicant's eligibility for, and the appropriateness of, adjustment of status."),
]))

# ---- BLOCK 6 ----
blocks.append(("COMMUNITY & SOCIAL CONTRIBUTION (Positive)", "pos", [
    ("Religious participation",
     ARAI + "; " + E8,
     PROP_COMMUNITY,
     "Equity Proven: Community integration and positive contribution.",
     "Letter from clergy/religious organization describing membership, attendance, and any service roles.",
     "Government may view church attendance as low-weight standing alone. Our rebuttal: combined with [other community factors], reflects sustained, verifiable community integration.",
     "The Applicant has been an active member of [name of congregation] since [date], as reflected in the attached letter from [clergy member/title]. The Applicant [describe involvement — regular attendance, volunteer roles, participation in programs]. This sustained involvement reflects positive community integration. See 1 USCIS-PM E.8(C)(2)."),
    ("Volunteer service",
     GMC + "; " + E8,
     PROP_COMMUNITY,
     "Equity Proven: Contribution to society beyond the Applicant's immediate family.",
     "Letters from organizations documenting volunteer hours, role, and duration.",
     "Government may discount isolated or short-term volunteering. Our rebuttal: [describe duration/consistency — e.g., X hours/month over Y years].",
     "Since [date], the Applicant has volunteered with [organization], where [he/she] [describe role/activities], totaling approximately [hours/frequency]. This sustained volunteer service reflects the Applicant's positive contributions to the community, a favorable factor under 1 USCIS-PM E.8(C)(2)."),
    ("Mentorship / leadership roles",
     GMC,
     PROP_COMMUNITY,
     "Equity Proven: Positive civic impact and leadership within the community.",
     "Letters from mentees, organizations, or programs describing the Applicant's role and impact.",
     "Government may treat informal mentorship as anecdotal. Our rebuttal: attached letters from [program/organization] corroborate the role and its impact.",
     "The Applicant has served as a [mentor/coach/leader] with [program or organization] since [date], where [he/she] [describe specific responsibilities and impact]. Letters from [program staff/mentees] attached hereto corroborate the Applicant's positive influence within the community."),
    ("Awards, recognition, or honors",
     GMC,
     PROP_COMMUNITY,
     "Equity Proven: Documented exceptional contribution recognized by a third party.",
     "Certificates, award letters, news coverage, employer/organization recognition.",
     "N/A — third-party recognition is generally not subject to a meaningful counterargument; ensure authenticity is documented.",
     "The Applicant has received the following recognition for [his/her] contributions: [describe award(s), issuing organization, and date(s)]. This third-party recognition corroborates the Applicant's positive standing in the community."),
    ("Assistance to law enforcement",
     GMC,
     PROP_COMMUNITY,
     "Equity Proven: Public benefit — cooperation with law enforcement is a significant positive factor.",
     "Law enforcement certification (e.g., U-visa certification), letters from investigating agencies.",
     "N/A — generally a strong, well-documented positive factor where present.",
     "The Applicant cooperated with [agency name] in connection with [describe matter, to the extent appropriate], as reflected in the attached certification/letter dated [date]. Cooperation with law enforcement of this kind is recognized as a significant positive factor in the discretionary analysis."),
]))

# ---- BLOCK 7 ----
blocks.append(("ECONOMIC CONTRIBUTION (Positive)", "pos", [
    ("Stable employment history",
     E8,
     PROP_EMPLOYMENT,
     "Equity Proven: Self-sufficiency and reduced likelihood of becoming a public charge.",
     "Employment verification letters, pay stubs, W-2s spanning multiple years.",
     "Government may note employment alone is expected, not exceptional. Our rebuttal: length and stability ([X years with same employer]) reflect more than baseline expectations and support self-sufficiency findings.",
     "The Applicant has been continuously employed [at [employer] / in [field]] since [date], as documented by the attached employment verification letter and pay records. This stable employment history demonstrates the Applicant's self-sufficiency and ongoing positive economic contribution to the United States. See 1 USCIS-PM E.8(C)(2); Matter of Marin, 16 I&N Dec. 581, 585 (BIA 1978)."),
    ("Specialized skills / labor-shortage occupation",
     E8,
     PROP_EMPLOYMENT,
     "Equity Proven: Economic benefit to the U.S. — Applicant's skills address a documented labor need.",
     "Job description, employer letter describing skill requirements, labor market data (e.g., O*NET, DOL shortage occupation lists) if available.",
     "Government may not weigh occupation heavily absent a labor certification. Our rebuttal: even without a formal labor certification, the Applicant's skills in [field] address a documented need, as shown by [evidence].",
     "The Applicant works as [position/title], a role requiring [describe specialized skills/training]. [If applicable: This occupation is recognized as facing a labor shortage in [region/industry], as reflected in [source].] The Applicant's skills represent an ongoing economic contribution to the United States."),
    ("Education and future contribution",
     E8,
     PROP_EMPLOYMENT,
     "Equity Proven: Educational attainment supports continued positive contribution to the U.S. labor market.",
     "Diplomas, transcripts, degree evaluations, evidence of how education is applied in current employment.",
     "Government may not weigh education heavily standing alone. Our rebuttal: education is tied to [current employment/licensure], showing concrete application rather than unused credentials.",
     "The Applicant holds a [degree/credential] in [field] from [institution], completed in [year]. The Applicant currently applies this education in [describe role], reflecting a continued and concrete contribution to the U.S. economy and workforce."),
    ("Licensure / professional certification",
     E8,
     PROP_EMPLOYMENT,
     "Equity Proven: Professional value — Applicant has met formal U.S. licensing/certification standards.",
     "Copies of license/certification, renewal records, any continuing-education documentation.",
     "N/A — generally a strong, objectively verifiable positive factor.",
     "The Applicant holds [license/certification] issued by [issuing body], current through [date]. This credential reflects the Applicant's compliance with U.S. professional standards and ongoing commitment to [field]."),
    ("Property ownership / financial investment in the U.S.",
     E8,
     PROP_EMPLOYMENT,
     "Equity Proven: Long-term commitment to and stake in the United States.",
     "Property deed/mortgage statements, business registration documents, investment account statements.",
     "Government may note property ownership does not itself establish eligibility. Our rebuttal: it is offered as one of several equities reflecting the Applicant's long-term ties, not as a standalone basis for relief.",
     "The Applicant [owns the property located at [address] / holds an ownership interest in [business]], as reflected in the attached [deed/registration documents]. This investment reflects the Applicant's long-term commitment to building a life in the United States."),
]))

# ---- BLOCK 8 ----
blocks.append(("CIVIC COMPLIANCE (Positive)", "pos", [
    ("Tax compliance",
     GMC + "; " + E8,
     PROP_CIVIC,
     "Equity Proven: Respect for law — fulfillment of civic financial obligations.",
     "Federal and state tax returns for the relevant period, IRS transcripts if available.",
     "N/A — generally a clear positive factor; if any filings were late, address briefly with explanation.",
     "The Applicant has timely filed federal and state income tax returns for each of the past [number] years, as reflected in the attached returns/transcripts. Consistent tax compliance reflects the Applicant's respect for the law and fulfillment of civic obligations. See 1 USCIS-PM E.8(C)(2)."),
    ("Child support compliance",
     GMC,
     PROP_CIVIC,
     "Equity Proven: Responsibility — fulfillment of court-ordered family support obligations.",
     "Court orders, payment records, letters from child-support enforcement agencies.",
     "If there is a history of arrears, address directly here and cross-reference the Rehabilitation section for any catch-up payments.",
     "The Applicant [has consistently complied with / has brought current] the child-support obligation ordered in [case name/number], as reflected in the attached payment records. [If applicable: Although the Applicant previously fell behind on this obligation due to [reason], the Applicant has since paid all arrears in full, as documented in the attached records — see Rehabilitation section.]"),
    ("Debt resolution / financial responsibility",
     GMC,
     PROP_CIVIC,
     "Equity Proven: Financial accountability — absence of, or resolution of, significant outstanding debts.",
     "Credit report summary, settlement/payoff letters, bankruptcy discharge if applicable.",
     "Government may flag any outstanding judgments. Our rebuttal: [describe payment plan/resolution in progress, if any].",
     "The Applicant [has no significant outstanding debts or judgments / has resolved [describe debt] through [describe resolution]], as reflected in the attached documentation. This reflects the Applicant's financial responsibility and accountability."),
]))

# ---- BLOCK 9 ----
blocks.append(("CHARACTER EQUITIES (Positive)", "pos", [
    ("Absence of criminal history",
     MARIN + "; " + E8,
     PROP_CHARACTER,
     "Equity Proven: Good moral character — no criminal record weighing against the Applicant.",
     "Certified criminal background check / state and FBI record checks reflecting no convictions.",
     "N/A — a clean record is a baseline positive; pair with affirmative GMC evidence below for maximum weight.",
     "A review of the Applicant's criminal history reflects no arrests or convictions of any kind. The absence of any unfavorable criminal record, combined with the affirmative evidence of good character described herein, supports a finding of good moral character under 1 USCIS-PM E.8(C)(2)."),
    ("Character references / community reputation",
     E8,
     PROP_CHARACTER,
     "Equity Proven: Trustworthiness and reputation — third-party corroboration of good moral character.",
     "Multiple signed, dated letters from individuals in different relationships to the Applicant (employer, clergy, neighbor, friend) describing specific observations.",
     "Government may discount form-letter-style references. Our rebuttal: letters describe specific, individualized observations rather than generic praise.",
     "The Applicant has submitted letters of support from [number] individuals — including [employer/clergy/neighbors/friends] — each attesting to the Applicant's honesty, reliability, and positive presence in their lives and the community. These letters, attached hereto, corroborate the Applicant's good moral character."),
    ("Military service or sustained law-enforcement cooperation",
     GMC,
     PROP_CHARACTER,
     "Equity Proven: Exceptional service — carries substantial weight where present.",
     "DD-214 or service records; law-enforcement cooperation letters/certifications.",
     "N/A — where present, this is typically one of the strongest positive factors.",
     "The Applicant [served honorably in the [branch] from [dates], as reflected in the attached DD-214 / has cooperated with [law enforcement agency] as described above]. Military service and substantial cooperation with law enforcement are accorded significant weight in the discretionary analysis."),
]))

# ---- BLOCK 10 ----
blocks.append(("REHABILITATION / REFORMATION (Positive — include only if adverse history exists)", "pos", [
    ("Completion of sentence, probation, or court-ordered conditions",
     GMC + "; " + EDWARDS,
     PROP_REHAB,
     "Equity Proven: Demonstrated compliance with all court-imposed obligations following past conduct.",
     "Court records showing case closure, certificate of completion of probation, proof of payment of fines/fees.",
     "Government may weigh the underlying conduct heavily regardless of completion. Our rebuttal: completion plus the passage of time and subsequent record (see below) demonstrate genuine reformation.",
     "Following [brief, factual description of the underlying matter] in [year], the Applicant fully complied with all court-ordered conditions, including [probation/community service/fines], as reflected in the attached records showing case closure on [date]. See Matter of Edwards, 20 I&N Dec. 191 (BIA 1990) (reformation must be assessed on a case-by-case basis)."),
    ("Counseling, treatment, or educational programs completed",
     GMC,
     PROP_REHAB,
     "Equity Proven: Affirmative steps toward rehabilitation beyond what was legally required.",
     "Certificates of completion, provider letters.",
     "N/A — voluntary completion of programs generally strengthens the rehabilitation showing.",
     "In addition to complying with all court-ordered requirements, the Applicant voluntarily completed [program name] on [date], as reflected in the attached certificate. This additional step reflects the Applicant's genuine commitment to personal reformation."),
    ("Time elapsed since the conduct at issue",
     GMC + "; " + EDWARDS,
     PROP_REHAB,
     "Equity Proven: Passage of time without recurrence is itself evidence of reformation.",
     "Timeline showing date of conduct vs. present; absence of any subsequent record.",
     "Government may note the conduct remains part of the record regardless of time elapsed. Our rebuttal: [X years] have passed without any recurrence, which 1 USCIS-PM E.8 and PM-602-0188 recognize as relevant to the weight given to past conduct.",
     "More than [X years] have elapsed since the conduct described above, during which time the Applicant has had no further involvement with the criminal justice system. This sustained period of law-abiding conduct supports a finding of genuine reformation."),
    ("Consistent law-abiding conduct since",
     GMC,
     PROP_REHAB,
     "Equity Proven: Pattern of conduct since the adverse event corroborates reformation and supports the overall case theme.",
     "Combine with employment history, tax compliance, community involvement evidence above.",
     "N/A — this factor ties together the other positive factors as evidence of a sustained pattern, not an isolated post-hoc showing.",
     "Since [date], the Applicant has maintained steady employment, complied with all tax obligations, and become an active and contributing member of the community, as detailed throughout this memorandum. This sustained record — not a single isolated showing — demonstrates that the conduct described above does not reflect the Applicant's character today."),
]))

# ---- BLOCK 11 ----
blocks.append(("IMMIGRATION VIOLATIONS (Adverse)", "adv", [
    ("Overstay / accrual of unlawful presence",
     "INA §212(a)(9); " + PM + "; " + E8,
     PROP_IMM_VIO,
     "Government's Core Argument: Applicant remained in the U.S. beyond authorized status, in violation of the immigration laws.",
     "I-94 records, prior visa expiration dates, any subsequent extensions/changes of status filed.",
     "Our Rebuttal: [Identify any statutory forgiveness — e.g., immediate-relative AOS is generally not barred by unlawful presence under INA §245(c) exemptions / explain the limited duration and that it was promptly cured]. The overstay must be weighed against [strong family-unity / hardship equities above] per Matter of Mendez-Morales, 21 I&N Dec. 296 (BIA 1996), which recognizes that immigration violations can be outweighed by countervailing equities.",
     "The Applicant acknowledges that [he/she] remained in the United States beyond the period authorized on Form I-94, from [date] to [date]. [Explain category-specific forgiveness, if applicable, e.g., as an immediate relative, the Applicant's eligibility to adjust status is not barred by this overstay under INA §245(c).] While this is a factor the officer may weigh, a \"record of immigration violations standing alone does not conclusively support a finding of lack of good moral character\" and must be assessed in light of the Applicant's substantial positive equities described herein. Matter of Mendez-Morales, 21 I&N Dec. 296, 301 (BIA 1996)."),
    ("Unauthorized employment",
     PM + "; " + E8,
     PROP_IMM_VIO,
     "Government's Core Argument: Applicant worked without authorization, in violation of status.",
     "Employment dates/records, any EAD approval dates for comparison.",
     "Our Rebuttal: [Describe duration, whether disclosed voluntarily, and any statutory exemption — e.g., immediate-relative category]. Combined with the Applicant's overall record of tax compliance and stable, now-authorized employment, this factor should be given limited weight.",
     "The Applicant engaged in employment without authorization from approximately [date] to [date], prior to obtaining [EAD/current status]. The Applicant has disclosed this fact candidly and has, since obtaining authorization, maintained stable, lawful employment and full tax compliance, as described in Sections IV.A.7 and IV.A.8. This isolated period should be weighed against the Applicant's substantial countervailing equities."),
    ("Failure to maintain nonimmigrant status",
     A10 + "; " + E8,
     PROP_IMM_VIO,
     "Government's Core Argument: Pattern of noncompliance with the terms of the Applicant's nonimmigrant classification.",
     "Timeline of status history, any approved reinstatements or subsequent filings.",
     "Our Rebuttal: [Explain the circumstances — e.g., a single inadvertent lapse later cured, vs. a pattern]. Emphasize any prompt corrective action taken.",
     "[Describe the specific lapse in status, the circumstances surrounding it, and any corrective action taken, e.g., filing for reinstatement or a subsequent change of status]. This was an isolated incident, promptly addressed, and does not reflect a pattern of disregard for the immigration laws."),
    ("Removal proceedings or prior order of removal",
     A10 + "; " + E8,
     PROP_IMM_VIO,
     "Government's Core Argument: Prior enforcement history raises concerns about compliance and candor.",
     "EOIR records, copies of any prior orders, proof of compliance with any post-order requirements, motions to reopen/terminate if applicable.",
     "Our Rebuttal: [Explain the basis for the prior proceedings, current procedural posture (terminated, reopened, etc.), and how current eligibility is unaffected]. Address candidly — do not minimize.",
     "[Describe, factually and candidly, the nature and current status of any prior removal proceedings, including dates, the basis for the proceedings, and their current procedural posture]. [Explain why this history does not preclude the relief now sought, and how it should be weighed in light of the equities described above.]"),
]))

# ---- BLOCK 12 ----
blocks.append(("FRAUD / CREDIBILITY CONCERNS (Adverse)", "adv", [
    ("Misrepresentation in a prior application or at admission",
     INA212C + "; " + PM + "; " + A10,
     PROP_FRAUD,
     "Government's Core Argument: A material misrepresentation undermines the integrity of the Applicant's immigration history and raises credibility concerns for the current application.",
     "Copies of prior applications, any prior findings of inadmissibility under INA §212(a)(6)(C), waiver applications/approvals if obtained.",
     "Our Rebuttal: [If a waiver was obtained, state so. If the alleged misrepresentation is disputed, explain why it was not material or willful. If conceded, explain context and any corrective disclosure made.] Note: If this issue is present and unresolved, escalate for senior review before filing — do not rely solely on this template language.",
     "[ESCALATE — do not draft without senior attorney review.] [If applicable: The Applicant has obtained a waiver of inadmissibility under [section] for the conduct described, as reflected in the attached approval notice, and the issue is therefore resolved as a matter of eligibility. To the extent it remains relevant to discretion, the Applicant notes [mitigating context].]"),
    ("False or fraudulent documents",
     INA212C,
     PROP_FRAUD,
     "Government's Core Argument: Use of fraudulent documents reflects an attempt to deceive immigration authorities.",
     "Records identifying the document(s) at issue and the circumstances of their use/discovery.",
     "Our Rebuttal: [Context — e.g., documents used were provided by a third party without the Applicant's knowledge; voluntary disclosure made; time elapsed]. ESCALATE for senior review.",
     "[ESCALATE — do not draft without senior attorney review.]"),
    ("False testimony to a government official",
     "INA §101(f)(6); " + PM,
     PROP_FRAUD,
     "Government's Core Argument: False testimony for the purpose of obtaining an immigration benefit is a conditional bar to good moral character and a significant negative discretionary factor.",
     "Transcripts/records of the statements at issue, any subsequent corrective statements.",
     "Our Rebuttal: [Context, materiality dispute, or corrective disclosure]. ESCALATE for senior review.",
     "[ESCALATE — do not draft without senior attorney review.]"),
    ("Inconsistent statements or concealment across filings",
     A10,
     PROP_FRAUD,
     "Government's Core Argument: Inconsistencies across filings (current vs. prior applications, interviews, etc.) raise credibility concerns that color the entire discretionary analysis.",
     "Side-by-side comparison of statements across all filings (I-94, prior visa applications, prior AOS/asylum filings, etc.).",
     "Our Rebuttal: [Identify the specific inconsistency and provide a factual, candid explanation — translation error, evolving understanding of a question, correction already on file, etc.]. Proactively address before the officer raises it.",
     "[Describe the apparent inconsistency factually], [explain the reason for the discrepancy], and [note any steps taken to correct the record, such as a supplemental filing or sworn statement]. The Applicant has not sought to conceal this information and addresses it proactively in this memorandum."),
]))

# ---- BLOCK 13 ----
blocks.append(("PUBLIC SAFETY & NATIONAL SECURITY CONCERNS (Adverse — highest weight)", "adv", [
    ("Criminal conduct — felony or crime involving moral turpitude (CIMT)",
     GMC + "; " + CASTILLO + "; " + BLAS,
     PROP_CRIMINAL,
     "Government's Core Argument: Felony or CIMT convictions are significant negative factors and, depending on the offense, may constitute a conditional or permanent bar to good moral character.",
     "Certified court dispositions, sentencing records, evidence of completion of sentence.",
     "Our Rebuttal: Address only if NOT a permanent bar. [Describe nature/severity, time elapsed, and rehabilitation evidence — cross-reference Rehabilitation section]. ESCALATE for senior review to confirm no permanent bar applies before proceeding with AOS.",
     "[ESCALATE — confirm with senior attorney whether this conviction constitutes a permanent bar before drafting. If not a bar: describe the offense factually, the disposition, and the rehabilitation evidence in Section [X], explaining why the totality of the circumstances nonetheless supports a favorable exercise of discretion.]"),
    ("Controlled substance violations / DUI",
     GMC + "; " + CASTILLO,
     PROP_CRIMINAL,
     "Government's Core Argument: Matter of Castillo-Perez, 27 I&N Dec. 664 (A.G. 2019), treats multiple DUI convictions as significant negative factors bearing on good moral character; controlled-substance violations may trigger independent inadmissibility grounds.",
     "Certified court dispositions, proof of completion of any required programs (e.g., DUI school), proof of compliance with probation.",
     "Our Rebuttal: [If a single, older DUI with completed programs and no recurrence: emphasize time elapsed, program completion, and absence of recurrence — cross-reference Rehabilitation section.] ESCALATE if any controlled-substance conviction is present — potential independent inadmissibility ground requiring waiver analysis.",
     "[ESCALATE if controlled-substance conviction — confirm waiver eligibility/strategy first.] [For DUI: The Applicant was convicted of [offense] on [date] and successfully completed [program], as reflected in the attached records. More than [X years] have passed without recurrence. While Matter of Castillo-Perez, 27 I&N Dec. 664 (A.G. 2019), directs that such convictions be weighed carefully, the Applicant's subsequent record — detailed in Section [X] — demonstrates that this conduct does not reflect the Applicant's present character.]"),
    ("Anti-American / anti-Western / antisemitic views or support for terrorism",
     GMC,
     PROP_NATSEC,
     "Government's Core Argument: PM-602-0188 identifies this category as OVERWHELMINGLY NEGATIVE — cannot be outweighed by positive equities if present.",
     "N/A — this row exists to confirm ABSENCE, not to document presence.",
     "If any indication of this exists in the record (social media, affiliations, statements), ESCALATE IMMEDIATELY to senior attorney — this is not a factor that can be balanced or rebutted through ordinary equities.",
     "The Applicant affirmatively states, and the record reflects no evidence to the contrary, that [he/she] has not expressed anti-American, anti-Western, or antisemitic views, and has no affiliation with or support for any terrorist organization or activity. PM-602-0188 identifies such conduct as an overwhelmingly negative factor; its absence here removes any concern in this category from the discretionary analysis."),
    ("FDNS referral / fraud-detection flag",
     A10,
     PROP_NATSEC,
     "Government's Core Argument: Any pending fraud-detection referral signals unresolved credibility or eligibility concerns that may need to be addressed before — or independent of — the discretionary analysis.",
     "Any RFE/NOID referencing site visits, FDNS, or fraud concerns; responses filed.",
     "Our Rebuttal: [Summarize the basis for the referral and how it was resolved — e.g., site visit completed satisfactorily, RFE responded to with corroborating evidence]. If unresolved, ESCALATE.",
     "[If applicable: USCIS previously raised [describe FDNS-related concern] in connection with this matter. As reflected in [response/evidence], this concern has been fully addressed through [describe resolution]. The Applicant is not aware of any unresolved fraud-detection concerns affecting this application.]"),
]))

# ---- Write blocks ----
pos_count = 0; adv_count = 0
weight_rows_pos = []; weight_rows_adv = []

for cat_label, polarity, rows_ in blocks:
    ws.merge_cells(f"A{row}:J{row}")
    c = ws.cell(row=row, column=1, value=cat_label)
    c.font = SECTION_FONT
    if polarity == "pos":
        c.fill = POS_SECTION_FILL
    elif polarity == "adv":
        c.fill = ADV_SECTION_FILL
    else:
        c.fill = THRESH_SECTION_FILL
    c.alignment = Alignment(horizontal="left", vertical="center")
    ws.row_dimensions[row].height = 20
    row += 1

    for (factor, authority, legal_prop, equity_arg, evidence, counter_rebuttal, draft) in rows_:
        ws.cell(row=row, column=1, value=cat_label.split(" (")[0]).font = NOTE_FONT
        c = ws.cell(row=row, column=2,  value=factor);        c.font = BOLD;          c.alignment = WRAP
        c = ws.cell(row=row, column=3,  value=authority);     c.font = QUESTION_FONT; c.alignment = WRAP
        c = ws.cell(row=row, column=4,  value=legal_prop);    c.font = PROP_FONT;     c.alignment = WRAP
        c = ws.cell(row=row, column=5,  value=equity_arg);    c.font = QUESTION_FONT; c.alignment = WRAP
        c = ws.cell(row=row, column=6,  value="");            c.alignment = WRAP   # case facts — blank for attorney
        c = ws.cell(row=row, column=7,  value=evidence);      c.font = QUESTION_FONT; c.alignment = WRAP
        c = ws.cell(row=row, column=8,  value="");            c.alignment = WRAP_CENTER  # weight
        c = ws.cell(row=row, column=9,  value=counter_rebuttal); c.font = QUESTION_FONT; c.alignment = WRAP
        c = ws.cell(row=row, column=10, value=draft);         c.font = QUESTION_FONT; c.alignment = WRAP
        for col in range(1, 11):
            ws.cell(row=row, column=col).border = BORDER
        ws.row_dimensions[row].height = 110
        if polarity == "pos":
            weight_rows_pos.append(row)
        elif polarity == "adv":
            weight_rows_adv.append(row)
        row += 1

DATA_END = row - 1

# ---- Weight dropdown + conditional formatting (column H) ----
dv = DataValidation(type="list", formula1='"Strong,Moderate,Limited,Not Present"',
                    allow_blank=True, showDropDown=False)
ws.add_data_validation(dv)
dv.add(f"H{DATA_START}:H{DATA_END}")

strong_rule    = CellIsRule(operator="equal", formula=['"Strong"'],      fill=PatternFill("solid", start_color="A9D18E"))
moderate_rule  = CellIsRule(operator="equal", formula=['"Moderate"'],    fill=PatternFill("solid", start_color="FFE699"))
limited_rule   = CellIsRule(operator="equal", formula=['"Limited"'],     fill=PatternFill("solid", start_color="F2F2F2"))
notpresent_rule = CellIsRule(operator="equal", formula=['"Not Present"'], fill=NEU_FILL)
rng = f"H{DATA_START}:H{DATA_END}"
for r_ in (strong_rule, moderate_rule, limited_rule, notpresent_rule):
    ws.conditional_formatting.add(rng, r_)

# ---- Dashboard formulas ----
pos_range = f"H{min(weight_rows_pos)}:H{max(weight_rows_pos)}"
adv_range = f"H{min(weight_rows_adv)}:H{max(weight_rows_adv)}"
ws.cell(row=dash_cells["Positive Equities — Strong:"],   column=2, value=f'=COUNTIF({pos_range},"Strong")')
ws.cell(row=dash_cells["Positive Equities — Moderate:"], column=2, value=f'=COUNTIF({pos_range},"Moderate")')
ws.cell(row=dash_cells["Positive Equities — Limited:"],  column=2, value=f'=COUNTIF({pos_range},"Limited")')
ws.cell(row=dash_cells["Adverse Factors — Strong:"],     column=2, value=f'=COUNTIF({adv_range},"Strong")')
ws.cell(row=dash_cells["Adverse Factors — Moderate:"],   column=2, value=f'=COUNTIF({adv_range},"Moderate")')
ws.cell(row=dash_cells["Adverse Factors — Limited:"],    column=2, value=f'=COUNTIF({adv_range},"Limited")')

ws.freeze_panes = f"A{HEADER_ROW + 1}"

# ═══════════════════════════════════════════════════════════════════════
# TAB 3 — CASE THEME WORKSHEET
# ═══════════════════════════════════════════════════════════════════════
# Remove and recreate so the script is idempotent
for name in ["3. Case Theme", "3. Case Theme Worksheet"]:
    if name in wb.sheetnames:
        del wb[name]

ct = wb.create_sheet("3. Case Theme", index=2)

# Rename Legal Framework tab if needed (now becomes Tab 4)
for old in ["3. Legal Framework Reference", "Legal Framework Reference"]:
    if old in wb.sheetnames:
        wb[old].title = "4. Legal Framework Reference"

# ── Column widths ──────────────────────────────────────────────────────
ct.column_dimensions["A"].width = 28
ct.column_dimensions["B"].width = 60
ct.column_dimensions["C"].width = 54
ct.column_dimensions["D"].width = 36

# ── Helper styles ──────────────────────────────────────────────────────
CT_TITLE_FONT   = Font(name="Arial", size=14, bold=True, color="FFFFFF")
CT_SECTION_FONT = Font(name="Arial", size=10, bold=True, color="FFFFFF")
CT_LABEL_FONT   = Font(name="Arial", size=10, bold=True, color="1F3864")
CT_BODY_FONT    = Font(name="Arial", size=10)
CT_NOTE_FONT    = Font(name="Arial", size=9, italic=True, color="595959")
CT_TITLE_FILL   = PatternFill("solid", start_color="1F3864")
CT_SECTION_FILL = PatternFill("solid", start_color="4472C4")
CT_INPUT_FILL   = PatternFill("solid", start_color="EBF3FB")
CT_HINT_FILL    = PatternFill("solid", start_color="FFF2CC")
CT_BORDER       = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)
CT_WRAP         = Alignment(wrap_text=True, vertical="top")
CT_CENTER       = Alignment(wrap_text=True, vertical="center", horizontal="center")

def ct_merge(row, start_col, end_col, value="", font=None, fill=None, align=None, height=None):
    start_letter = chr(64 + start_col)
    end_letter   = chr(64 + end_col)
    ct.merge_cells(f"{start_letter}{row}:{end_letter}{row}")
    c = ct.cell(row=row, column=start_col, value=value)
    if font:  c.font      = font
    if fill:  c.fill      = fill
    if align: c.alignment = align
    else:     c.alignment = CT_WRAP
    for col in range(start_col, end_col + 1):
        ct.cell(row=row, column=col).border = CT_BORDER
    if height:
        ct.row_dimensions[row].height = height
    return c

def ct_label_value(row, label, value="", hint="", label_height=18):
    lc = ct.cell(row=row, column=1, value=label)
    lc.font = CT_LABEL_FONT; lc.fill = CT_INPUT_FILL; lc.border = CT_BORDER
    lc.alignment = CT_WRAP

    vc = ct.cell(row=row, column=2, value=value)
    vc.font = CT_BODY_FONT; vc.fill = CT_INPUT_FILL; vc.border = CT_BORDER
    vc.alignment = CT_WRAP

    # Columns C-D: hint text
    ct.merge_cells(f"C{row}:D{row}")
    hc = ct.cell(row=row, column=3, value=hint)
    hc.font = CT_NOTE_FONT; hc.fill = CT_HINT_FILL; hc.border = CT_BORDER
    hc.alignment = CT_WRAP
    ct.row_dimensions[row].height = label_height
    return vc

# ── Row 1: Title ───────────────────────────────────────────────────────
ct_merge(1, 1, 4,
         value="CASE THEME WORKSHEET — AOS Discretionary Brief",
         font=CT_TITLE_FONT, fill=CT_TITLE_FILL,
         align=Alignment(horizontal="center", vertical="center", wrap_text=True),
         height=30)

# ── Row 2: Instructions ────────────────────────────────────────────────
ct_merge(2, 1, 4,
         value=("Complete this worksheet BEFORE drafting the brief. "
                "Step 1: Run Tab 2 (Brief Development Matrix) and weight the factors. "
                "Step 2: Return here and distill the case into a theme and 2–4 primary argument headings. "
                "Step 3: Map each heading to the Tab 2 categories that support it. "
                "The brief generator reads this tab — not the factor categories directly — so the brief "
                "will be organized around your narrative, not a checklist."),
         font=CT_NOTE_FONT, fill=CT_HINT_FILL,
         align=CT_WRAP, height=52)

# ── Row 3: Spacer ──────────────────────────────────────────────────────
ct.row_dimensions[3].height = 8

# ── Row 4: Section header — Case Theme ────────────────────────────────
ct_merge(4, 1, 4,
         value="PART 1 — CASE THEME",
         font=CT_SECTION_FONT, fill=CT_SECTION_FILL,
         align=Alignment(horizontal="left", vertical="center", wrap_text=True),
         height=20)

# ── Row 5: Case Theme sentence ────────────────────────────────────────
ct_label_value(5, "Case Theme:",
               value="",
               hint=("One sentence. Persuasive, not legal. Example: \"A devoted mother whose "
                     "continued presence is essential to her U.S. citizen family and two grandchildren.\""),
               label_height=40)
ct.row_dimensions[5].height = 52

# ── Row 6: Spacer ──────────────────────────────────────────────────────
ct.row_dimensions[6].height = 8

# ── Row 7: Section header — Brief Structure ───────────────────────────
ct_merge(7, 1, 4,
         value="PART 2 — PRIMARY ARGUMENT SECTIONS (2–4 sections)",
         font=CT_SECTION_FONT, fill=CT_SECTION_FILL,
         align=Alignment(horizontal="left", vertical="center", wrap_text=True),
         height=20)

# ── Row 8: Column headers ──────────────────────────────────────────────
for col, text in [(1, "Section"), (2, "Section Heading\n(use in brief — attorney-authored)"),
                  (3, "Tab 2 Categories to Include\n(comma-separated exact matches)"),
                  (4, "Notes / Theme Connection")]:
    c = ct.cell(row=8, column=col, value=text)
    c.font = Font(name="Arial", size=9, bold=True, color="FFFFFF")
    c.fill = PatternFill("solid", start_color="6EA6D7")
    c.border = CT_BORDER
    c.alignment = Alignment(wrap_text=True, vertical="center", horizontal="center")
ct.row_dimensions[8].height = 32

# ── Rows 9-12: Primary equity section rows (A–D) ─────────────────────
SECTION_LABELS = ["Section A", "Section B", "Section C", "Section D"]
SECTION_HINTS = [
    ("The Applicant's Presence Is Essential to Her U.S. Citizen Family",
     "Positive — Family Unity (Family Members), Positive — Caregiving and Dependents",
     "Lead with your strongest equity."),
    ("The Applicant Has Established Substantial Ties to the United States",
     "Positive — Community Contribution, Positive — Economic Contribution, Positive — Length of Residence",
     "Bundle secondary equities here."),
    ("Adjustment of Status Is the Appropriate Relief",
     "Threshold Eligibility",
     "Address the May 2026 memo head-on — why AOS rather than CP?"),
    ("", "", "Optional 4th section."),
]

for i, (label, heading_ex, note_ex) in enumerate(SECTION_HINTS):
    r = 9 + i
    lc = ct.cell(row=r, column=1, value=SECTION_LABELS[i])
    lc.font = CT_LABEL_FONT; lc.fill = CT_INPUT_FILL; lc.border = CT_BORDER
    lc.alignment = CT_CENTER

    hc = ct.cell(row=r, column=2, value=heading_ex)
    hc.font = Font(name="Arial", size=10, italic=True, color="595959")
    hc.fill = CT_INPUT_FILL; hc.border = CT_BORDER; hc.alignment = CT_WRAP

    cc = ct.cell(row=r, column=3, value="")
    cc.fill = CT_INPUT_FILL; cc.border = CT_BORDER; cc.alignment = CT_WRAP
    cc.font = CT_BODY_FONT

    nc = ct.cell(row=r, column=4, value=note_ex)
    nc.font = CT_NOTE_FONT; nc.fill = CT_HINT_FILL; nc.border = CT_BORDER; nc.alignment = CT_WRAP
    ct.row_dimensions[r].height = 42

# ── Row 13: Spacer ─────────────────────────────────────────────────────
ct.row_dimensions[13].height = 8

# ── Row 14: Section header — AOS Mechanism ────────────────────────────
ct_merge(14, 1, 4,
         value="PART 3 — AOS IS THE APPROPRIATE MECHANISM (May 2026 PM Response)",
         font=CT_SECTION_FONT, fill=PatternFill("solid", start_color="2E5395"),
         align=Alignment(horizontal="left", vertical="center", wrap_text=True),
         height=20)

ct_label_value(15, "Include this section?",
               value="Yes",
               hint=("Yes / No. Recommended: Yes for most cases filed after the May 2026 memo. "
                     "This section explains why AOS rather than consular processing, addresses "
                     "preconceived intent concerns, and demonstrates why Congress created "
                     "immediate-relative adjustment."),
               label_height=20)

ct_label_value(16, "Section Heading:",
               value="Adjustment of Status Is the Appropriate and Legally Available Relief",
               hint="Edit the heading if the case warrants a more specific framing.",
               label_height=20)

ct_label_value(17, "Key Points to Make:",
               value="",
               hint=("Bullet or prose notes for this section. Example: 'Consular processing would "
                     "trigger 10-year bar. Entry was lawful. No preconceived intent — circumstances "
                     "changed after entry when daughter became USC.'"),
               label_height=20)
ct.row_dimensions[17].height = 52

# ── Row 18: Spacer ─────────────────────────────────────────────────────
ct.row_dimensions[18].height = 8

# ── Row 19: Section header — Adverse Factors ──────────────────────────
ct_merge(19, 1, 4,
         value="PART 4 — ADVERSE FACTORS & BALANCING",
         font=CT_SECTION_FONT, fill=PatternFill("solid", start_color="C0392B"),
         align=Alignment(horizontal="left", vertical="center", wrap_text=True),
         height=20)

ct_label_value(20, "Adverse Factor Heading:",
               value="The Adverse Factors Are Outweighed by the Applicant's Substantial Equities",
               hint="Edit to match the case. If no significant adverse factors, change to 'The Record Presents No Substantial Adverse Factors'.",
               label_height=20)
ct.row_dimensions[20].height = 40

ct_label_value(21, "Balancing Notes:",
               value="",
               hint=("Attorney notes for the balancing paragraph. The generator writes boilerplate — "
                     "add case-specific language here, e.g., 'overstay is sole adverse factor, "
                     "nonwillful, immediately disclosed'."),
               label_height=20)
ct.row_dimensions[21].height = 52

# ── Row 22: Spacer ─────────────────────────────────────────────────────
ct.row_dimensions[22].height = 8

# ── Row 23: Section header — Conclusion Notes ─────────────────────────
ct_merge(23, 1, 4,
         value="PART 5 — CONCLUSION",
         font=CT_SECTION_FONT, fill=CT_SECTION_FILL,
         align=Alignment(horizontal="left", vertical="center", wrap_text=True),
         height=20)

ct_label_value(24, "Conclusion Notes:",
               value="",
               hint=("Optional. Add case-specific closing language. The generator provides boilerplate "
                     "conclusion text; this field supplements it."),
               label_height=20)
ct.row_dimensions[24].height = 40

ct.freeze_panes = "A3"

# ═══════════════════════════════════════════════════════════════════════
wb.save(SRC)
print("saved", SRC, DATA_START, DATA_END, "pos_rows", len(weight_rows_pos), "adv_rows", len(weight_rows_adv))
