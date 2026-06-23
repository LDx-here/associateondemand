import openpyxl
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.utils import get_column_letter
import os
from pathlib import Path

_OUTPUT = Path(
    os.environ.get(
        "AOD_ASSESSMENT_XLSX",
        Path(__file__).resolve().parents[2] / "data" / "templates" / "AOS_Discretionary_Factors_Case_Assessment_Tool.xlsx",
    )
)
_OUTPUT.parent.mkdir(parents=True, exist_ok=True)

wb = Workbook()
ws = wb.active
ws.title = "AOS Discretion Assessment"

# ---- Styles ----
TITLE_FONT = Font(name="Arial", size=14, bold=True, color="FFFFFF")
SUBTITLE_FONT = Font(name="Arial", size=10, italic=True, color="404040")
HEADER_FONT = Font(name="Arial", size=10, bold=True, color="FFFFFF")
SECTION_FONT = Font(name="Arial", size=11, bold=True, color="FFFFFF")
SUBSECTION_FONT = Font(name="Arial", size=10, bold=True, color="1F3864")
QUESTION_FONT = Font(name="Arial", size=10)
NOTE_FONT = Font(name="Arial", size=9, italic=True, color="595959")

TITLE_FILL = PatternFill("solid", start_color="1F3864")
SECTION_FILL = PatternFill("solid", start_color="2E5395")
SUBSECTION_FILL = PatternFill("solid", start_color="D9E2F3")
HEADER_FILL = PatternFill("solid", start_color="4472C4")
SUMMARY_FILL = PatternFill("solid", start_color="FFF2CC")

POS_FILL = PatternFill("solid", start_color="C6E0B4")
NEG_FILL = PatternFill("solid", start_color="F8CBAD")
NEU_FILL = PatternFill("solid", start_color="F2F2F2")

THIN = Side(border_style="thin", color="BFBFBF")
BORDER = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)

WRAP = Alignment(wrap_text=True, vertical="top")
WRAP_CENTER = Alignment(wrap_text=True, vertical="center", horizontal="center")

COLS = ["A", "B", "C", "D", "E", "F", "G"]
# A: Category | B: Sub-Issue | C: Question / Factor | D: Answer / Notes
# E: Favors (Positive/Negative/Neutral/N-A) | F: Evidence to Gather | G: Source / Citation

ws.column_dimensions["A"].width = 22
ws.column_dimensions["B"].width = 26
ws.column_dimensions["C"].width = 55
ws.column_dimensions["D"].width = 32
ws.column_dimensions["E"].width = 14
ws.column_dimensions["F"].width = 32
ws.column_dimensions["G"].width = 26

row = 1

# ---- Title ----
ws.merge_cells(f"A{row}:G{row}")
c = ws.cell(row=row, column=1, value="AOS DISCRETIONARY FACTORS — CASE ASSESSMENT TOOL")
c.font = TITLE_FONT
c.fill = TITLE_FILL
c.alignment = Alignment(horizontal="left", vertical="center")
ws.row_dimensions[row].height = 22
row += 1

ws.merge_cells(f"A{row}:G{row}")
c = ws.cell(row=row, column=1,
            value=("Use with every I-485 filing to build a contemporaneous record of the totality-of-the-circumstances "
                   "discretionary analysis required under PM-602-0199 (May 21, 2026), 1 USCIS-PM E.8, and 7 USCIS-PM A.10. "
                   "Standard of proof: preponderance of the evidence."))
c.font = SUBTITLE_FONT
c.alignment = WRAP
ws.row_dimensions[row].height = 32
row += 1

row += 1  # blank

# ---- Case info block ----
case_fields = ["Client Name:", "Matter No.:", "Country of Origin / CP Post:", "Filing Category (e.g., I-130/I-485, EB, AOS-Asylee):",
               "Date Prepared:", "Prepared By:"]
for label in case_fields:
    ws.cell(row=row, column=1, value=label).font = Font(name="Arial", size=10, bold=True)
    ws.merge_cells(f"B{row}:D{row}")
    ws.cell(row=row, column=2).border = Border(bottom=Side(border_style="thin", color="000000"))
    row += 1

row += 1  # blank

SUMMARY_START = row
ws.merge_cells(f"A{row}:G{row}")
c = ws.cell(row=row, column=1, value="SUMMARY — TOTALITY OF THE CIRCUMSTANCES")
c.font = SECTION_FONT
c.fill = SECTION_FILL
ws.row_dimensions[row].height = 20
row += 1

ws.cell(row=row, column=1, value="Total Positive Factors:").font = Font(name="Arial", size=10, bold=True)
ws.cell(row=row, column=2, value="").font = QUESTION_FONT
ws.cell(row=row, column=1).fill = SUMMARY_FILL
ws.cell(row=row, column=2).fill = SUMMARY_FILL
pos_count_row = row
row += 1
ws.cell(row=row, column=1, value="Total Negative Factors:").font = Font(name="Arial", size=10, bold=True)
ws.cell(row=row, column=2, value="").font = QUESTION_FONT
ws.cell(row=row, column=1).fill = SUMMARY_FILL
ws.cell(row=row, column=2).fill = SUMMARY_FILL
neg_count_row = row
row += 1
ws.cell(row=row, column=1, value="Total Neutral / Not Applicable:").font = Font(name="Arial", size=10, bold=True)
ws.cell(row=row, column=2, value="").font = QUESTION_FONT
ws.cell(row=row, column=1).fill = SUMMARY_FILL
ws.cell(row=row, column=2).fill = SUMMARY_FILL
neu_count_row = row
row += 1
ws.cell(row=row, column=1, value="Overall Assessment / Recommended Strategy:").font = Font(name="Arial", size=10, bold=True)
ws.cell(row=row, column=1).fill = SUMMARY_FILL
ws.merge_cells(f"B{row}:G{row+2}")
ws.cell(row=row, column=2).fill = SUMMARY_FILL
ws.cell(row=row, column=2).alignment = WRAP
ws.row_dimensions[row].height = 18
ws.row_dimensions[row+1].height = 18
ws.row_dimensions[row+2].height = 18
row += 3

row += 1  # blank

# ---- Column headers (template row, will be repeated) ----
HEADER_LABELS = ["Category", "Sub-Issue", "Question / Discretionary Factor", "Case Facts / Answer",
                 "Favors (Pos / Neg / Neutral / N-A)", "Evidence to Gather", "Source"]

def write_header_row(r):
    for i, label in enumerate(HEADER_LABELS, start=1):
        cell = ws.cell(row=r, column=i, value=label)
        cell.font = HEADER_FONT
        cell.fill = HEADER_FILL
        cell.alignment = WRAP_CENTER
        cell.border = BORDER
    ws.row_dimensions[r].height = 30

write_header_row(row)
HEADER_ROW_1 = row
row += 1

# ---- Data: list of (type, content...) ----
# type "section" -> (label,)
# type "sub" -> (sub_issue label,)
# type "q" -> (sub_issue, question, source)
data = []

def section(label):
    data.append(("section", label))

def sub(label):
    data.append(("sub", label))

def q(question, source=""):
    data.append(("q", question, source))

PM = "PM-602-0199 (5/21/26)"
GMC = "PM-602-0188 (8/15/25)"
EE8 = "1 USCIS-PM E.8"
AA10 = "7 USCIS-PM A.10"
CILA = "CILA Discretion Chart"

# 1. ELIGIBILITY
section("1. ELIGIBILITY FOR ADJUSTMENT")
sub("Statutory Eligibility")
q("Does the Applicant meet every statutory and regulatory eligibility requirement for AOS under INA §245(a) (visa availability, admissibility, eligible to receive an immigrant visa)?", f"{PM}; INA 245(a)")
q("Is the Applicant otherwise admissible, or does the Applicant require a waiver of any ground(s) of inadmissibility under INA §212(a)?", EE8)
q("Has the Applicant obtained (or is the Applicant eligible for) any required waiver of inadmissibility?", EE8)
q("Is a visa number immediately available (priority date current) at filing and at adjudication?", "INA 245(a)(3)")
sub("AOS vs. Consular Processing — Threshold Question")
q("PM-602-0199 frames AOS as an 'administrative grace' / extraordinary relief that allows the Applicant to dispense with consular processing abroad. Why is AOS — rather than consular processing — appropriate and in the best interest of both the Applicant and the United States in this case?", PM)
q("Did the Applicant intend, at the time of entry, to remain in the U.S. and pursue AOS, or did circumstances arise after lawful entry that now make AOS appropriate?", f"{PM}; {AA10}")
q("What specific factors make consular processing impractical, unsafe, or unavailable for this Applicant (e.g., country conditions, processing delays, safety, family unity)?", PM)

# 2. FAMILY AND COMMUNITY TIES
section("2. FAMILY & COMMUNITY TIES (Positive Factors)")
sub("Immediate Family in the U.S.")
q("Does the Applicant have a U.S. citizen or LPR spouse?", f"{EE8}; {CILA}")
q("Does the Applicant have U.S. citizen or LPR children? What are their ages?", f"{EE8}; {CILA}")
q("Does the Applicant have U.S. citizen or LPR parents or siblings residing in the U.S.?", CILA)
q("How long has the family unit resided together in the U.S.? Would adjudication outcome separate the family, even temporarily?", EE8)
sub("Hardship to U.S. Family if Applicant Required to Depart for CP")
q("Does the Applicant provide essential financial support to a dependent spouse or child in the U.S.? Could that support continue if the Applicant departed for consular processing?", f"{EE8}; {CILA}")
q("Does the Applicant provide hands-on caregiving to a family member with a medical condition, disability, or special needs?", EE8)
q("Would temporary separation cause demonstrable emotional, financial, or medical hardship to U.S. family members (documented, not speculative)?", EE8)
q("Are there U.S.-citizen children who would face disruption to school, medical treatment, or care arrangements?", CILA)
sub("Community Ties & Contributions")
q("Is the Applicant an active member of a church, mosque, synagogue, or other religious/community organization?", CILA)
q("Has the Applicant volunteered, mentored, or otherwise contributed time to community organizations?", f"{GMC}; {CILA}")
q("Has the Applicant made charitable contributions (monetary or in-kind)?", GMC)
q("Has the Applicant received recognition, awards, or commendations for community service, military, or law-enforcement-related contributions?", GMC)
q("Has the Applicant cooperated with or assisted law enforcement (e.g., as a witness, U-visa certifier, etc.)?", GMC)

# 3. HUMANITARIAN CONSIDERATIONS
section("3. HUMANITARIAN CONSIDERATIONS")
sub("Hardship to Applicant if Required to Depart")
q("Does the Applicant have a medical condition requiring ongoing U.S.-based treatment that would be interrupted or unavailable abroad?", EE8)
q("Does the Applicant lack family or community support in the home country?", EE8)
q("Are there country-conditions concerns (violence, persecution, instability) that would create hardship or danger if the Applicant returned, even temporarily, for CP?", f"{EE8}; {AA10}")
q("Is the Applicant's home country subject to Presidential Proclamation 10949 (entry-restriction list) or otherwise lacking functioning U.S. consular services, making CP impractical or impossible?", PM)
sub("Humanitarian-Based Status / Entry")
q("Did the Applicant enter or obtain status through humanitarian parole, asylum, U/T visa, VAWA self-petition, SIJS, or similar humanitarian classification?", EE8)
q("Has the Applicant already been granted any other form of humanitarian relief (e.g., DACA, TPS, withholding) relevant to the AOS analysis?", EE8)

# 4. IMMIGRATION STATUS AND HISTORY
section("4. IMMIGRATION STATUS & HISTORY")
sub("Length & Lawfulness of U.S. Residence")
q("How long has the Applicant resided in the U.S.? (Note: residence must have been substantially lawful to be treated as a positive factor.)", f"{EE8}; {PM}")
q("Has the Applicant maintained lawful nonimmigrant status continuously, or were there gaps / periods of unlawful presence?", EE8)
sub("Manner & Intent of Entry")
q("How did the Applicant last enter the U.S. (visa category, parole, EWI)? Was it a 'dual intent' category (e.g., H-1B, L-1) or a single-intent category (e.g., B-2, F-1, J-1)?", f"{PM}; {AA10}")
q("What did the Applicant represent to CBP/consular officials about their intent at the time of the visa application and/or admission?", f"{PM}; {AA10}")
q("Is there any indication the Applicant obtained the visa or admission with a pre-existing intent to remain permanently and adjust status, inconsistent with the visa category sought (pre-conceived intent)?", f"{PM}; {AA10}")
sub("Decision to Pursue AOS Rather Than CP")
q("When and why did the Applicant decide to seek adjustment rather than return home for an immigrant visa interview?", PM)
q("Is consular processing realistically available in the Applicant's home country for this visa category (processing times, post operations)?", PM)
q("Did anything occur after admission (marriage, birth of child, employer sponsorship, change in country conditions) that changed the Applicant's plans and now supports AOS?", AA10)
sub("Immigration Law Violations")
q("Did the Applicant ever overstay the period authorized on Form I-94?", f"{PM}; {EE8}")
q("Did the Applicant engage in unauthorized employment or unauthorized study?", f"{PM}; {EE8}")
q("Is the Applicant subject to (or has the Applicant triggered) any 3-year, 10-year, or permanent unlawful-presence bar under INA §212(a)(9)?", EE8)
q("Has the Applicant ever made a false claim to U.S. citizenship, registered to vote, or voted unlawfully in the U.S.?", f"{PM}; {GMC}")
q("Has the Applicant ever provided false or fraudulent testimony or documents to USCIS, a consular officer, CBP, or any other government agency?", f"{PM}; {EE8}")
q("Has the Applicant engaged in conduct after admission that is inconsistent with representations made when applying for the visa, admission, or parole — and was failure to depart something that could have been avoided through consular processing? (PM-602-0199 treats this combination as a 'highly relevant' / particularly significant negative factor.)", PM)
q("Has the Applicant ever been placed in removal/deportation proceedings, ordered removed, or subject to a final order (executed or unexecuted)?", f"{EE8}; {AA10}")
q("Has the Applicant disclosed all prior visa applications, denials, and any other identities/aliases used? Is identity well-established by the record?", EE8)
q("Has the Applicant obtained, or does the Applicant need, a waiver of any inadmissibility ground tied to the above violations?", EE8)

# 5. EMPLOYMENT, EDUCATION & FINANCIAL RESPONSIBILITY
section("5. EMPLOYMENT, EDUCATION & FINANCIAL RESPONSIBILITY")
sub("Employment & Skills")
q("What is the Applicant's current and prior employment? Does the position require specialized skills, or is the occupation in a U.S. labor-shortage field?", CILA)
q("Does the Applicant have a stable employment history, or significant gaps in employment (and if so, why — layoff, disability, caregiving)?", CILA)
q("Does the Applicant have an approved labor certification, immigrant petition, or other evidence of economic benefit to the U.S.?", CILA)
sub("Education")
q("What is the Applicant's highest level of education completed (U.S. or abroad)? Does it align with a U.S. workforce need?", CILA)
q("Has the Applicant pursued additional training, licensure, or certification that benefits the U.S. labor market?", CILA)
sub("Financial Responsibility & Tax Compliance")
q("Has the Applicant filed and paid all required federal, state, and local taxes?", f"{GMC}; {CILA}")
q("Does the Applicant have significant outstanding debts, judgments, or unpaid obligations (e.g., child support, SSI overpayment)?", GMC)
q("Does the Applicant own property, maintain investments, or have other financial ties to the U.S.?", CILA)
q("Does the Applicant derive income from any activity that is illegal under federal law (e.g., controlled-substance-related business, even if state-legal; prostitution; illegal gambling)?", f"{GMC}; {CILA}")

# 6. GOOD MORAL CHARACTER / COMMUNITY STANDING
section("6. GOOD MORAL CHARACTER & COMMUNITY STANDING")
sub("Overall GMC")
q("Considering the totality of the record, is there an absence of significant unfavorable factors, with affirmative evidence of good moral character (GMC)?", f"{EE8}; {GMC}")
sub("Criminal History")
q("Does the Applicant have any felony convictions? Any conviction that is a permanent bar to GMC (murder, aggravated felony, torture, genocide, severe violations of religious freedom)?", GMC)
q("Does the Applicant have any conditional-bar offenses (controlled substance violations, two or more offenses with aggregate sentence ≥5 years, prostitution-related offenses, etc.)?", GMC)
q("Does the Applicant have any crimes involving moral turpitude (CIMTs)?", f"{EE8}; {GMC}")
q("Does the Applicant have a DUI/DWI history, or a pattern of reckless or habitual traffic violations?", f"{PM}; {GMC}")
q("Does the Applicant have any record of harassment, aggressive solicitation, or intimidating conduct?", PM)
q("Does the Applicant have juvenile delinquency history, and if so, how is it treated under the applicable standard?", GMC)
sub("Anti-American / Extremism-Related Conduct")
q("Is there any evidence the Applicant has expressed anti-American or antisemitic views, or supported terrorism or terrorist organizations? (PM-602-0188 treats this as an overwhelmingly negative factor that cannot be outweighed by positive factors.)", GMC)
sub("Rehabilitation & Reformation (Mitigating Evidence)")
q("If there is adverse history, has the Applicant demonstrated genuine rehabilitation — e.g., completion of probation/court conditions, payment of overdue child support or taxes, repayment of SSI overpayments?", GMC)
q("Has the Applicant obtained community testimony or letters attesting to rehabilitation, good character, and present conduct?", GMC)
q("How much time has elapsed since the conduct at issue, and what is the Applicant's record since that time?", GMC)

# 7. OTHER / NATIONAL SECURITY / MISCELLANEOUS
section("7. OTHER DISCRETIONARY CONSIDERATIONS")
sub("Other")
q("Are there any national-security, public-safety, or fraud-referral flags in the record (e.g., FDNS referral, prior NOID/RFE on credibility grounds)?", AA10)
q("Has the Applicant previously been denied AOS, had a prior petition revoked, or received an RFE/NOID raising discretionary concerns? How were those addressed?", AA10)
q("Are there any other extraordinary equities not captured above (e.g., long-term tax-paying resident, U.S. military family ties, significant medical caregiving, etc.)?", CILA)
q("Overall, does the totality of the circumstances — weighing all positive and negative factors above — establish, by a preponderance of the evidence, that a favorable exercise of discretion is warranted?", f"{PM}; {EE8}")

# ---- Write data rows ----
DATA_START = row
for item in data:
    if item[0] == "section":
        ws.merge_cells(f"A{row}:G{row}")
        c = ws.cell(row=row, column=1, value=item[1])
        c.font = SECTION_FONT
        c.fill = SECTION_FILL
        c.alignment = Alignment(horizontal="left", vertical="center")
        ws.row_dimensions[row].height = 20
        current_section = item[1]
        row += 1
    elif item[0] == "sub":
        ws.merge_cells(f"A{row}:B{row}")
        c = ws.cell(row=row, column=1, value=item[1])
        c.font = SUBSECTION_FONT
        c.fill = SUBSECTION_FILL
        c.alignment = WRAP
        for col in range(3, 8):
            ws.cell(row=row, column=col).fill = SUBSECTION_FILL
        ws.row_dimensions[row].height = 18
        current_sub = item[1]
        row += 1
    else:  # question
        _, question, source = item
        ws.cell(row=row, column=1, value=current_section).font = NOTE_FONT
        ws.cell(row=row, column=2, value=current_sub).font = NOTE_FONT
        c = ws.cell(row=row, column=3, value=question)
        c.font = QUESTION_FONT
        c.alignment = WRAP
        ws.cell(row=row, column=4).alignment = WRAP
        ws.cell(row=row, column=6).alignment = WRAP
        c = ws.cell(row=row, column=5, value="")
        c.alignment = WRAP_CENTER
        c = ws.cell(row=row, column=7, value=source)
        c.font = NOTE_FONT
        c.alignment = WRAP
        for col in range(1, 8):
            ws.cell(row=row, column=col).border = BORDER
        ws.row_dimensions[row].height = 42
        row += 1

DATA_END = row - 1

# ---- Data validation for "Favors" column ----
dv = DataValidation(type="list", formula1='"Positive,Negative,Neutral,N/A"', allow_blank=True, showDropDown=False)
ws.add_data_validation(dv)
dv.add(f"E{DATA_START}:E{DATA_END}")

# Conditional formatting via simple formula-based fills is complex with openpyxl across many cells;
# instead apply manual fill using a helper note + leave cells colorable by user selection.
from openpyxl.formatting.rule import CellIsRule
pos_rule = CellIsRule(operator="equal", formula=['"Positive"'], fill=POS_FILL)
neg_rule = CellIsRule(operator="equal", formula=['"Negative"'], fill=NEG_FILL)
neu_rule = CellIsRule(operator="equal", formula=['"Neutral"'], fill=NEU_FILL)
na_rule = CellIsRule(operator="equal", formula=['"N/A"'], fill=NEU_FILL)
rng = f"E{DATA_START}:E{DATA_END}"
ws.conditional_formatting.add(rng, pos_rule)
ws.conditional_formatting.add(rng, neg_rule)
ws.conditional_formatting.add(rng, neu_rule)
ws.conditional_formatting.add(rng, na_rule)

# ---- Summary formulas ----
ws.cell(row=pos_count_row, column=2, value=f'=COUNTIF(E{DATA_START}:E{DATA_END},"Positive")')
ws.cell(row=neg_count_row, column=2, value=f'=COUNTIF(E{DATA_START}:E{DATA_END},"Negative")')
ws.cell(row=neu_count_row, column=2, value=f'=COUNTIF(E{DATA_START}:E{DATA_END},"Neutral")+COUNTIF(E{DATA_START}:E{DATA_END},"N/A")')

# Freeze panes below headers
ws.freeze_panes = f"A{HEADER_ROW_1 + 1}"

# ---- Second sheet: Legal Framework Quick Reference ----
ws2 = wb.create_sheet("Legal Framework Reference")
ws2.column_dimensions["A"].width = 38
ws2.column_dimensions["B"].width = 90
ref_rows = [
    ("Source", "Key Point"),
    ("PM-602-0199 (5/21/2026)", "Adjustment of status is a discretionary form of relief and an 'administrative grace' / extraordinary relief allowing applicants to dispense with the ordinary immigrant-visa process abroad. Applicants bear the burden of establishing both statutory eligibility AND that a favorable exercise of discretion is warranted under the totality of the circumstances, by a preponderance of the evidence."),
    ("INA §245(a) / 8 U.S.C. §1255(a)", "Statutory basis for AOS; eligibility requires admissibility, visa availability, and that the application is filed in compliance with the statute and regulations."),
    ("INA §103(a)(3) / 8 U.S.C. §1103(a)", "Source of the Secretary's general discretionary authority over the administration of the immigration laws, including AOS adjudications."),
    ("1 USCIS-PM E.8 (Discretionary Analysis)", "General policy chapter describing how USCIS weighs positive and negative discretionary factors across benefit types, including AOS."),
    ("7 USCIS-PM A.10 (Legal Analysis and Use of Discretion)", "AOS-specific chapter on the legal analysis underlying discretion, including the relevance of manner of entry, intent, and conduct after admission."),
    ("PM-602-0188 / 'GMC Memo' (8/15/2025)", "Restores a rigorous, holistic GMC evaluation standard; identifies anti-American/anti-Western and antisemitic views or support for terrorism as overwhelmingly negative factors that cannot be outweighed by positive equities; recognizes rehabilitation evidence (paying overdue child support/taxes, SSI repayment, probation compliance, community testimony) as mitigating."),
    ("Highly relevant negative factor (PM-602-0199)", "Conduct after admission inconsistent with representations made when applying for the visa/admission/parole, COMBINED with the fact that the failure to depart could have been avoided through consular processing — treated as particularly significant."),
    ("Presidential Proclamation 10949 (6/4/2025)", "19-country entry-restriction list; relevant to whether consular processing is realistically 'available' for purposes of the AOS-vs-CP discretionary analysis."),
    ("Matter of Arai, 13 I&N Dec. 494 (BIA 1970)", "Establishes that favorable factors (e.g., family ties, length of residence, hardship) are weighed against adverse factors (immigration violations, criminal record, character) in discretionary adjudications."),
    ("Matter of Marin, 16 I&N Dec. 581 (BIA 1978)", "Adverse factors must be examined as part of the discretionary balancing; significant violations weigh heavily against favorable exercise."),
    ("Matter of Blas, 15 I&N Dec. 626 (BIA 1974, A.G. 1976)", "Marriage fraud and similar conduct are significant adverse factors in discretionary analysis."),
    ("Matter of Buscemi, 19 I&N Dec. 628 (BIA 1988)", "Outlines unfavorable factors including circumvention of orderly refugee/immigration procedures."),
    ("Matter of Edwards, 20 I&N Dec. 191 (BIA 1990)", "Reaffirms the balancing-of-factors approach to discretionary relief and the weight given to rehabilitation."),
    ("Matter of Mendez-Morales, 21 I&N Dec. 296 (BIA 1996)", "Unlawful entry and immigration violations weigh against favorable exercise but can be outweighed by strong equities."),
    ("Matter of Cavazos, 17 I&N Dec. 215 (BIA 1980) / Matter of Ibrahim, 18 I&N Dec. 55 (BIA 1981)", "Address weight of family ties and hardship as positive equities in discretionary relief."),
    ("Matter of Castillo-Perez, 27 I&N Dec. 664 (BIA 2019)", "DUI convictions and unlawful conduct are significant negative factors in GMC/discretionary determinations, even absent a conviction in some circumstances."),
    ("Matter of Marquez, 18 I&N Dec. 168 (BIA 1981)", "Discusses the balancing test and burden on the applicant to establish discretion warrants relief."),
    ("Patel v. Garland, 596 U.S. 328 (2022)", "Confirms the discretionary nature of certain immigration determinations and limits on judicial review of factual findings underlying discretionary denials."),
    ("Right to Counsel — APA 5 U.S.C. §555(b); 8 CFR §292.5(b)", "Applicant entitled to representation at AOS interviews; counsel should be prepared to address discretion directly given heightened post-PM-602-0199 scrutiny."),
]
for r, (a, b) in enumerate(ref_rows, start=1):
    ca = ws2.cell(row=r, column=1, value=a)
    cb = ws2.cell(row=r, column=2, value=b)
    if r == 1:
        ca.font = HEADER_FONT
        cb.font = HEADER_FONT
        ca.fill = HEADER_FILL
        cb.fill = HEADER_FILL
    else:
        ca.font = Font(name="Arial", size=10, bold=True)
        cb.font = Font(name="Arial", size=10)
    ca.alignment = WRAP
    cb.alignment = WRAP
    ca.border = BORDER
    cb.border = BORDER
    ws2.row_dimensions[r].height = 45
ws2.freeze_panes = "A2"

wb.save(_OUTPUT)
print("saved", _OUTPUT)
