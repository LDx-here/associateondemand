---
name: research-memo
description: >
  Immigration legal research memo generator for RMV. Triggers when LD asks for research on a legal standard, country conditions, case law analysis, or any question requiring structured legal research. Use this skill for: "research [topic]", "what's the law on [X]", "find cases about [X]", "country conditions for [country]", "memo on [legal issue]", "what does the Sixth Circuit say about [X]", "BIA precedent on [X]", "is [case] still good law", or any request that requires finding, analyzing, and synthesizing legal authority. Also triggers when LD asks to "look into", "analyze", "investigate", or "pull authority on" any immigration law topic. Always use this skill rather than answering legal research questions from memory — the research must be sourced and verifiable.
---

# Research Memo Skill — RMV Immigration Practice

## Purpose

Produce a sourced, structured legal research memo that LD can rely on for case strategy, brief drafting, or client advising. Every proposition must be supported by cited authority. Every cited case must be verified as good law.

## Before You Begin

1. Read the master CLAUDE.md for firm conventions, citation format, and ethical rules
2. Determine which type of research memo is needed (see Step 1)
3. Load the relevant reference file from `references/` based on the legal topic

---

## Step 1 — Classify the Research Request

Ask LD (or infer from context) which type of memo is needed:

### Type A: Legal Standard Memo
Research a specific legal standard, element, or doctrine. Example: "What's the standard for a particular social group claim in the Sixth Circuit?"

### Type B: Country Conditions Memo
Research conditions in a specific country relevant to asylum, withholding, or CAT claims. Example: "Country conditions for LGBTQ individuals in Guatemala."

### Type C: Case Law Analysis
Analyze how a specific case or line of cases applies to a matter. Example: "How does *Matter of A-B-* affect domestic violence-based asylum claims after *Matter of A-B- III*?"

### Type D: Comparative Authority Memo
Compare how different circuits or the BIA have treated an issue. Example: "Circuit split on whether a particular social group must be socially distinct vs. socially visible."

If the type isn't clear, default to Type A and adjust as you go.

---

## Step 2 — Gather Facts from LD

Before researching, confirm what you need to know. Ask targeted questions — not "tell me about the case" but specific gaps:

**For all memo types:**
- What is the specific legal question?
- What Matter ID should this be logged under? (If new, assign one: IMM-[YEAR]-[###])
- Is there a specific procedural posture? (Before IJ, on appeal to BIA, petition for review to 6th Cir.)
- Any cases LD already knows are relevant? (Starting points accelerate research)

**Additional for Type B (Country Conditions):**
- What country?
- What specific risk or persecution ground? (Race, religion, nationality, political opinion, particular social group)
- What time period is relevant?
- Is this for an asylum filing, a merits hearing, or a motion to reopen based on changed conditions?

**Additional for Type C (Case Law Analysis):**
- What is the specific case or line of cases to analyze?
- How does LD think it applies? (So you can test that theory)

Do NOT proceed to research without at least the specific legal question and procedural posture.

---

## Step 3 — Research Protocol

### 3A: Legal Standard Research

Execute ALL of these sources in order. Do not skip any. Flag what you cannot access for LD manual follow-up.

**AUTOMATED — Claude handles end-to-end:**

1. **Midpage Legal Research** (PRIMARY — MCP) — Search for binding authority first:
   - Search BIA precedent decisions on the issue
   - Search Sixth Circuit case law on the issue
   - Search Supreme Court authority if relevant
   - Check citator treatment for every case you plan to cite
   - Distinguish published (binding) from unpublished (persuasive) decisions

2. **Web Search** (GOVERNMENT & REGULATORY) — Search for:
   - USCIS Policy Manual sections (uscis.gov)
   - EOIR Practice Manual provisions (justice.gov/eoir)
   - Recent Attorney General opinions (justice.gov)
   - Federal Register notices for recent regulatory changes (federalregister.gov)

3. **Web Search** (PRACTICE RESOURCES) — Search for:
   - AILA practice advisories and litigation alerts
   - CLINIC legal resources and practice pointers
   - ILRC practice advisories
   - National Immigration Project resources

4. **Reference Files** — Check `references/` for the relevant framework:
   - `asylum-withholding-cat.md` — Standards for asylum, withholding, CAT claims
   - `cancellation-of-removal.md` — Cancellation standards and case law
   - `adjustment-waivers.md` — Adjustment of status and waiver standards
   - `sixth-circuit-immigration.md` — Sixth Circuit-specific immigration precedent

**SEMI-AUTOMATED — Claude searches, LD verifies results:**

5. **Google Scholar** (via web search) — Backup case search for:
   - Very recent decisions not yet in Midpage
   - Unpublished district court decisions
   - LD should verify any case found only through Google Scholar

6. **TRAC Immigration** (via web search) — Strategic intelligence:
   - Judge-specific grant/denial rates for the case type
   - Court-specific data for the relevant immigration court
   - Note: TRAC data has reporting lags — LD should verify currency

**MANUAL FLAG — Claude identifies need, LD executes:**

7. **Westlaw / Lexis Shepardizing** — Flag for LD:
   - List every case central to the argument that needs full Shepard's/KeyCite
   - Midpage citator is strong but headnote-level treatment analysis requires Westlaw/Lexis
   - Include specific holdings to check, not just the case citation

8. **Judge-Specific Research** — Flag for LD:
   - If the IJ is known, note that LD should research judge-specific practices
   - Unpublished IJ oral decisions are not searchable — LD must use practitioner networks

9. **Sealed / Restricted Cases** — Flag for LD if applicable:
   - Note if the legal issue may have been addressed in sealed proceedings
   - LD must check through PACER or court access

### 3B: Country Conditions Research

Execute ALL of these sources in order. Every source searched gets noted in the memo — even if it returns nothing relevant. That's how LD knows the research was comprehensive.

**AUTOMATED — Claude handles end-to-end:**

1. **U.S. Department of State** (via web search + fetch):
   - Country Reports on Human Rights Practices (MOST RECENT year — check state.gov)
   - International Religious Freedom Reports (if religion-based claim)
   - Trafficking in Persons Reports (if trafficking-related)
   - Cite with specific page/section references and publication date

2. **UNHCR / Refworld** (via web search + fetch):
   - UNHCR eligibility guidelines for the country (if they exist — these are gold)
   - UNHCR position papers on specific groups
   - Refworld.org aggregated country conditions database
   - Search by country + specific persecution ground

3. **CRS / USCIRF** (via web search):
   - Congressional Research Service reports on the country
   - USCIRF annual report — check if country is designated CPC or Special Watch List
   - USCIRF country-specific publications

4. **NGO Reports** (via web search + fetch):
   - Amnesty International — annual report + country-specific reports
   - Human Rights Watch — World Report + country-specific investigations
   - Freedom House — Freedom in the World rating + narrative
   - Reporters Without Borders (if media/political opinion claim)
   - International Crisis Group (if conflict-related)

5. **News & Current Events** (via web search):
   - Recent developments: elections, coups, legislation, crackdowns, policy changes
   - Search Reuters, AP, BBC, and local press from the country
   - Note: News is CORROBORATIVE, not primary — courts want official reports first
   - Always note publication date

6. **Midpage** (MCP) — Case law on country conditions:
   - Recent cases involving the same country and persecution ground
   - How courts evaluated country conditions evidence for this country
   - Cases discussing sufficiency of specific types of country conditions evidence

**SEMI-AUTOMATED — Claude searches, LD verifies:**

7. **UK Home Office CPINs** (via web search + fetch):
   - Country Policy and Information Notes — claim-type-specific assessments
   - Especially strong for LGBTQ, gender-based violence, ethnic/religious minority claims
   - IMPORTANT: UK asylum legal standards differ from U.S. — use for country FACTS only, not legal analysis

8. **Canadian IRB** (via web search):
   - National Documentation Packages by country
   - Well-organized by topic — useful for filling gaps in U.S. sources

9. **EOIR Country Conditions Resource** (via web search):
   - EOIR's own repository at justice.gov/eoir
   - DOJ Virtual Law Library materials

**MANUAL FLAG — Claude identifies need, LD executes:**

10. **Expert Declarations** — Flag for LD:
    - Identify whether the case would benefit from an expert declaration
    - Specify the type of expert needed (academic, former government, country-specific NGO)
    - LD identifies, retains, and coordinates with the expert

11. **In-Country Local Sources** — Flag for LD if applicable:
    - Local human rights organizations in the applicant's country
    - Local media archives that may document specific incidents
    - These may require translation and authentication

### 3C: Source Documentation Protocol

For EVERY source searched, record in the memo:

| Source | Searched? | Result | Date of Source | Notes |
|--------|-----------|--------|----------------|-------|
| State Dept HR Report | ✅ Yes | Relevant — cited | 2025 | Covers [topic] |
| UNHCR Guidance | ✅ Yes | No guidance exists | N/A | None for [country] |
| Amnesty International | ✅ Yes | Relevant — cited | 2024 | Addresses [ground] |
| Expert Declaration | 🔲 MANUAL | LD to assess need | N/A | Recommend [type] |

This table goes in the Research Gaps section of every memo. It proves the research was comprehensive and tells LD exactly what still needs manual follow-up.

### 3C: Citation Verification

For EVERY case you plan to cite in the memo:

1. Run it through Midpage's citator
2. Check treatment signals:
   - **Negative treatment (red):** DO NOT cite without flagging to LD. Note what the negative treatment is.
   - **Caution (yellow/orange):** Cite with a note about the cautionary treatment
   - **Positive/Neutral:** Safe to cite
3. Verify the case has not been superseded by statute or regulation
4. For BIA decisions: check whether a subsequent AG decision has modified or overruled the holding
5. For circuit precedent: check whether the holding has been abrogated by subsequent en banc or Supreme Court decision

---

## Step 4 -- Write the Memo

### OUTPUT FORMAT: Always produce a .docx file.

The memo is a printable, professional document that goes into the client file. A third party (co-counsel, opposing counsel, the court) may see it. Write accordingly.

### LENGTH: Target 1.5 to 3 pages. Maximum 5 pages. No novels. If the analysis is complex, keep the memo tight and put extended research in an attached internal strategy table (see Step 4B).

### FORMATTING RULES (non-negotiable):

1. No em dashes. Use commas, semicolons, or periods instead.
2. No emojis anywhere. Not in the memo, not in tables, not in status indicators.
3. Citations by footnote. Every authority gets a Bluebook footnote. Hyperlink to the online source where possible (Midpage URL, government site, HRW report page, etc.).
4. Numbered outline structure:
   - Roman numerals for major sections (I. II. III.)
   - Arabic numerals for subsections (1. 2. 3.)
   - Lowercase letters for sub-subsections (a. b. c.)
5. Lists use list format. If you are listing items, break them into a visual list. Do not bury lists inside paragraph prose.
6. Conclusion at the top. Lead with "In short, ..." followed by next steps. Let the reader opt into the deeper analysis below.
7. No "MANUAL FLAG" or "LD FOLLOW-UP" labels. If something requires further attention, state it professionally: "The following items require further development. Awaiting directive on: [specific item]."
8. Source attribution required for every factual claim. The reader must always know where the information came from.

### MEMO TEMPLATE:

```
MEMORANDUM
[horizontal rule above and below the TO/FROM block]

TO:       La'Dajia Ferguson, Esq.
FROM:     Litigation Associate
DATE:     [Date]
RE:       [Concise subject -- short, scannable]

Matter ID: [IMM-YEAR-###]                    Page [X] of [Y]

I. PURPOSE

This memorandum was prepared in response to [specific task or question].
The scope of this research includes [what was covered] and does not
address [what was excluded, if relevant].

II. SUMMARY AND NEXT STEPS

In short, [direct answer in 2-3 sentences. No hedging. Get to it.]

Next Steps:
    1. [Actionable item that can be prompted and executed]
    2. [Actionable item]
    3. [Actionable item]

Awaiting directive on:
    a. [Item requiring attorney input]
    b. [Item requiring attorney input]

III. LEGAL FRAMEWORK

[Governing law. Cite by proper Word footnote (appears in page footer
where referenced). Hyperlink every source. Keep to half a page max.]

IV. ANALYSIS

    1. [Sub-Issue Title]

       [CREAC analysis. Concise. Every proposition footnoted.
        If listing, use list format. Break it out visually.]

    2. [Sub-Issue Title]

       [CREAC analysis.]

V. AUTHORITIES CONSULTED

[Source documentation table. See format below.]

VI. ITEMS REQUIRING FURTHER DEVELOPMENT

[Professional summary. Written as if a third party will read it.
State what is needed and that you are awaiting directive.]
```

### ADDITIONAL FORMATTING RULES:

1. Always include the country of origin in the opening header area for immigration matters.
2. Include the case posture (removal defense, affirmative, appeal, etc.) so the reader understands the procedural context immediately.
3. Page numbers must read "Page X of Y" so the reader knows the total length from page one.
4. The TO/FROM/DATE/RE block must have a horizontal rule (line) above and below it. This is the "bracket" framing. Keep it clean and professional.
5. Margins should feel boxed, matching on all sides. Use 1-inch margins.
6. Begin every memo by introducing what you were tasked to do (Section I: Purpose). This ensures attorney and associate are on the same page about the assignment.
7. Footnotes must be proper Word footnotes that appear in the footer of the page where they are referenced. Do not use endnotes or bracketed numbers at the end of the document.
8. Hyperlink every footnote source to its online location where possible.
9. "Next Steps" must be items that can actually be prompted and executed. Not vague suggestions. Concrete actions.

### COUNTRY CONDITIONS -- MULTI-YEAR RETRIEVAL:

When retrieving country conditions reports for a specific country, always retrieve multiple years, not just the most recent. At minimum:
    a. The most recent available year
    b. The year(s) the respondent was actually in the country
    c. Any year in which a significant event relevant to the claim occurred

This allows comparison of how conditions have changed and whether they have worsened, which strengthens the well-founded fear analysis.

### EMPLOYMENT-BASED RESEARCH:

When a matter involves potential employment-based pathways, research and note:
    a. Active H-1B sponsorship job sites: MyVisaJobs.com, ZipRecruiter (H-1B filter), SimplyHired (H-1B filter), TeachersCouncil.com (for education)
    b. School districts with known H-1B sponsorship programs (special education is a high-need area with active sponsorship)
    c. Cap-exempt employers (universities, nonprofit research institutions, government research organizations) which do not require the H-1B lottery
    d. J-1 teacher exchange programs (if applicable)
    e. NIW self-petition viability (no employer sponsor required)

### DAUGHTER'S AGE AND TIMELINE CONSIDERATIONS:

In any case involving a minor derivative, always note:
    a. The child's current age
    b. When the child will age out of derivative status (age 21)
    c. Relevant life milestones (college enrollment, etc.) that may affect the principal's flexibility with location or timing
    d. Whether the child's timeline creates urgency for the case

### SOURCE DOCUMENTATION TABLE (required in every memo):

```
| #  | Source                        | Searched | Finding           | Date    | Action Required           |
|----|-------------------------------|----------|-------------------|---------|---------------------------|
| 1  | State Dept HR Report          | Yes      | Cited in memo     | 2025    | None                      |
| 2  | UNHCR Guidance                | Yes      | No guidance found | N/A     | None                      |
| 3  | Westlaw / Shepardizing        | No       | Not yet accessed  | N/A     | Awaiting access           |
| 4  | Expert Declaration            | No       | Not yet assessed  | N/A     | Awaiting directive        |
```

### CASE ASSESSMENT TABLE (required as a companion to every memo):

Always produce a visual case assessment table alongside the memo. This is the "at a glance" view.

Header must include: Matter ID, Date, Country of Origin, Case Type, and Procedural Posture (e.g., "Removal Defense, pending individual hearing assignment").

Format:

```
CASE ASSESSMENT -- [Matter ID]
Country: [Country]  |  Type: [Case Type]  |  Posture: [Procedural Posture]

| Element / Pathway       | Assessment       | Key Gap / Issue                | Next Action (promptable)       |
|-------------------------|------------------|--------------------------------|--------------------------------|
| Past Persecution        | Moderate         | Detention details undeveloped  | Run client intake interview    |
| Well-Founded Fear       | Strong           | Country report not retrieved   | Retrieve State Dept reports    |
| ...                     | ...              | ...                            | ...                            |
```

Assessment column (single column, replaces separate "status" and "strength"):
    Strong, Moderate, Weak, At Risk, Unknown, Not Applicable

"Next Action" must be a concrete, executable item. Not "develop further." Instead: "Run client intake interview focused on detention conditions." Something that can be prompted and acted on immediately.

The table should also include a "Timeline / Dependency" note where relevant (e.g., "Daughter's age at college enrollment may affect location flexibility").

For interactive or enhanced visual versions (when producing artifacts or screen-based output), the assessment table may be rendered as an interactive element. For print (.docx), keep it as a clean table.

Strength indicators: Strong, Moderate, Weak, At Risk, Unknown, Not Applicable. No emojis. No color coding in print.

---

## Step 4B -- Internal Strategy Notes (separate from the memo)

If the matter is complex, produce a separate internal document titled "INTERNAL STRATEGY NOTES -- [Matter ID]." This document is NOT for the client file. It contains:

1. Candid assessment of strengths and weaknesses
2. What DHS will likely argue and how to respond
3. Open questions and investigation items
4. Timeline and deadline tracking

This is the working document. The memo is the record. Keep them separate.

---

## Step 5 — Quality Checks Before Delivery

Before presenting the memo to LD, verify:

- [ ] Every legal proposition is supported by a cited authority
- [ ] Every cited case has been run through the citator
- [ ] Binding vs. persuasive authority is clearly distinguished
- [ ] CREAC structure is followed for each analytical section
- [ ] No client PII appears anywhere in the memo
- [ ] Bluebook 21st Edition citation format is used throughout
- [ ] Research gaps are honestly disclosed
- [ ] The memo answers the question that was asked (not a related but different question)

---

## Step 6 — Log to Knowledge Management

After LD reviews the memo, log an anonymized entry:

- Matter ID
- Date
- Memo type (A/B/C/D)
- Legal issues researched
- Key authorities found
- Citator status summary
- LD feedback (if any)

Use Google Drive if available. If not, provide the log entry for LD to paste manually.

---

## Country Conditions — Source Hierarchy

When researching country conditions, weight sources in this order (courts generally give the most weight to sources at the top):

1. U.S. Department of State Country Reports on Human Rights Practices
2. U.S. Department of State International Religious Freedom Reports
3. UNHCR eligibility guidelines and country guidance
4. Congressional Research Service reports
5. USCIRF annual reports and country updates
6. UK Home Office Country Policy and Information Notes
7. Amnesty International annual reports and country-specific reports
8. Human Rights Watch World Report and country-specific reports
9. Freedom House Freedom in the World
10. Academic sources and expert declarations
11. Reliable news reporting (corroborative, not primary)

Always note the publication date of every source. Courts discount stale country conditions evidence.

---

## Common Pitfalls — Avoid These

- **Citing non-precedent BIA decisions as binding.** Non-precedent (single-member) BIA decisions are not binding. They can be cited as persuasive but must be identified as such.
- **Ignoring AG decisions.** The Attorney General can overrule BIA precedent. Always check whether a BIA decision has been modified by a subsequent AG decision.
- **Confusing the asylum standard with the withholding standard.** Asylum requires a "well-founded fear" (10% threshold per *Cardoza-Fonseca*). Withholding requires "more likely than not" (clear probability). CAT requires "more likely than not" of torture by or with acquiescence of government. These are different standards — don't conflate them.
- **Overlooking the one-year filing deadline for asylum.** INA § 208(a)(2)(B). Always check whether it's an issue and whether an exception applies.
- **Treating Sixth Circuit precedent as controlling at the BIA.** The BIA is a national tribunal. Sixth Circuit precedent is binding on the IJ within the Sixth Circuit but the BIA applies its own precedent nationally. On petition for review, Sixth Circuit precedent controls.
- **Failing to address adverse authority.** If there's a case that cuts against LD's position, surface it. LD needs to know before the other side raises it.
