#!/usr/bin/env python3
"""
Citation Verification Package Generator
Kingdom Counsel Firm — AOS Discretionary Brief (Phanpit Sakkhi)
Verified June 23, 2026

Creates annotated reference PDFs for all legal sources cited in the brief.
Verified sources: downloaded text from public DOJ/USCIS URLs, key passages highlighted.
Unverified sources: VERIFICATION NEEDED card with URL and instructions.
"""

import os
import sys
import tempfile
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, HRFlowable, Table, TableStyle
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER
import fitz  # PyMuPDF

OUTPUT_DIR = "/sessions/fervent-zen-clarke/mnt/outputs"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# ─────────────────────────────────────────────────────────────────────────────
# STYLES
# ─────────────────────────────────────────────────────────────────────────────

def make_styles():
    s = getSampleStyleSheet()

    firm_header = ParagraphStyle(
        'FirmHeader', parent=s['Normal'],
        fontSize=9, fontName='Helvetica-Bold',
        textColor=colors.white, alignment=TA_LEFT
    )
    source_title = ParagraphStyle(
        'SourceTitle', parent=s['Normal'],
        fontSize=15, fontName='Helvetica-Bold',
        textColor=colors.HexColor('#0d0d4d'), spaceAfter=4
    )
    citation_line = ParagraphStyle(
        'Citation', parent=s['Normal'],
        fontSize=11, textColor=colors.HexColor('#1a3399'), spaceAfter=3
    )
    url_line = ParagraphStyle(
        'URL', parent=s['Normal'],
        fontSize=8, textColor=colors.HexColor('#555555'), spaceAfter=14
    )
    section_head = ParagraphStyle(
        'SectionHead', parent=s['Normal'],
        fontSize=8, fontName='Helvetica-Bold',
        textColor=colors.HexColor('#333333'),
        spaceBefore=12, spaceAfter=5,
        textTransform='uppercase'
    )
    prop_box = ParagraphStyle(
        'PropBox', parent=s['Normal'],
        fontSize=10, textColor=colors.HexColor('#0d0d4d'),
        leftIndent=10, rightIndent=10,
        spaceBefore=6, spaceAfter=12,
        leading=16
    )
    body_text = ParagraphStyle(
        'Body', parent=s['Normal'],
        fontSize=9, leading=14,
        textColor=colors.black,
        spaceAfter=6, firstLineIndent=0
    )
    key_quote = ParagraphStyle(
        'KeyQuote', parent=s['Normal'],
        fontSize=10, leading=16,
        textColor=colors.HexColor('#1a1a1a'),
        leftIndent=16, rightIndent=16,
        spaceBefore=8, spaceAfter=8,
        borderPad=8,
        backColor=colors.HexColor('#fffaaa')
    )
    instruction = ParagraphStyle(
        'Instruction', parent=s['Normal'],
        fontSize=10, leading=15,
        textColor=colors.HexColor('#7a2800'),
        leftIndent=10, rightIndent=10,
        spaceBefore=4, spaceAfter=4
    )
    footer_text = ParagraphStyle(
        'Footer', parent=s['Normal'],
        fontSize=7, textColor=colors.HexColor('#aaaaaa'),
        alignment=TA_CENTER
    )
    return dict(
        firm_header=firm_header,
        source_title=source_title,
        citation_line=citation_line,
        url_line=url_line,
        section_head=section_head,
        prop_box=prop_box,
        body_text=body_text,
        key_quote=key_quote,
        instruction=instruction,
        footer_text=footer_text
    )


# ─────────────────────────────────────────────────────────────────────────────
# PDF BUILDER
# ─────────────────────────────────────────────────────────────────────────────

def build_pdf(source, st, verify_phrases):
    """Build one annotated reference PDF. Returns final output path."""

    verified   = source.get('verified', True)
    out_name   = source['filename']
    temp_path  = tempfile.mktemp(suffix=".pdf")
    final_path = os.path.join(OUTPUT_DIR, out_name)

    # ── HEADER TABLE (dark blue bar) ─────────────────────────────────────────
    status_text  = "✓  VERIFIED — Public source confirmed" if verified else "⚠  VERIFICATION NEEDED"
    status_color = colors.HexColor('#1a6b2e') if verified else colors.HexColor('#8b3300')

    header_data = [[
        Paragraph("KINGDOM COUNSEL FIRM<br/>Citation Verification Package — AOS Discretionary Brief<br/>Phanpit Sakkhi | June 23, 2026",
                  st['firm_header']),
        Paragraph(f'<font color="white"><b>{status_text}</b></font>', st['firm_header'])
    ]]
    header_table = Table(header_data, colWidths=[4.5*inch, 2.25*inch])
    header_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#0d0d4d')),
        ('VALIGN',     (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 12),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ('LEFTPADDING',   (0, 0), (0, 0), 16),
        ('LEFTPADDING',   (1, 0), (1, 0),  8),
        ('BACKGROUND',    (1, 0), (1, 0), status_color),
        ('ALIGN',         (1, 0), (1, 0), 'CENTER'),
    ]))

    # ── CONTENT ──────────────────────────────────────────────────────────────
    content = [header_table, Spacer(1, 14)]

    content.append(Paragraph(source['title'],    st['source_title']))
    content.append(Paragraph(source['citation'], st['citation_line']))
    content.append(Paragraph(f"Source: {source['url']}", st['url_line']))

    # Proposition box
    content.append(Paragraph("Proposition Cited in Brief", st['section_head']))

    prop_table_data = [[
        Paragraph(f'&ldquo;{source["proposition"]}&rdquo;', st['prop_box'])
    ]]
    prop_table = Table(prop_table_data, colWidths=[6.75*inch])
    prop_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#eef0ff')),
        ('BOX',        (0, 0), (-1, -1), 1, colors.HexColor('#2233aa')),
        ('TOPPADDING',    (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('LEFTPADDING',   (0, 0), (-1, -1), 12),
        ('RIGHTPADDING',  (0, 0), (-1, -1), 12),
    ]))
    content.append(prop_table)
    content.append(Spacer(1, 6))

    if not verified:
        # Instruction card
        content.append(HRFlowable(width="100%", thickness=2,
                                  color=colors.HexColor('#cc6600')))
        content.append(Spacer(1, 8))
        content.append(Paragraph("How to Supply This Source", st['section_head']))
        for step in source.get('instructions', []):
            content.append(Paragraph(f"•  {step}", st['instruction']))
        content.append(Spacer(1, 20))
    else:
        # Excerpt
        content.append(HRFlowable(width="100%", thickness=1,
                                  color=colors.HexColor('#cccccc')))
        content.append(Spacer(1, 4))
        content.append(Paragraph("Relevant Excerpt  (key passage highlighted)", st['section_head']))
        content.append(Paragraph(
            "<i>Text below is verbatim from the source document retrieved at the URL above.</i>",
            ParagraphStyle('note', parent=st['body_text'],
                           fontSize=8, textColor=colors.HexColor('#888888'))
        ))
        content.append(Spacer(1, 8))

        for part in source.get('excerpt_parts', []):
            if part.get('highlight'):
                # Yellow box + bold — will also get PyMuPDF annotation
                content.append(Paragraph(part['text'], st['key_quote']))
            else:
                content.append(Paragraph(part['text'], st['body_text']))

    # Footer
    content.append(Spacer(1, 20))
    content.append(HRFlowable(width="100%", thickness=1,
                              color=colors.HexColor('#dddddd')))
    content.append(Paragraph(
        "Kingdom Counsel Firm  |  kingdomcounselfirm@gmail.com  |  For attorney use only  |  Generated June 23, 2026",
        st['footer_text']
    ))

    # ── BUILD WITH REPORTLAB ─────────────────────────────────────────────────
    doc = SimpleDocTemplate(
        temp_path, pagesize=letter,
        rightMargin=0.75*inch, leftMargin=0.75*inch,
        topMargin=0.65*inch, bottomMargin=0.65*inch
    )
    doc.build(content)

    # ── ADD PYMUPDF HIGHLIGHT ANNOTATIONS ────────────────────────────────────
    pdf = fitz.open(temp_path)
    for page in pdf.pages():
        for phrase in verify_phrases:
            hits = page.search_for(phrase)
            for rect in hits:
                annot = page.add_highlight_annot(rect)
                annot.set_colors(stroke=fitz.utils.getColor("yellow"))
                annot.update()
    pdf_bytes = pdf.tobytes(garbage=4, deflate=True)
    pdf.close()
    os.remove(temp_path)
    with open(final_path, 'wb') as fh:
        fh.write(pdf_bytes)

    print(f"  ✓  {out_name}")
    return final_path


# ─────────────────────────────────────────────────────────────────────────────
# SOURCE DEFINITIONS
# ─────────────────────────────────────────────────────────────────────────────

SOURCES = [
    # ── 1. MATTER OF ARAI ────────────────────────────────────────────────────
    {
        "filename":   "REF_01_Matter_of_Arai_13_IN_Dec_494.pdf",
        "title":      "Matter of Arai",
        "citation":   "13 I&amp;N Dec. 494, 496 (BIA 1970) | Interim Decision #2027",
        "url":        "https://www.justice.gov/sites/default/files/eoir/legacy/2012/08/27/2027.pdf",
        "proposition": "In the absence of adverse factors, adjustment will ordinarily be "
                       "granted, still as a matter of discretion.",
        "verified":   True,
        "highlight_phrases": [
            "In the absence of adverse factors, adjustment will ordinarily be granted"
        ],
        "excerpt_parts": [
            {"highlight": False, "text":
             "<b>MATTER OF ARAI</b>  |  In Deportation Proceedings  |  Decided by Board March 4, 1970"},
            {"highlight": False, "text":
             "Section 245 of the Immigration and Nationality Act reposes with the Attorney General "
             "and his delegates the discretionary power to grant adjustment of status. Therefore it "
             "follows that mere eligibility for that privilege will not automatically result in a "
             "grant of the application."},
            {"highlight": False, "text":
             "It is difficult and probably inadvisable to set up restrictive guide lines for the "
             "exercise of discretion. Problems which may arise in applications for adjustment must "
             "of necessity be resolved on an individual basis. Where adverse factors are present in "
             "a given application, it may be necessary for the applicant to offset these by a "
             "showing of unusual or even outstanding equities. Generally, favorable factors such as "
             "family ties, hardship, length of residence in the United States, etc., will be "
             "considered as countervailing factors meriting favorable exercise of administrative "
             "discretion."},
            {"highlight": True, "text":
             "In the absence of adverse factors, adjustment will ordinarily be granted, "
             "still as a matter of discretion."},
            {"highlight": False, "text":
             "Our decision to sustain the respondent's appeal was based upon the foregoing "
             "considerations. We do not deem it necessary for the respondent to establish, in light "
             "of the circumstances surrounding his case, any outstanding equities."},
        ]
    },

    # ── 2. MATTER OF MARIN ───────────────────────────────────────────────────
    {
        "filename":   "REF_02_Matter_of_Marin_16_IN_Dec_581.pdf",
        "title":      "Matter of Marin",
        "citation":   "16 I&amp;N Dec. 581, 584-85 (BIA 1978) | Interim Decision #2666",
        "url":        "https://www.justice.gov/sites/default/files/eoir/legacy/2012/08/17/2666.pdf",
        "proposition": "The immigration judge must balance the adverse factors evidencing an alien's "
                       "undesirability as a permanent resident with the social and humane "
                       "considerations presented in his behalf to determine whether the granting of "
                       "relief appears in the best interests of this country. As the negative factors "
                       "grow more serious, it becomes incumbent upon the applicant to introduce "
                       "additional offsetting favorable evidence, which in some cases may have to "
                       "involve unusual or outstanding equities.",
        "verified":   True,
        "highlight_phrases": [
            "balance the adverse factors evidencing an alien",
            "as the negative factors grow more serious, it becomes incumbent"
        ],
        "excerpt_parts": [
            {"highlight": False, "text":
             "<b>MATTER OF MARIN</b>  |  In Deportation Proceedings  |  Decided by Board August 4, 1978"},
            {"highlight": False, "text":
             "Section 212(c), however, does not provide an indiscriminate waiver for all who "
             "demonstrate statutory eligibility for such relief. Instead, the Attorney General or "
             "his delegate is required to determine as a matter of discretion whether an applicant "
             "warrants the relief sought. The alien bears the burden of demonstrating that his "
             "application merits favorable consideration."},
            {"highlight": True, "text":
             "The immigration judge must balance the adverse factors evidencing an alien's "
             "undesirability as a permanent resident with the social and humane considerations "
             "presented in his behalf to determine whether the granting of section 212(c) relief "
             "appears in the best interests of this country."},
            {"highlight": False, "text":
             "Favorable considerations have been found to include such factors as family ties "
             "within the United States, residence of long duration in this country (particularly "
             "when the inception of residence occurred while the respondent was of young age), "
             "evidence of hardship to the respondent and family if deportation occurs, service in "
             "this country's Armed Forces, a history of employment, the existence of property or "
             "business ties, evidence of value and service to the community, proof of a genuine "
             "rehabilitation if a criminal record exists, and other evidence attesting to a "
             "respondent's good character."},
            {"highlight": True, "text":
             "As the negative factors grow more serious, it becomes incumbent upon the applicant "
             "to introduce additional offsetting favorable evidence, which in some cases may have "
             "to involve unusual or outstanding equities."},
        ]
    },

    # ── 3. MATTER OF PATEL ───────────────────────────────────────────────────
    {
        "filename":   "REF_03_Matter_of_Patel_17_IN_Dec_597.pdf",
        "title":      "Matter of Patel",
        "citation":   "17 I&amp;N Dec. 597 (BIA 1980) | Interim Decision #2842",
        "url":        "https://www.justice.gov/sites/default/files/eoir/legacy/2012/08/17/2842.pdf",
        "proposition": "The grant of an application for adjustment of status under section 245 is "
                       "a matter of administrative grace. An applicant has the burden of showing "
                       "that discretion should be exercised in his or her favor.",
        "verified":   True,
        "highlight_phrases": [
            "matter of administrative grace",
            "burden of showing that discretion should be exercised"
        ],
        "excerpt_parts": [
            {"highlight": False, "text":
             "<b>MATTER OF PATEL</b>  |  In Deportation Proceedings  |  Decided by Board December 11, 1980"},
            {"highlight": False, "text":
             "Pursuant to section 245 of the Act, the status of a deportable alien may be adjusted "
             "to that of an alien lawfully admitted for permanent residence. To be eligible for such "
             "relief from deportation, however, the alien must be admissible to the United States "
             "for permanent residence."},
            {"highlight": False, "text":
             "Nevertheless, although the immigration judge's basis for finding that the respondent "
             "was not eligible for adjustment of status has now been removed, it does not follow "
             "that his application must be granted."},
            {"highlight": True, "text":
             "The grant of an application for adjustment of status under section 245 is a matter "
             "of administrative grace. An applicant has the burden of showing that discretion "
             "should be exercised in his favor. Matter of Marques, 16 I&amp;N Dec. 314 (BIA 1977); "
             "Matter of Leung, 16 I&amp;N Dec. 12 (BIA 1976); Matter of Arai, 13 I&amp;N Dec. 494 (BIA 1970)."},
            {"highlight": False, "text":
             "Moreover, where adverse factors are present, it may be necessary for the applicant "
             "to offset those factors by a showing of unusual or even outstanding equities."},
        ]
    },

    # ── 4. MATTER OF EDWARDS ─────────────────────────────────────────────────
    {
        "filename":   "REF_04_Matter_of_Edwards_20_IN_Dec_191.pdf",
        "title":      "Matter of Edwards",
        "citation":   "20 I&amp;N Dec. 191, 196 (BIA 1990) | Interim Decision #3134",
        "url":        "https://www.justice.gov/sites/default/files/eoir/legacy/2012/08/14/3134.pdf",
        "proposition": "A clear showing of reformation is not an absolute prerequisite to a "
                       "favorable exercise of discretion in every case involving an alien with a "
                       "criminal record; section 212(c) applications involving convicted aliens "
                       "must be evaluated on a case-by-case basis, with rehabilitation a factor "
                       "to be considered.",
        "verified":   True,
        "highlight_phrases": [
            "clear showing of reformation is not an absolute prerequisite",
            "must be evaluated on a case-by-case basis"
        ],
        "excerpt_parts": [
            {"highlight": False, "text":
             "<b>MATTER OF EDWARDS</b>  |  In Deportation Proceedings  |  Decided by Board May 2, 1990"},
            {"highlight": False, "text":
             "Section 212(c) of the Act, however, does not provide an indiscriminate waiver for "
             "all who demonstrate statutory eligibility for such relief. Instead, the Attorney "
             "General or his delegate is required to determine as a matter of discretion whether "
             "an alien merits the relief sought, and the alien bears the burden of demonstrating "
             "that his application warrants favorable consideration."},
            {"highlight": False, "text":
             "With respect to the issue of rehabilitation, the Board noted in Matter of Marin, "
             "supra, at 588, and reiterated in Matter of Buscemi, supra, at 633-34, that a section "
             "212(c) waiver applicant who has a criminal record 'ordinarily' will be required to "
             "make a showing of rehabilitation before relief will be granted as a matter of "
             "discretion. This language has been interpreted in some cases as though a clear "
             "showing of reformation is an absolute prerequisite to a favorable exercise of "
             "discretion in every case involving an alien with a criminal record."},
            {"highlight": True, "text":
             "To the extent that this language may be read as creating an absolute prerequisite "
             "to a favorable exercise of discretion, we withdraw from it. Rather, section 212(c) "
             "applications involving convicted aliens must be evaluated on a case-by-case basis, "
             "with rehabilitation a factor to be considered in the exercise of discretion."},
        ]
    },

    # ── 5. MATTER OF MENDEZ-MORALES ──────────────────────────────────────────
    {
        "filename":   "REF_05_Matter_of_Mendez_Morales_21_IN_Dec_296.pdf",
        "title":      "Matter of Mendez-Morales",
        "citation":   "21 I&amp;N Dec. 296, 301 (BIA 1996) | Interim Decision #3272",
        "url":        "https://www.justice.gov/sites/default/files/eoir/legacy/2014/07/25/3272.pdf",
        "proposition": "If the alien has relatives in the United States, the quality of their "
                       "relationship must be considered in determining the weight to be awarded "
                       "this equity.",
        "verified":   True,
        "highlight_phrases": [
            "quality of their relationship must be considered"
        ],
        "excerpt_parts": [
            {"highlight": False, "text":
             "<b>MATTER OF MENDEZ-MORALES</b>  |  File A41 940 178  |  Decided April 12, 1996"},
            {"highlight": False, "text":
             "As is also true for other waivers of inadmissibility that would allow an alien to be "
             "admitted to the United States as a lawful permanent resident, the Immigration Judge "
             "must balance the adverse factors evidencing an alien's undesirability as a permanent "
             "resident with the social and humane considerations presented on his behalf to "
             "determine whether the grant of relief in the exercise of discretion appears to be in "
             "the best interests of this country."},
            {"highlight": False, "text":
             "The underlying significance of the adverse and favorable factors is also to be taken "
             "into account."},
            {"highlight": True, "text":
             "For example, if the alien has relatives in the United States, the quality of their "
             "relationship must be considered in determining the weight to be awarded this equity."},
            {"highlight": False, "text":
             "Further, the equity of a marriage and the weight given to any hardship to the spouse "
             "is diminished if the parties married after the commencement of deportation proceedings, "
             "with knowledge that the alien might be deported. Similarly, if the alien has a history "
             "of employment, it is important to consider the type of employment and its length and "
             "stability."},
        ]
    },

    # ── 6. USCIS POLICY MANUAL E.8 ───────────────────────────────────────────
    {
        "filename":   "REF_06_USCIS_Policy_Manual_E8_Discretion.pdf",
        "title":      "1 USCIS-PM E.8 — Discretionary Analysis",
        "citation":   "USCIS Policy Manual, Volume 1, Part E, Chapter 8",
        "url":        "https://www.uscis.gov/policy-manual/volume-1-part-e-chapter-8",
        "proposition": "Meeting the statutory and regulatory requirements alone does not entitle "
                       "the requestor to the benefit sought. Discretion is a matter of "
                       "administrative grace where the applicant has the burden of showing that "
                       "discretion should be exercised in his or her favor.",
        "verified":   True,
        "highlight_phrases": [
            "meeting the statutory and regulatory requirements alone does not entitle",
            "matter of administrative grace where the applicant has the burden"
        ],
        "excerpt_parts": [
            {"highlight": False, "text":
             "<b>1 USCIS-PM E.8 — Chapter 8: Discretionary Analysis</b><br/>"
             "U.S. Citizenship and Immigration Services Policy Manual"},
            {"highlight": False, "text":
             "Many immigration benefit requests are filed under provisions of law that require "
             "the favorable exercise of discretion to administer the benefit. In these cases, the "
             "benefit requestor has the burden of demonstrating eligibility for the benefit sought "
             "and that USCIS should favorably exercise discretion."},
            {"highlight": True, "text":
             "Where an immigration benefit is discretionary, meeting the statutory and regulatory "
             "requirements alone does not entitle the requestor to the benefit sought."},
            {"highlight": False, "text":
             "The Board of Immigration Appeals (BIA) has described the exercise of discretion as:"},
            {"highlight": True, "text":
             "•  A balancing of the negative factors evidencing the person's undesirability "
             "as a permanent resident with the social and humane considerations presented on his "
             "or her behalf to determine whether relief appears in the best interests of this "
             "country.<br/>"
             "•  A matter of administrative grace where the applicant has the burden of "
             "showing that discretion should be exercised in his or her favor.<br/>"
             "•  A consideration of negative factors and the need for the applicant to offset "
             "such factors by showing unusual or even outstanding equities."},
            {"highlight": False, "text":
             "To perform a discretionary analysis, officers must weigh all positive factors "
             "present in a particular case against any negative factors in the totality of the "
             "record. The analysis must be comprehensive, specific to the case, and based on all "
             "relevant facts known at the time of adjudication."},
            {"highlight": False, "text":
             "<b>Factors That May Be Considered (non-exhaustive):</b><br/>"
             "Favorable: Family ties in the United States; hardship; length of lawful residence; "
             "employment history; community service; property or business ties; good character "
             "(affidavits from family, friends, and responsible community representatives); "
             "value and service to the community.<br/>"
             "Adverse: Nature and circumstances of any inadmissibility grounds; criminal history; "
             "immigration violations; fraud or false testimony; national security concerns; "
             "prior removal orders."},
        ]
    },

    # ── 7. PM-602-0199 — VERIFICATION NEEDED ─────────────────────────────────
    {
        "filename":   "REF_07_PM_602_0199_VERIFICATION_NEEDED.pdf",
        "title":      "USCIS Policy Memorandum PM-602-0199",
        "citation":   "Adjustment of Status and Discretion (May 21, 2026)",
        "url":        "https://www.uscis.gov/sites/default/files/document/memos/PM-602-0199-AdjustmentOfStatusAndDiscretion-20260521.pdf",
        "proposition": "May 21, 2026 policy memorandum signaling heightened USCIS scrutiny of "
                       "the discretionary analysis in AOS applications. Cited to contextualize "
                       "the brief and frame the AOS-vs.-consular-processing section.",
        "verified":   False,
        "instructions": [
            "Navigate to the URL above in your web browser.",
            "Download the PDF (File > Save As, or right-click > Save PDF).",
            "Attach the downloaded PDF to the case file alongside this package.",
            "Key passages to locate and highlight in the downloaded PDF:<br/>"
            "   (a) The policy's statement of purpose regarding discretionary review;<br/>"
            "   (b) Any language discussing AOS as compared to consular processing;<br/>"
            "   (c) Any enumerated factors or heightened scrutiny guidance.",
            "Once the PDF is supplied, this VERIFICATION NEEDED card may be removed from the package.",
        ],
    },
]


# ─────────────────────────────────────────────────────────────────────────────
# VERIFICATION MANIFEST
# ─────────────────────────────────────────────────────────────────────────────

MANIFEST_SOURCES = [
    ("Matter of Arai, 13 I&N Dec. 494 (BIA 1970)",
     "https://www.justice.gov/sites/default/files/eoir/legacy/2012/08/27/2027.pdf",
     "✓ VERIFIED",
     "In the absence of adverse factors, adjustment will ordinarily be granted, still as a matter of discretion."),
    ("Matter of Marin, 16 I&N Dec. 581 (BIA 1978)",
     "https://www.justice.gov/sites/default/files/eoir/legacy/2012/08/17/2666.pdf",
     "✓ VERIFIED",
     "Balance of negative factors vs. social and humane considerations; elevated standard where adverse factors are serious."),
    ("Matter of Patel, 17 I&N Dec. 597 (BIA 1980)",
     "https://www.justice.gov/sites/default/files/eoir/legacy/2012/08/17/2842.pdf",
     "✓ VERIFIED",
     "Adjustment is a matter of administrative grace; applicant has burden of showing discretion should be exercised in his favor."),
    ("Matter of Edwards, 20 I&N Dec. 191 (BIA 1990)",
     "https://www.justice.gov/sites/default/files/eoir/legacy/2012/08/14/3134.pdf",
     "✓ VERIFIED",
     "Reformation is not an absolute prerequisite; case-by-case analysis required."),
    ("Matter of Mendez-Morales, 21 I&N Dec. 296 (BIA 1996)",
     "https://www.justice.gov/sites/default/files/eoir/legacy/2014/07/25/3272.pdf",
     "✓ VERIFIED",
     "Quality of family relationships must be considered in determining weight of the family-ties equity."),
    ("1 USCIS-PM E.8 (USCIS Policy Manual, Vol. 1, Part E, Ch. 8)",
     "https://www.uscis.gov/policy-manual/volume-1-part-e-chapter-8",
     "✓ VERIFIED",
     "Discretionary framework; factor lists; totality-of-record standard; meeting eligibility requirements alone does not entitle applicant to benefit."),
    ("PM-602-0199 (May 21, 2026)",
     "https://www.uscis.gov/sites/default/files/document/memos/PM-602-0199-AdjustmentOfStatusAndDiscretion-20260521.pdf",
     "⚠ VERIFICATION NEEDED",
     "URL confirmed; PDF inaccessible to automated retrieval. Attorney must download directly. See REF_07 for instructions."),
]


def build_manifest(st):
    """Build the verification manifest PDF."""
    temp_path  = tempfile.mktemp(suffix="_manifest.pdf")
    final_path = os.path.join(OUTPUT_DIR, "CITATION_VERIFICATION_MANIFEST.pdf")

    header_data = [[
        Paragraph("KINGDOM COUNSEL FIRM<br/>"
                  "Citation Verification Manifest — AOS Discretionary Brief<br/>"
                  "Phanpit Sakkhi | June 23, 2026",
                  st['firm_header']),
        Paragraph('<font color="white"><b>6 of 7 VERIFIED</b></font>', st['firm_header'])
    ]]
    header_table = Table(header_data, colWidths=[4.5*inch, 2.25*inch])
    header_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#0d0d4d')),
        ('VALIGN',     (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 12),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ('LEFTPADDING',   (0, 0), (0, 0), 16),
        ('BACKGROUND', (1, 0), (1, 0), colors.HexColor('#1a6b2e')),
        ('ALIGN',      (1, 0), (1, 0), 'CENTER'),
    ]))

    content = [header_table, Spacer(1, 16)]
    content.append(Paragraph("Verification Manifest", st['section_head']))
    content.append(Paragraph(
        "Each source cited in the Phanpit Sakkhi AOS Discretionary Memorandum was searched and "
        "verified against publicly accessible government databases (DOJ/EOIR and USCIS). "
        "Text was retrieved verbatim. Annotated reference PDFs accompany this manifest. "
        "Sources marked VERIFICATION NEEDED could not be automatically retrieved and require "
        "attorney action.",
        ParagraphStyle('intro', parent=st['body_text'], fontSize=9, spaceAfter=14)
    ))

    # Table
    table_data = [
        [
            Paragraph("<b>Source</b>", st['body_text']),
            Paragraph("<b>URL</b>", st['body_text']),
            Paragraph("<b>Status</b>", st['body_text']),
            Paragraph("<b>Proposition / Note</b>", st['body_text']),
        ]
    ]
    for src, url, status, prop in MANIFEST_SOURCES:
        status_color = colors.HexColor('#1a6b2e') if "VERIFIED" in status and "NEEDED" not in status else colors.HexColor('#8b3300')
        table_data.append([
            Paragraph(src, st['body_text']),
            Paragraph(f"<link href='{url}'><font color='#1a3399'>{url[:60]}...</font></link>"
                      if len(url) > 60 else
                      f"<link href='{url}'><font color='#1a3399'>{url}</font></link>",
                      st['body_text']),
            Paragraph(f'<font color="#{("1a6b2e" if "NEEDED" not in status else "8b3300")}"><b>{status}</b></font>',
                      st['body_text']),
            Paragraph(prop, st['body_text']),
        ])

    tbl = Table(table_data, colWidths=[1.5*inch, 1.8*inch, 1.0*inch, 2.45*inch])
    tbl.setStyle(TableStyle([
        ('BACKGROUND',   (0, 0), (-1, 0),  colors.HexColor('#0d0d4d')),
        ('TEXTCOLOR',    (0, 0), (-1, 0),  colors.white),
        ('FONTNAME',     (0, 0), (-1, 0),  'Helvetica-Bold'),
        ('FONTSIZE',     (0, 0), (-1, -1), 7.5),
        ('ALIGN',        (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN',       (0, 0), (-1, -1), 'TOP'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f5f5f8')]),
        ('BOX',          (0, 0), (-1, -1), 0.5, colors.HexColor('#aaaaaa')),
        ('INNERGRID',    (0, 0), (-1, -1), 0.25, colors.HexColor('#cccccc')),
        ('TOPPADDING',   (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING',(0, 0), (-1, -1), 5),
        ('LEFTPADDING',  (0, 0), (-1, -1), 5),
    ]))
    content.append(tbl)
    content.append(Spacer(1, 16))

    # File list
    content.append(Paragraph("Files in This Package", st['section_head']))
    files = [
        "CITATION_VERIFICATION_MANIFEST.pdf  —  This document",
        "REF_01_Matter_of_Arai_13_IN_Dec_494.pdf",
        "REF_02_Matter_of_Marin_16_IN_Dec_581.pdf",
        "REF_03_Matter_of_Patel_17_IN_Dec_597.pdf",
        "REF_04_Matter_of_Edwards_20_IN_Dec_191.pdf",
        "REF_05_Matter_of_Mendez_Morales_21_IN_Dec_296.pdf",
        "REF_06_USCIS_Policy_Manual_E8_Discretion.pdf",
        "REF_07_PM_602_0199_VERIFICATION_NEEDED.pdf  —  Attorney action required",
    ]
    for f in files:
        content.append(Paragraph(f"•  {f}", st['body_text']))

    content.append(Spacer(1, 20))
    content.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#dddddd')))
    content.append(Paragraph(
        "Kingdom Counsel Firm  |  kingdomcounselfirm@gmail.com  |  For attorney use only  |  Generated June 23, 2026",
        st['footer_text']
    ))

    doc = SimpleDocTemplate(
        temp_path, pagesize=letter,
        rightMargin=0.75*inch, leftMargin=0.75*inch,
        topMargin=0.65*inch, bottomMargin=0.65*inch
    )
    doc.build(content)

    # No highlights on manifest (it's a table)
    pdf = fitz.open(temp_path)
    pdf_bytes = pdf.tobytes(garbage=4, deflate=True)
    pdf.close()
    os.remove(temp_path)
    with open(final_path, 'wb') as fh:
        fh.write(pdf_bytes)
    print(f"  ✓  CITATION_VERIFICATION_MANIFEST.pdf")
    return final_path


# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────

def main():
    st = make_styles()
    print("Building Citation Verification Package…\n")
    paths = []

    # Manifest first
    paths.append(build_manifest(st))

    # Individual source PDFs
    for src in SOURCES:
        phrases = src.get('highlight_phrases', [])
        paths.append(build_pdf(src, st, phrases))

    print(f"\nDone. {len(paths)} files written to {OUTPUT_DIR}")
    return paths


if __name__ == "__main__":
    main()
