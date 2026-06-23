const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, AlignmentType, LevelFormat,
  HeadingLevel, PageNumber, Header, Footer, BorderStyle, PageBreak, TabStopType, TabStopPosition
} = require("docx");

const FONT = "Times New Roman";

const styles = {
  default: { document: { run: { font: FONT, size: 24 } } }, // 12pt
  paragraphStyles: [
    { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
      run: { size: 26, bold: true, font: FONT, allCaps: true },
      paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 0 } },
    { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
      run: { size: 24, bold: true, italics: false, font: FONT },
      paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 1 } },
    { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
      run: { size: 24, bold: false, italics: true, font: FONT },
      paragraph: { spacing: { before: 160, after: 80 }, outlineLevel: 2 } },
  ],
};

const numbering = {
  config: [
    { reference: "bullets",
      levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    { reference: "roman-args",
      levels: [{ level: 0, format: LevelFormat.UPPER_ROMAN, text: "%1.", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
  ],
};

const P = (text, opts = {}) => new Paragraph({
  spacing: { after: 160, line: 360 },
  alignment: AlignmentType.JUSTIFIED,
  ...opts,
  children: [new TextRun({ text, font: FONT, size: 24, ...((opts.runOpts) || {}) })],
});

const Bracket = (text) => new TextRun({ text, font: FONT, size: 24, italics: true, color: "C00000" });

const Bullet = (children) => new Paragraph({
  numbering: { reference: "bullets", level: 0 },
  spacing: { after: 80, line: 300 },
  children,
});

const PMix = (parts, opts = {}) => new Paragraph({
  spacing: { after: 160, line: 360 },
  alignment: AlignmentType.JUSTIFIED,
  ...opts,
  children: parts.map(p => typeof p === "string"
    ? new TextRun({ text: p, font: FONT, size: 24 })
    : p),
});

const H1 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text, font: FONT, size: 26, bold: true })] });
const H2 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text, font: FONT, size: 24, bold: true })] });
const H3 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun({ text, font: FONT, size: 24, italics: true })] });

const CenterBold = (text, size = 24) => new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { after: 120 },
  children: [new TextRun({ text, font: FONT, size, bold: true })],
});

const Rule = () => new Paragraph({
  spacing: { after: 200 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "999999", space: 1 } },
  children: [new TextRun({ text: "", font: FONT, size: 2 })],
});

const children = [];

// ---------------- CAPTION / TITLE BLOCK ----------------
children.push(
  CenterBold("DISCRETIONARY FACTORS MEMORANDUM", 28),
  CenterBold("IN SUPPORT OF APPLICATION FOR ADJUSTMENT OF STATUS (FORM I-485)"),
  new Paragraph({ spacing: { after: 40 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "Submitted Pursuant to ", font: FONT, size: 22 }), new TextRun({ text: "INA § 245(a)", font: FONT, size: 22, bold: true }), new TextRun({ text: " and USCIS Policy Memorandum PM-602-0199 (May 21, 2026)", font: FONT, size: 22 })] }),
  Rule(),
  new Paragraph({ spacing: { after: 40 },
    children: [new TextRun({ text: "Re: ", bold: true, font: FONT, size: 24 }), Bracket("[Applicant Full Legal Name]"), new TextRun({ text: " — A# ", font: FONT, size: 24 }), Bracket("[A-Number]")] }),
  new Paragraph({ spacing: { after: 40 },
    children: [new TextRun({ text: "Form I-485 Receipt No.: ", bold: true, font: FONT, size: 24 }), Bracket("[Receipt Number]")] }),
  new Paragraph({ spacing: { after: 40 },
    children: [new TextRun({ text: "Underlying Petition / Category: ", bold: true, font: FONT, size: 24 }), Bracket("[e.g., I-130 (Immediate Relative), I-140 (EB-2/EB-3), I-589-based AOS, etc.]")] }),
  new Paragraph({ spacing: { after: 200 },
    children: [new TextRun({ text: "Date: ", bold: true, font: FONT, size: 24 }), Bracket("[Date]")] }),
);

// ---------------- I. INTRODUCTION ----------------
children.push(H1("I. Introduction and Purpose of This Memorandum"));
children.push(P(
  "This memorandum is submitted in support of the Form I-485, Application to Register Permanent Residence or Adjust Status, " +
  "filed on behalf of [Applicant Full Legal Name] (“the Applicant”). Its purpose is to provide the adjudicating officer with " +
  "a clear, well-documented record addressing the discretionary component of the adjustment-of-status determination, " +
  "consistent with U.S. Citizenship and Immigration Services (“USCIS”) Policy Memorandum PM-602-0199, " +
  "“Adjustment of Status is a Matter of Discretion and an Administrative Grace, and an Extraordinary Relief that Permits " +
  "Applicants to Dispense with the Ordinary Consular Visa Process” (May 21, 2026)."
));
children.push(P(
  "As set forth below, the Applicant has established (1) statutory and regulatory eligibility for adjustment of status, and " +
  "(2) that the totality of the circumstances — including the Applicant’s family ties, immigration history, community " +
  "involvement, good moral character, and other equities — demonstrates by a preponderance of the evidence that a favorable " +
  "exercise of discretion is warranted. This memorandum is organized to track the discretionary factors identified in " +
  "PM-602-0199, USCIS Policy Manual Volume 1, Part E, Chapter 8 (Discretionary Analysis), and USCIS Policy Manual Volume 7, " +
  "Part A, Chapter 10 (Legal Analysis and Use of Discretion), so that the record affirmatively addresses discretion rather " +
  "than leaving it to be inferred."
));

// ---------------- II. LEGAL STANDARD ----------------
children.push(H1("II. Legal Standard Governing the Exercise of Discretion in Adjustment Proceedings"));

children.push(H2("A. Statutory and Regulatory Framework"));
children.push(P(
  "Adjustment of status under INA § 245(a), 8 U.S.C. § 1255(a), is a discretionary form of relief. An applicant must " +
  "establish: (1) that he or she has been inspected and admitted or paroled into the United States; (2) that he or she " +
  "is eligible to receive an immigrant visa and is admissible to the United States for permanent residence; and " +
  "(3) that an immigrant visa is immediately available at the time the application is filed. Even where these statutory " +
  "elements are satisfied, the Secretary of Homeland Security retains discretion to grant or deny the application under " +
  "INA § 103(a)(3), 8 U.S.C. § 1103(a). See Patel v. Garland, 596 U.S. 328 (2022) (confirming the discretionary nature " +
  "of adjustment determinations)."
));

children.push(H2("B. The Totality-of-the-Circumstances Standard Under PM-602-0199"));
children.push(P(
  "PM-602-0199 reaffirms that “adjustment of status is a matter of discretion and an administrative grace” — an " +
  "extraordinary form of relief that permits an otherwise-eligible applicant to dispense with the ordinary process of " +
  "obtaining an immigrant visa through consular processing abroad. Because adjustment is characterized as extraordinary " +
  "relief rather than an entitlement, the burden remains on the Applicant to establish, by a preponderance of the evidence, " +
  "that the totality of the circumstances supports a favorable exercise of discretion. See 1 USCIS-PM E.8; 7 USCIS-PM A.10."
));
children.push(P(
  "Consistent with longstanding Board of Immigration Appeals precedent, adjudicators weigh favorable factors against " +
  "adverse factors on a case-by-case basis. See Matter of Arai, 13 I&N Dec. 494, 496 (BIA 1970) (positive factors such as " +
  "family ties, length of residence, and hardship are weighed against adverse factors such as immigration violations and " +
  "criminal history); Matter of Marin, 16 I&N Dec. 581 (BIA 1978); Matter of Edwards, 20 I&N Dec. 191 (BIA 1990) " +
  "(rehabilitation and the passage of time may mitigate prior adverse conduct); Matter of Mendez-Morales, 21 I&N Dec. 296 " +
  "(BIA 1996) (immigration violations may be outweighed by strong countervailing equities). The favorable factors " +
  "documented in Section IV below, considered together with the absence of any disqualifying adverse factors, satisfy " +
  "this standard."
));

children.push(H2("C. Adjustment of Status — Rather Than Consular Processing — Is Appropriate in This Case"));
children.push(P(
  "PM-602-0199 directs adjudicators to consider why an applicant has sought to “dispense with the ordinary consular " +
  "visa process” through adjustment of status. The Applicant respectfully submits that adjustment of status is the " +
  "appropriate and reasonable course in this case for the following reasons:"
));
children.push(Bullet([
  new TextRun({ text: "Manner and intent of entry: ", bold: true, font: FONT, size: 24 }),
  new TextRun({ text: "The Applicant last entered the United States ", font: FONT, size: 24 }),
  Bracket("[describe visa category / admission, and explain that the Applicant did not misrepresent intent at the time of admission]"),
  new TextRun({ text: ".", font: FONT, size: 24 }),
]));
children.push(Bullet([
  new TextRun({ text: "Change in circumstances after admission: ", bold: true, font: FONT, size: 24 }),
  Bracket("[e.g., marriage to a U.S. citizen, birth of a U.S. citizen child, employer sponsorship arising after lawful admission — explain what changed and when]"),
  new TextRun({ text: ".", font: FONT, size: 24 }),
]));
children.push(Bullet([
  new TextRun({ text: "Impracticality or unavailability of consular processing: ", bold: true, font: FONT, size: 24 }),
  Bracket("[describe country-conditions concerns, processing delays, safety issues, or — if applicable — the Applicant’s country’s inclusion on the list of countries subject to Presidential Proclamation 10949 (June 4, 2025), which materially limits the practical availability of consular processing]"),
  new TextRun({ text: ".", font: FONT, size: 24 }),
]));
children.push(Bullet([
  new TextRun({ text: "Family unity and hardship: ", bold: true, font: FONT, size: 24 }),
  new TextRun({ text: "Requiring the Applicant to depart the United States for consular processing — even temporarily — would separate the Applicant from ", font: FONT, size: 24 }),
  Bracket("[qualifying family members]"),
  new TextRun({ text: " and disrupt ", font: FONT, size: 24 }),
  Bracket("[describe specific hardship: employment, caregiving, medical treatment, schooling, etc.]"),
  new TextRun({ text: ".", font: FONT, size: 24 }),
]));
children.push(P(
  "For these reasons, adjustment of status — rather than consular processing — is both reasonable and consistent with " +
  "the purposes of the immigration laws, and does not reflect an attempt to circumvent the ordinary visa process."
));

// ---------------- III. ELIGIBILITY ----------------
children.push(H1("III. Statement of Statutory Eligibility"));
children.push(P(
  "The Applicant respectfully refers the officer to the Form I-485 and supporting documentation for a full statement of " +
  "eligibility. In summary:"
));
children.push(Bullet([
  new TextRun({ text: "Inspection and admission/parole: ", bold: true, font: FONT, size: 24 }),
  Bracket("[date, location, and manner of last lawful admission or parole]"),
  new TextRun({ text: ".", font: FONT, size: 24 }),
]));
children.push(Bullet([
  new TextRun({ text: "Visa availability: ", bold: true, font: FONT, size: 24 }),
  Bracket("[confirm a visa is immediately available under the applicable category and chargeability area]"),
  new TextRun({ text: ".", font: FONT, size: 24 }),
]));
children.push(Bullet([
  new TextRun({ text: "Admissibility: ", bold: true, font: FONT, size: 24 }),
  Bracket("[confirm no grounds of inadmissibility apply, or identify any waiver obtained/sought and its current status]"),
  new TextRun({ text: ".", font: FONT, size: 24 }),
]));

// ---------------- IV. ARGUMENT ----------------
children.push(H1("IV. Argument: The Totality of the Circumstances Warrants a Favorable Exercise of Discretion"));

children.push(H2("A. The Applicant’s Positive Equities Strongly Favor Approval"));

children.push(H3("1. Family Ties and Hardship to United States Family Members"));
children.push(P(
  "The Applicant has substantial ties to the United States through ", { runOpts: {} }
));
// rebuild paragraph 1 with brackets inline
children.pop();
children.push(PMix([
  "The Applicant has substantial ties to the United States, including ",
  Bracket("[U.S. citizen/LPR spouse, children, parents, and/or siblings — identify each, relationship, and immigration status]"),
  ". ", "These relationships have existed for ",
  Bracket("[duration]"),
  " and form the core of the Applicant’s life in the United States. ",
  "Were the Applicant required to depart the United States, even temporarily, for consular processing, the resulting " +
  "separation would impose hardship on these family members, including ",
  Bracket("[describe specific hardship: loss of financial support, disruption of caregiving for a family member with a medical condition or disability, interruption of a U.S. citizen child’s schooling or medical care, etc.]"),
  ". Family ties of this nature are a significant positive factor in the discretionary analysis. See Matter of Cavazos, 17 I&N Dec. 215 (BIA 1980); Matter of Ibrahim, 18 I&N Dec. 55 (BIA 1981); 1 USCIS-PM E.8.",
]));

children.push(H3("2. Length of Residence and Compliance With U.S. Immigration Law"));
children.push(PMix([
  "The Applicant has resided in the United States since ",
  Bracket("[date of entry]"),
  ", a period of approximately ",
  Bracket("[duration]"),
  ". ",
  Bracket("[If applicable: “During this time, the Applicant has maintained lawful nonimmigrant status continuously and has not been the subject of any unlawful presence, removal proceedings, or final order of removal.” Otherwise, address any periods of unlawful presence or status violations directly and explain the circumstances — see Section IV.B below.]"),
  " A substantial period of lawful residence in the United States is a favorable factor in the totality-of-the-circumstances analysis. See 1 USCIS-PM E.8; PM-602-0199.",
]));

children.push(H3("3. Community Ties, Contributions, and Good Moral Character"));
children.push(PMix([
  "The Applicant has demonstrated good moral character and meaningful ties to the community, including ",
  Bracket("[active membership and participation in a religious congregation; volunteer work; charitable contributions; mentorship; recognition or awards; cooperation with law enforcement; etc. — describe and attach supporting letters/documentation]"),
  ". The record contains no indication of the overwhelmingly negative factors identified in PM-602-0188 (Aug. 15, 2025) — namely, anti-American or antisemitic views, or support for terrorism — and the Applicant’s history reflects an absence of significant unfavorable factors connected with indications of good moral character. See PM-602-0188; 1 USCIS-PM E.8.",
]));

children.push(H3("4. Employment, Education, and Economic Contributions"));
children.push(PMix([
  "The Applicant is employed as ",
  Bracket("[position/employer, or describe educational program]"),
  ", a position that ",
  Bracket("[describe any specialized skill, labor shortage occupation, approved labor certification, or other economic-benefit considerations, as applicable]"),
  ". The Applicant has consistently met all federal, state, and local tax obligations and has no outstanding debts or financial judgments of record. ",
  Bracket("[If applicable, describe educational attainment and its relevance to the U.S. labor market.]"),
  " These factors reflect financial responsibility and a positive contribution to the United States. See CILA/ABA USCIS Policy Manual Discretion Chart (Employment, Business, and Skills).",
]));

children.push(H3("5. Rehabilitation and Reformation (If Applicable)"));
children.push(PMix([
  Bracket("[Include this section only if the record contains any adverse history. Describe the conduct at issue briefly and " +
    "factually, the time that has elapsed, and the specific evidence of rehabilitation — e.g., successful completion of " +
    "probation or court-ordered conditions, payment of any overdue child support or taxes, repayment of any SSI " +
    "overpayment, and community testimony attesting to the Applicant’s present good character. PM-602-0188 recognizes " +
    "these forms of reformation as mitigating evidence in the totality-of-the-circumstances analysis. See also Matter of " +
    "Edwards, 20 I&N Dec. 191 (BIA 1990).]"),
]));

children.push(H2("B. Any Adverse Factors Present in the Record Do Not Outweigh the Applicant’s Substantial Positive Equities"));
children.push(PMix([
  Bracket("[If the record contains any negative factors — e.g., a prior overstay, a single traffic offense, a denied " +
    "petition, or any other issue identified on the AOS Discretionary Factors Case Assessment Tool — address each one " +
    "directly and individually in this section. For each factor: (1) state the fact candidly; (2) explain the context and " +
    "any mitigating circumstances; and (3) explain why, under Matter of Arai, 13 I&N Dec. 494 (BIA 1970), and Matter of " +
    "Marin, 16 I&N Dec. 581 (BIA 1978), the cumulative weight of the Applicant’s positive equities outweighs this factor. " +
    "If there are no adverse factors of record, this section may state: “The Applicant is aware of no adverse factors " +
    "in the record that would weigh against a favorable exercise of discretion.”]"),
]));

children.push(H2("C. No Overwhelmingly Negative Factors Are Present"));
children.push(P(
  "PM-602-0188 identifies a narrow category of factors — evidence of anti-American or antisemitic views, or support for " +
  "terrorism or terrorist organizations — that are considered overwhelmingly negative and cannot be outweighed by " +
  "positive equities. The Applicant affirms that none of these factors is present in this case. Similarly, the Applicant " +
  "is not aware of any conduct that would constitute the “highly relevant” combination identified in PM-602-0199 " +
  "— namely, conduct after admission inconsistent with representations made at the time of the visa application, " +
  "admission, or parole, where the failure to depart could have been avoided through consular processing."
));

// ---------------- V. CONCLUSION ----------------
children.push(H1("V. Conclusion"));
children.push(P(
  "For the foregoing reasons, the Applicant respectfully submits that the totality of the circumstances — including the " +
  "Applicant’s family ties and the hardship that separation would cause, the Applicant’s substantial period of lawful " +
  "residence, the Applicant’s community involvement and good moral character, and the Applicant’s economic " +
  "contributions — establishes by a preponderance of the evidence that adjustment of status is warranted as a matter of " +
  "discretion under PM-602-0199, 1 USCIS-PM E.8, and 7 USCIS-PM A.10. The Applicant respectfully requests that the Form " +
  "I-485 be approved."
));
children.push(P("Respectfully submitted,"));
children.push(new Paragraph({ spacing: { before: 480 }, children: [new TextRun({ text: "_____________________________", font: FONT, size: 24 })] }));
children.push(P("[Attorney Name]\nKingdom Counsel Firm\nCounsel for the Applicant", { runOpts: {} }));
// fix multiline
children.pop();
children.push(new Paragraph({ children: [new TextRun({ text: "[Attorney Name]", font: FONT, size: 24, italics: true })] }));
children.push(new Paragraph({ children: [new TextRun({ text: "Kingdom Counsel Firm", font: FONT, size: 24, italics: true })] }));
children.push(new Paragraph({ children: [new TextRun({ text: "Counsel for the Applicant", font: FONT, size: 24, italics: true })] }));

// ---------------- DRAFTING NOTES (last page) ----------------
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(H1("Drafting Notes — Internal Use Only (Delete Before Filing)"));
children.push(P("This template is designed to be paired with the companion “AOS Discretionary Factors — Case Assessment Tool” spreadsheet. Recommended workflow:"));
children.push(Bullet([new TextRun({ text: "1. Complete the Case Assessment Tool for the client, marking each factor Positive, Negative, Neutral, or N/A.", font: FONT, size: 24 })]));
children.push(Bullet([new TextRun({ text: "2. Use the “Positive” rows to populate Section IV.A of this memorandum with case-specific facts.", font: FONT, size: 24 })]));
children.push(Bullet([new TextRun({ text: "3. Use any “Negative” rows to populate Section IV.B — address every negative factor candidly; do not omit known adverse facts.", font: FONT, size: 24 })]));
children.push(Bullet([new TextRun({ text: "4. Confirm Section II.C (AOS vs. CP) is tailored to the client’s actual entry history and intent — this is the section most directly responsive to PM-602-0199’s framing of AOS as “administrative grace.”", font: FONT, size: 24 })]));
children.push(Bullet([new TextRun({ text: "5. Attach corroborating documentary evidence for each factor cited (e.g., birth/marriage certificates, medical records, tax returns, letters of support, country-conditions evidence).", font: FONT, size: 24 })]));
children.push(Bullet([new TextRun({ text: "6. Remove this “Drafting Notes” page and all bracketed/red placeholder text before filing.", font: FONT, size: 24 })]));

const doc = new Document({
  styles,
  numbering,
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
      },
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: "Discretionary Factors Memorandum — Template", font: FONT, size: 18, italics: true, color: "808080" })],
        })],
      }),
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "Page ", font: FONT, size: 20 }), new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 20 }), new TextRun({ text: " of ", font: FONT, size: 20 }), new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONT, size: 20 })],
        })],
      }),
    },
    children,
  }],
});

Packer.toBuffer(doc).then(buffer => fs.writeFileSync("/sessions/fervent-zen-clarke/mnt/outputs/AOS_Discretionary_Factors_Brief_Template.docx", buffer));
