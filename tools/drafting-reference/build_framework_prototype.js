const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, LevelFormat, HeadingLevel,
  BorderStyle, WidthType, ShadingType, PageNumber, PageBreak,
} = require("docx");

const FONT = "Times New Roman";
const PAGE = {
  size: { width: 12240, height: 15840 },
  margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
};
const CONTENT_W = 9360;

const border = { style: BorderStyle.SINGLE, size: 1, color: "BFBFBF" };
const borders = { top: border, bottom: border, left: border, right: border };

// ---------- helpers ----------
function P(text, opts = {}) {
  return new Paragraph({
    alignment: opts.align || AlignmentType.JUSTIFIED,
    spacing: { after: 160, ...opts.spacing },
    children: [new TextRun({ text, font: FONT, size: 24, ...opts.run })],
  });
}

function PMix(parts, opts = {}) {
  return new Paragraph({
    alignment: opts.align || AlignmentType.JUSTIFIED,
    spacing: { after: 160, ...opts.spacing },
    children: parts.map((p) =>
      typeof p === "string"
        ? new TextRun({ text: p, font: FONT, size: 24 })
        : new TextRun({ text: p.text, font: FONT, size: 24, ...p })
    ),
  });
}

function Bullet(text, opts = {}) {
  if (Array.isArray(text)) return BulletMix(text, opts);
  return new Paragraph({
    numbering: { reference: "bullets", level: opts.level || 0 },
    spacing: { after: 80 },
    children: [new TextRun({ text, font: FONT, size: 24, ...opts.run })],
  });
}

function BulletMix(parts, opts = {}) {
  return new Paragraph({
    numbering: { reference: "bullets", level: opts.level || 0 },
    spacing: { after: 80 },
    children: parts.map((p) =>
      typeof p === "string"
        ? new TextRun({ text: p, font: FONT, size: 24 })
        : new TextRun({ text: p.text, font: FONT, size: 24, ...p })
    ),
  });
}

function H1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 320, after: 200 },
    children: [new TextRun({ text, font: FONT, bold: true, size: 32, color: "1F3864" })],
  });
}

function H2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 260, after: 160 },
    children: [new TextRun({ text, font: FONT, bold: true, size: 28, color: "2E5395" })],
  });
}

function H3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 120 },
    children: [new TextRun({ text, font: FONT, bold: true, size: 26, italics: false, color: "404040" })],
  });
}

function FieldLabel(text) {
  return new Paragraph({
    spacing: { before: 120, after: 60 },
    children: [new TextRun({ text, font: FONT, bold: true, size: 24, underline: {} })],
  });
}

function Bracket(text) {
  return { text, color: "C00000", italics: true };
}

function Rule() {
  return new Paragraph({
    spacing: { before: 120, after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "2E75B6", space: 1 } },
    children: [],
  });
}

function cell(text, opts = {}) {
  return new TableCell({
    borders,
    width: { size: opts.width, type: WidthType.DXA },
    shading: opts.fill ? { fill: opts.fill, type: ShadingType.CLEAR } : undefined,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    verticalAlign: "center",
    children: [new Paragraph({
      children: [new TextRun({ text, font: FONT, size: 22, bold: !!opts.bold })],
    })],
  });
}

// ---------- TITLE ----------
const titleBlock = [
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 80 },
    children: [new TextRun({ text: "AOS DISCRETIONARY FACTORS", font: FONT, bold: true, size: 36, color: "1F3864" })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 80 },
    children: [new TextRun({ text: "ELEMENT FRAMEWORK — PROTOTYPE FOR REVIEW", font: FONT, bold: true, size: 30, color: "2E5395" })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 240 },
    children: [new TextRun({ text: "Layer 1.5: Legal-Element Worksheet (between Case Intake and Brief Development Matrix)", font: FONT, italics: true, size: 22, color: "595959" })],
  }),
  PMix([
    { text: "STATUS: ", bold: true },
    "This is a working draft of two model categories — ",
    { text: "Threshold Eligibility (INA §245(a))", bold: true },
    " and ",
    { text: "Family Unity", bold: true },
    " — built to the Universal Factor Framework below. The goal is to confirm the column/section structure on a strong category before templating the remaining ~13 categories. Nothing here is final; treat every bracketed item as a placeholder.",
  ]),
  Rule(),
];

// ---------- SECTION 1: FRAMEWORK ----------
const frameworkRows = [
  ["Equity", "What are we trying to prove? The name of the discretionary factor (e.g., “Family Unity”, “Tax Compliance,” or, for adverse factors, “Unlawful Presence”)."],
  ["Authority", "Why can USCIS consider it? Statutory provision(s), regulation(s), BIA/AG case law, and Policy Manual / PM citations that establish the factor as legally relevant."],
  ["Legal Principle", "What does the law/policy actually say? A one- to three-sentence statement of the governing rule — written so it can drop directly into a brief's legal-standard section."],
  ["Elements", "What components make up this equity? The sub-parts that must each be examined to determine whether — and how strongly — the equity (or adverse factor) is present."],
  ["Facts", "Client-specific facts for each element. Pulled from the Case Intake tab; this is where attorney fact-gathering lives."],
  ["Evidence", "Documents/records that prove the facts for each element."],
  ["Government Argument", "Why USCIS may discount or weigh against this equity (for adverse factors: the government's affirmative argument)."],
  ["Rebuttal", "Why the equity still favors approval (for adverse factors: why it should not be given controlling weight) — grounded in the specific facts, not generic assertions."],
  ["Weight", "Strong / Moderate / Limited / Not Present — assigned at the category level after the elements are evaluated."],
  ["Draft Rule Statement", "Citation-ready paragraph(s) for the brief, with bracketed placeholders for the Facts identified above."],
];

const frameworkTable = new Table({
  width: { size: CONTENT_W, type: WidthType.DXA },
  columnWidths: [2160, 7200],
  rows: [
    new TableRow({
      tableHeader: true,
      children: [
        cell("Section", { width: 2160, fill: "4472C4", bold: true }),
        cell("Purpose", { width: 7200, fill: "4472C4", bold: true }),
      ],
    }),
    ...frameworkRows.map(([a, b], i) =>
      new TableRow({
        children: [
          cell(a, { width: 2160, fill: i % 2 ? "F2F2F2" : "FFFFFF", bold: true }),
          cell(b, { width: 7200, fill: i % 2 ? "F2F2F2" : "FFFFFF" }),
        ],
      })
    ),
  ],
});

const section1 = [
  H1("1. The Universal Factor Framework"),
  P("Every category in the rebuilt tool — positive equity or adverse factor — will be built using the same ten sections, in the same order. This keeps every “card” consistent, makes the categories easy to template, and ensures every card can be read top-to-bottom as the skeleton of a brief argument: Authority → Legal Principle → Elements → Facts → Evidence → Government Argument → Rebuttal → Weight → Draft Rule Statement."),
  frameworkTable,
  P(""),
  H3("How this maps onto the existing two-tab workbook"),
  Bullet([
    { text: "Equity, Authority, Legal Principle, Elements (labels only): ", bold: true },
    { text: "fixed content — the same for every case. This is the “template” portion of each card.", font: FONT },
  ].reduce((acc, p) => acc, null) || ""), // placeholder, replaced below
];

// Rebuild bullets properly (avoid the reduce hack above)
section1.pop();
section1.push(
  Bullet("Equity, Authority, Legal Principle, and the Elements list are fixed content — the same for every case. This is the template portion of each card."),
  Bullet("Facts and Evidence are filled in per-client, at the element level. In the current workbook, this corresponds to the “Case Facts / Answer” and “Evidence to Gather” columns on Tab 1 (Case Intake) — but organized by legal element rather than by free-standing question."),
  Bullet("Government Argument, Rebuttal, Weight, and Draft Rule Statement are category-level — they roll up the element-level facts into the row already built on Tab 2 (Brief Development Matrix). The Draft Rule Statement here is the seed for Tab 2's “Draft Brief Paragraph” column."),
  Rule(),
);

// ---------- SECTION 2: ELIGIBILITY MODEL ----------
function elementBlock(num, title, authority, factsPrompt, evidence) {
  return [
    H3(`Element ${num}: ${title}`),
    PMix([{ text: "Authority: ", bold: true }, authority]),
    PMix([{ text: "Facts: ", bold: true }, Bracket(factsPrompt)]),
    P("Evidence:"),
    ...evidence.map((e) => Bullet(e)),
  ];
}

const section2 = [
  H1("2. Model Category — Threshold Eligibility (INA §245(a))"),
  PMix([
    { text: "Equity: ", bold: true },
    "None — this is not a discretionary equity. It is the ",
    { text: "threshold gate", italics: true },
    " that must be cleared before any equity or adverse factor is weighed.",
  ]),
  H3("Authority"),
  Bullet("Statutory: INA §245(a) (8 U.S.C. §1255(a)); INA §245(c) (categorical bars to adjustment); 8 CFR §245.1 et seq."),
  Bullet("Discretion authority: INA §245(a) (“... may be adjusted ... in the discretion of the [Secretary] ...”)"),
  Bullet("Policy: 7 USCIS-PM A.10 (Legal Analysis and Use of Discretion); 1 USCIS-PM E.8 (Discretionary Analysis); PM-602-0199 (May 21, 2026)."),
  H3("Legal Principle"),
  P("Before any equity is weighed, the Applicant must establish, by a preponderance of the evidence, that each statutory element of INA §245(a) is satisfied. This determination is a threshold question, separate from the discretionary balancing analysis that follows: failure to satisfy any one of Elements 1–6 is independently dispositive, regardless of the strength of the Applicant’s equities. Element 7 — whether the application merits a favorable exercise of discretion — is the bridge into the balancing analysis performed in every category that follows."),
  H3("Elements"),
  P("Each element below should be confirmed (with supporting evidence) before the discretionary-balancing categories are addressed. Elements 1–6 are pass/fail; Element 7 is resolved by the balancing analysis in Categories 2 and following."),
  ...elementBlock(1, "Inspected and Admitted, or Paroled",
    "INA §245(a)(1)",
    "Date and manner of admission or parole",
    ["Form I-94 admission/departure record", "Passport admission stamp", "Form I-512 (parole document), if applicable"]),
  ...elementBlock(2, "Application Properly Filed",
    "INA §245(a); 8 CFR §245.2",
    "Date Form I-485 filed; confirm all required initial evidence and fees submitted",
    ["Form I-797C (Notice of Action / receipt notice)", "Filing fee receipt"]),
  ...elementBlock(3, "Physically Present in the United States",
    "INA §245(a)",
    "Confirm continuous physical presence from filing through adjudication; identify any departures",
    ["Current address / lease", "Employment records", "I-94 travel history (CBP I-94 website)"]),
  ...elementBlock(4, "Eligible to Receive an Immigrant Visa",
    "INA §245(a)(2); underlying classification provisions (e.g., INA §§201(b), 203, 208)",
    "Identify the underlying petition/classification and its approval date",
    ["Approval notice for underlying petition (I-130 / I-140 / I-360 / asylum grant, etc.)"]),
  ...elementBlock(5, "Visa Immediately Available at Filing and at Adjudication",
    "INA §245(a)(3); Department of State Visa Bulletin",
    "Compare priority date to the relevant Visa Bulletin chart (Final Action Date / Dates for Filing) as of filing and as of adjudication",
    ["Visa Bulletin excerpt(s) for relevant month(s)", "Priority date confirmation (approval notice)"]),
  ...elementBlock(6, "Admissible to the United States, or Waiver/Exception Available",
    "INA §212(a) (grounds of inadmissibility); INA §245(c) (bars to adjustment); applicable waiver provisions (e.g., INA §§212(g), (h), (i))",
    "Identify any potential inadmissibility grounds and, if applicable, waiver eligibility and status",
    ["Criminal history check (state and FBI)", "Prior immigration violation history", "Waiver application and supporting evidence, if applicable"]),
  ...elementBlock(7, "Application Merits a Favorable Exercise of Discretion",
    "INA §245(a) (“... in the discretion of the [Secretary] ...”); 7 USCIS-PM A.10; PM-602-0199",
    "Not independently established here — resolved through Categories 2 and following",
    ["See Tab 2 — Brief Development Matrix (Balancing Dashboard and Final Balancing section)"]),
  H3("Government Argument"),
  P("Raised only as to a contested element (1–6), or — as to Element 7 — through the adverse-factor categories addressed elsewhere in this framework. If the government disputes an element of statutory eligibility itself (e.g., visa availability, admissibility), that dispute must be resolved before reaching the discretionary balancing analysis; it is not a “weight” issue."),
  H3("Rebuttal"),
  P([Bracket("Per contested element — e.g., updated Visa Bulletin chart showing availability as of the adjudication date, or waiver approval curing an inadmissibility ground.")].map(b=>b.text)[0]),
  H3("Weight"),
  P("Not applicable on the Strong/Moderate/Limited scale. Elements 1–6: Pass / Fail / Contested. Element 7: resolved by the balancing analysis (see Tab 2)."),
  H3("Draft Rule Statement"),
  PMix([
    "The Applicant is eligible to adjust status under INA §245(a). The Applicant was ",
    Bracket("inspected and admitted / paroled"),
    " on ",
    Bracket("[date]"),
    ", as reflected in ",
    Bracket("[evidence]"),
    ". The Applicant’s Form I-485 was properly filed on ",
    Bracket("[date]"),
    ". The Applicant has remained physically present in the United States since ",
    Bracket("[date]"),
    ", and is the beneficiary of an approved ",
    Bracket("[I-130 / I-140 / I-360 / asylum grant]"),
    ", classifying the Applicant as ",
    Bracket("[classification]"),
    ". A visa ",
    Bracket("[is / was]"),
    " immediately available as of ",
    Bracket("[date]"),
    ", per the Department of State Visa Bulletin for ",
    Bracket("[month/year]"),
    ". ",
    Bracket("[The Applicant is admissible to the United States. / The Applicant is inadmissible under INA §212(a)(__) but is eligible for, and has obtained, a waiver under INA §__, as set forth in __.]"),
    " Accordingly, the Applicant satisfies each statutory prerequisite for adjustment of status, and — for the reasons set forth in Sections __ below — the application merits a favorable exercise of discretion.",
  ]),
  Rule(),
];

// ---------- SECTION 3: FAMILY UNITY MODEL ----------
const section3 = [
  H1("3. Model Category — Family Unity (Positive Equity)"),
  PMix([{ text: "Equity: ", bold: true }, "Preservation and unity of immediate family relationships in the United States."]),
  H3("Authority"),
  Bullet([
    { text: "Statutory Foundation — INA §201(b)(2)(A)(i) (8 U.S.C. §1151(b)(2)(A)(i)): ", bold: true },
    { text: "immediate relatives of U.S. citizens are exempt from numerical limitations and receive preferential treatment under the immigration laws.", font: FONT },
  ]),
  Bullet([
    { text: "Discretion Authority — INA §245(a): ", bold: true },
    { text: "adjustment of status remains a discretionary determination even where statutory eligibility (Category 1) is fully satisfied.", font: FONT },
  ]),
  Bullet([
    { text: "Case Law: ", bold: true },
    { text: "Matter of Arai, 13 I&N Dec. 494 (BIA 1970) (family ties in the United States are a favorable discretionary consideration); Matter of Marin, 16 I&N Dec. 581 (BIA 1978) (favorable factors, including family ties, are weighed against adverse factors under the totality of the circumstances).", font: FONT },
  ]),
  Bullet([
    { text: "Policy: ", bold: true },
    { text: "1 USCIS-PM E.8 (Discretionary Analysis); PM-602-0199 (May 21, 2026).", font: FONT },
  ]),
  H3("Legal Principle"),
  P("Congress has consistently prioritized the preservation of immediate family relationships in the structure of the immigration laws. Consistent with that policy, 1 USCIS-PM E.8 identifies strong family ties to U.S. citizens or lawful permanent residents as a favorable discretionary factor, and the consequences of separating an Applicant from such family members — financial, medical, educational, or emotional — may properly be weighed in the totality of the circumstances."),
  H3("Elements"),

  H3("A. Existence of a Qualifying Family Relationship"),
  Bullet("U.S. citizen or LPR spouse"),
  Bullet("U.S. citizen or LPR child(ren)"),
  Bullet("U.S. citizen or LPR parent(s)"),
  Bullet("Other LPR family members (siblings, etc.)"),
  PMix([{ text: "Facts: ", bold: true }, Bracket("Identify each qualifying relative, relationship, and immigration status")]),
  P("Evidence:"),
  Bullet("Marriage certificate"),
  Bullet("Birth certificate(s)"),
  Bullet("Certificate of naturalization or lawful permanent resident card (Form I-551)"),

  H3("B. Strength and Depth of the Relationship"),
  Bullet("Cohabitation / shared residence"),
  Bullet("Length of the relationship"),
  Bullet("Frequency and nature of contact"),
  Bullet("Integration of finances and households"),
  PMix([{ text: "Facts: ", bold: true }, Bracket("Describe living arrangement, duration, and day-to-day involvement")]),
  P("Evidence:"),
  Bullet("Lease or mortgage documents listing both parties"),
  Bullet("Joint bank account statements / joint tax returns"),
  Bullet("Photographs spanning the relationship"),
  Bullet("Affidavits from family and friends"),

  H3("C. Dependence"),
  Bullet("Financial dependence"),
  Bullet("Medical or caregiving dependence"),
  Bullet("Childcare and logistical dependence"),
  PMix([{ text: "Facts: ", bold: true }, Bracket("Describe specific dependence — who depends on whom, and for what")]),
  P("Evidence:"),
  Bullet("Pay stubs and household budget"),
  Bullet("Medical records / provider letters describing the Applicant’s caregiving role"),
  Bullet("School and childcare records"),

  H3("D. Consequences of Separation"),
  Bullet("Emotional / psychological impact"),
  Bullet("Medical impact"),
  Bullet("Educational and financial disruption"),
  PMix([{ text: "Facts: ", bold: true }, Bracket("Describe the specific anticipated impact of separation on each affected family member")]),
  P("Evidence:"),
  Bullet("Letters from licensed therapists or counselors"),
  Bullet("Medical provider letters"),
  Bullet("School records"),
  Bullet("Affidavits describing anticipated impact"),

  H3("Government Argument"),
  P("Family separation — whether temporary or permanent — is a common feature of many immigration cases and is not, without more, an extraordinary circumstance warranting a favorable exercise of discretion."),

  H3("Rebuttal"),
  PMix([
    "The relevant inquiry is not whether separation would occur in the abstract, but whether the specific relationships and dependencies established in this record — ",
    Bracket("e.g., the Applicant’s role as primary caregiver to a U.S. citizen child with [condition], or the Applicant’s [X]-year marriage and shared household with a U.S. citizen spouse"),
    " — make this case materially different from the ordinary instance of family separation. Matter of Arai does not require “extraordinary” family ties; it recognizes that family relationships of the kind documented under Elements A–D are themselves a favorable factor to be weighed in the totality of the circumstances.",
  ]),

  H3("Weight"),
  P("Strong / Moderate / Limited — driven primarily by Elements B–D (depth of relationship, dependence, and consequences of separation). Element A (existence of the relationship) is generally binary: it establishes that the equity is “in play” but does not by itself determine its weight."),

  H3("Draft Rule Statement"),
  PMix([
    "Family unity is a recognized favorable discretionary factor. See Matter of Arai, 13 I&N Dec. 494 (BIA 1970); 1 USCIS-PM E.8. The Applicant is the ",
    Bracket("[spouse / parent / child]"),
    " of ",
    Bracket("[name]"),
    ", a United States ",
    Bracket("[citizen / lawful permanent resident]"),
    ", and has ",
    Bracket("[resided with / maintained a close relationship with]"),
    " ",
    Bracket("[him/her]"),
    " since ",
    Bracket("[date]"),
    ". As reflected in ",
    Bracket("[evidence]"),
    ", the Applicant ",
    Bracket("[describe dependence — e.g., provides primary care for / is financially supported by]"),
    ". Separation would result in ",
    Bracket("[describe consequence]"),
    ". These facts establish a ",
    Bracket("[strong / moderate]"),
    " family-unity equity that weighs in favor of a favorable exercise of discretion.",
  ]),
  Rule(),
];

// ---------- SECTION 4: NOTES / NEXT STEPS ----------
const tentativeCats = [
  ["Threshold", "1. Statutory Eligibility (INA §245(a)) — built above"],
  ["Positive Equities", "2. Family Unity — built above"],
  ["Positive Equities", "3. Hardship to U.S. Family"],
  ["Positive Equities", "4. Humanitarian Factors"],
  ["Positive Equities", "5. Community Integration"],
  ["Positive Equities", "6. Economic Contribution"],
  ["Positive Equities", "7. Civic Compliance"],
  ["Positive Equities", "8. Character & Reputation"],
  ["Positive Equities", "9. Rehabilitation"],
  ["Positive Equities", "10. Extraordinary Equities"],
  ["Adverse Factors", "11. Immigration Violations"],
  ["Adverse Factors", "12. Fraud / Credibility Concerns"],
  ["Adverse Factors", "13. Criminal Conduct"],
  ["Adverse Factors", "14. National Security / Public Safety"],
  ["Balancing", "15. Totality of the Circumstances (final balancing — already drafted on Tab 2)"],
];

const catTable = new Table({
  width: { size: CONTENT_W, type: WidthType.DXA },
  columnWidths: [2400, 6960],
  rows: [
    new TableRow({
      tableHeader: true,
      children: [
        cell("Group", { width: 2400, fill: "4472C4", bold: true }),
        cell("Category", { width: 6960, fill: "4472C4", bold: true }),
      ],
    }),
    ...tentativeCats.map(([a, b], i) =>
      new TableRow({
        children: [
          cell(a, { width: 2400, fill: i % 2 ? "F2F2F2" : "FFFFFF", bold: true }),
          cell(b, { width: 6960, fill: i % 2 ? "F2F2F2" : "FFFFFF" }),
        ],
      })
    ),
  ],
});

const section4 = [
  H1("4. Notes for Discussion / Next Steps"),
  P("This prototype intentionally covers only two categories. Before templating the rest, please review:"),
  Bullet("Does the ten-section framework (Section 1) capture everything needed, or is anything missing/extra for your workflow?"),
  Bullet("Is the element-level granularity for Family Unity (Elements A–D) the right depth — too much, too little?"),
  Bullet("For Eligibility, is treating Elements 1–6 as pass/fail (rather than weighted) correct, with Element 7 deferred to the balancing categories?"),
  Bullet("Does the Draft Rule Statement format — a single citation-anchored paragraph with bracketed facts — match how you actually want to lift language into the brief, or should it be broken into smaller, mix-and-match sentence blocks?"),
  P(""),
  P("Once the framework is confirmed, the tentative category map below (from your Phase 3 outline) would be used to template the remaining categories. Order can be adjusted — this is just a starting sequence."),
  catTable,
  P(""),
  PMix([
    { text: "Implementation note: ", bold: true },
    "once finalized, each category becomes a card in a new Tab 1.5 (“Legal Element Worksheet”), sitting between the existing Case Intake (Tab 1) and Brief Development Matrix (Tab 2). Facts/Evidence entered at the element level here would be referenced by the corresponding Tab 2 row, so nothing already built needs to be discarded — this fills the gap between raw intake and equity-level weighing.",
  ]),
];

// ---------- BUILD DOC ----------
const doc = new Document({
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [
          { level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
          { level: 1, format: LevelFormat.BULLET, text: "◦", alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 1080, hanging: 360 } } } },
        ],
      },
    ],
  },
  styles: {
    default: { document: { run: { font: FONT, size: 24 } } },
  },
  sections: [
    {
      properties: { page: PAGE },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [new TextRun({ text: "AOS Discretionary Factors — Element Framework (Prototype)", font: FONT, size: 18, italics: true, color: "808080" })],
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: "Page ", font: FONT, size: 18 }),
                new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 18 }),
                new TextRun({ text: " of ", font: FONT, size: 18 }),
                new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONT, size: 18 }),
              ],
            }),
          ],
        }),
      },
      children: [
        ...titleBlock,
        ...section1,
        new Paragraph({ children: [new PageBreak()] }),
        ...section2,
        new Paragraph({ children: [new PageBreak()] }),
        ...section3,
        new Paragraph({ children: [new PageBreak()] }),
        ...section4,
      ],
    },
  ],
});

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync("/sessions/fervent-zen-clarke/mnt/outputs/AOS_Element_Framework_Prototype.docx", buffer);
  console.log("written");
});
