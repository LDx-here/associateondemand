# Citation Verification Skill
## Kingdom Counsel Firm — Legal Practice

**Trigger:** This skill runs automatically at the conclusion of every legal task that produces citations, references, or sources — including briefs, memos, research summaries, client letters, and any other document that cites a case, statute, regulation, or policy.

---

## Purpose

This skill ensures that every legal citation in a KCF document is:

1. **Real** — the case or source actually exists
2. **Retrievable** — a publicly accessible copy has been located and confirmed
3. **Accurate** — the proposition cited matches what the source actually says
4. **Annotated** — the relevant passage is highlighted so any reader can verify without searching the full document
5. **Packaged** — verified PDFs accompany the brief so the file is self-contained

If a source cannot be automatically retrieved, this skill surfaces it explicitly as VERIFICATION NEEDED and gives the attorney specific instructions to supply the PDF.

---

## When This Skill Activates

After any legal task that produces a document containing:
- Case citations (e.g., *Matter of Arai*, 13 I&N Dec. 494)
- Statutory references (e.g., INA §245(a), 8 U.S.C. §1255(a))
- Regulatory citations (e.g., 8 C.F.R. §212.8)
- Policy manual references (e.g., 1 USCIS-PM E.8)
- Policy memoranda (e.g., PM-602-0199)
- Any other secondary legal authority

**The skill does not wait to be asked.** It runs as part of the deliverable.

---

## What the Skill Produces

For each citation in the document, the skill produces one of two outputs:

### Output A: Verified Reference PDF

A single-page PDF containing:
- Source name, citation, and original URL in the header
- A green "✓ VERIFIED" status badge
- The proposition the source is cited for
- A verbatim excerpt from the source, with the key quoted passage highlighted in yellow
- Footer with date verified and firm name

### Output B: Verification Needed Card

A single-page PDF containing:
- Source name, citation, and confirmed URL
- A red "⚠ VERIFICATION NEEDED" status badge
- The proposition the source is intended to support
- Step-by-step instructions for the attorney to download the PDF and supply it
- Key passages the attorney should locate and highlight once downloaded

### Output C: Verification Manifest

A single cover document listing all sources with their status (Verified / Verification Needed), the confirmed URL for each, and the proposition each source supports. This is the first document in the package.

---

## The Verification Protocol

### Step 1 — Extract All Citations

Parse the completed document and extract every citation. For each, record:
- Source name (case name, statute section, memo identifier)
- Full citation string (volume, reporter, page, court, year)
- The proposition it is cited for (what claim does the document use it to support)
- The exact quoted language, if any, that appears in the document

### Step 2 — Search for Each Source

For each citation:

**BIA Precedent Decisions (I&N Dec.):**
- Primary source: DOJ/EOIR Published Decisions at `https://www.justice.gov/eoir/board-of-immigration-appeals-decisions`
- Direct PDF pattern: `https://www.justice.gov/sites/default/files/eoir/legacy/[year]/[month]/[day]/[interim_decision_number].pdf`
- Search query: `"Matter of [name]" "[volume] I&N Dec. [page]" site:justice.gov filetype:pdf`
- Fallback: Google Scholar, HeinOnline

**USCIS Policy Manual:**
- URL pattern: `https://www.uscis.gov/policy-manual/volume-[N]-part-[X]-chapter-[N]`
- Search: `USCIS policy manual "[chapter name]" site:uscis.gov`

**USCIS Policy Memoranda:**
- URL pattern: `https://www.uscis.gov/sites/default/files/document/memos/PM-[number]-[description].pdf`
- Confirm at: `https://www.uscis.gov/laws-and-policy/policy-guidance/policy-memoranda`

**INA Statutory Text:**
- Primary: `https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title8-section[XXXX]`
- Secondary: `https://www.govinfo.gov/content/pkg/USCODE-[year]-title8/pdf/USCODE-[year]-title8.pdf`

**Code of Federal Regulations:**
- Primary: `https://www.ecfr.gov/current/title-8/chapter-I/subchapter-[X]/part-[XXX]/section-[XXX.X]`

### Step 3 — Fetch and Confirm

Retrieve each source using web fetch. For each:
- Confirm the source exists at the URL
- Extract the text content
- Locate the exact quoted passage or the language supporting the cited proposition
- If the text is not found at the expected location, flag as CITATION MISMATCH and note what the document actually says at that cite

### Step 4 — Verify the Proposition

Compare the cited proposition against what the source actually says:

| Finding | Action |
|---------|--------|
| Verbatim quote confirmed in source | ✓ VERIFIED — proceed to PDF |
| Proposition is accurate but paraphrased | ✓ VERIFIED — note paraphrase in PDF |
| Quote not found at cited page | ⚠ CITATION MISMATCH — flag and note actual text |
| Source exists but does not support proposition | ⚠ CITATION MISMATCH — flag and recommend alternate source |
| Source not found via web | ⚠ VERIFICATION NEEDED — ask attorney |

### Step 5 — Build Annotated PDFs

For each verified source:

1. Create a PDF using `reportlab` with the verbatim excerpt (focused on the relevant portion — not the full case)
2. Use `PyMuPDF (fitz)` to search the PDF for the key quoted text and add yellow highlight annotations via `page.add_highlight_annot()`
3. Include the source URL and verification date in the header
4. Include the proposition the source is cited for

For each unverified source:
1. Create a VERIFICATION NEEDED reference card
2. Include the confirmed URL (even if PDF was inaccessible to automatic retrieval)
3. List specific passages the attorney should locate
4. Include step-by-step download instructions

### Step 6 — Build the Manifest

Create a cover document (`CITATION_VERIFICATION_MANIFEST.pdf`) listing all sources, their status, their URLs, and the file that corresponds to each. This is the index for the package.

### Step 7 — Deliver

Present the complete package alongside the brief:
- Verification Manifest (first)
- Individual annotated reference PDFs (one per source)
- Any VERIFICATION NEEDED cards flagged prominently

State explicitly how many sources were verified and how many require attorney action.

---

## Technical Implementation

### Required Libraries (Python)

```
pip install PyMuPDF reportlab --break-system-packages
```

### Key Functions

**`build_pdf(source, styles, highlight_phrases)`**
Creates a single annotated reference PDF using reportlab for layout and PyMuPDF for highlights.

```python
import fitz  # PyMuPDF
from reportlab.platypus import SimpleDocTemplate, Paragraph
from reportlab.lib.styles import getSampleStyleSheet

def build_pdf(source, styles, highlight_phrases):
    # 1. Build PDF content with reportlab
    # 2. Write to temp path (use tempfile.mktemp() — not output dir)
    # 3. Open with PyMuPDF
    # 4. Search for each highlight phrase
    # 5. Add highlight annotations
    # 6. Write bytes to final output path (use file.write(pdf.tobytes()))
    # 7. Delete temp file
```

**Important:** Use `pdf.tobytes(garbage=4, deflate=True)` and then `open(path, 'wb').write(bytes)` rather than `pdf.save(path)`. The latter fails when the target file already exists in restricted filesystems.

**`search_and_highlight(pdf, phrase)`**
```python
for page in pdf.pages():
    hits = page.search_for(phrase)
    for rect in hits:
        annot = page.add_highlight_annot(rect)
        annot.set_colors(stroke=fitz.utils.getColor("yellow"))
        annot.update()
```

### Source Data Schema

```python
{
    "filename":   "REF_01_Matter_of_Arai_13_IN_Dec_494.pdf",
    "title":      "Matter of Arai",
    "citation":   "13 I&N Dec. 494, 496 (BIA 1970)",
    "url":        "https://justice.gov/[path].pdf",
    "proposition": "In the absence of adverse factors, adjustment will ordinarily be granted...",
    "verified":   True,                          # or False for VERIFICATION NEEDED
    "highlight_phrases": ["In the absence of adverse factors"],
    "excerpt_parts": [
        {"text": "Context before quote...",      "highlight": False},
        {"text": "The key quoted passage.",      "highlight": True},
        {"text": "Context after quote.",         "highlight": False},
    ],
    # For VERIFICATION NEEDED sources:
    "instructions": [
        "Navigate to the URL above.",
        "Download the PDF.",
        "Key passages to locate: ...",
    ]
}
```

---

## Rules This Skill Follows

1. **Never generate a source.** The skill finds real documents. If it cannot find a document, it says so — it does not fabricate a plausible excerpt.

2. **Never paraphrase a quote.** The highlighted passage must be verbatim from the source. If the document's cited quote is a paraphrase, the skill notes this and highlights the actual language the source uses.

3. **Always confirm the proposition matches.** The skill reads the relevant portion of each source and confirms that the text actually supports the cited proposition. Mismatches are flagged regardless of how minor.

4. **VERIFICATION NEEDED is not a failure.** Some sources (Westlaw-only, PACER filings, classified or access-restricted documents) cannot be automatically retrieved. The skill surfaces these clearly and gives the attorney a specific path to resolution.

5. **The package is complete before the task closes.** The brief and the citation verification package are delivered together. There is no "send the brief now, verify later."

6. **Court-accessible sources only.** The PDFs in the package are sourced from the same public government databases an USCIS officer, immigration judge, or reviewing court could consult. No paywalled sources appear as primary evidence — if a source is Westlaw-only, it is marked VERIFICATION NEEDED.

---

## Sources and Their Typical Access Paths

| Source Type | Typical Database | Access |
|-------------|-----------------|--------|
| BIA Precedent (I&N Dec.) | DOJ/EOIR | Public PDF at justice.gov |
| USCIS Policy Manual | USCIS website | Public HTML at uscis.gov/policy-manual |
| USCIS Policy Memos | USCIS website | Public PDF at uscis.gov |
| INA statutory text | uscode.house.gov or govinfo.gov | Public |
| CFR regulatory text | ecfr.gov | Public |
| Federal court opinions | CourtListener, Google Scholar | Public |
| BIA unpublished decisions | PACER or Westlaw | VERIFICATION NEEDED |
| AAO decisions | USCIS website | Public (some) |
| State court decisions | varies | Varies — check Google Scholar first |

---

## Citation Mismatch Protocol

If a source does not support the proposition it is cited for:

1. Flag as ⚠ CITATION MISMATCH in the manifest
2. State what the source actually says at the cited location
3. Search for an alternate source that does support the proposition
4. If an alternate is found, propose it as a replacement with its URL and verbatim quote
5. Do not use the mismatched citation in any revised document without attorney review

---

## Attorney Questions — When to Ask

Ask the attorney if:
- A source cannot be found by any automated search
- A source requires Westlaw or PACER access
- The retrieved source does not match the proposition and no replacement is readily available
- The exact page or paragraph cited cannot be verified (correct case, wrong pinpoint)

Do not ask about:
- Sources that are fully verified and correctly cited
- Standard formatting questions about the citations themselves
- Sources where the proposition is supported even if the exact wording differs slightly from the citation's quote (note the variation but do not escalate)

---

## Package File Naming Convention

```
CITATION_VERIFICATION_MANIFEST.pdf
REF_01_[CaseName_or_Source]_[Citation].pdf
REF_02_[CaseName_or_Source]_[Citation].pdf
...
REF_[N]_[CaseName_or_Source]_VERIFICATION_NEEDED.pdf
```

Sources are numbered in citation order (order of first appearance in the brief).

---

## Example: AOS Discretionary Brief Package (Phanpit Sakkhi, June 2026)

**Sources cited:** 7  
**Verified:** 6  
**Verification Needed:** 1 (PM-602-0199 — URL confirmed; PDF requires attorney download)

| File | Source | Status |
|------|--------|--------|
| CITATION_VERIFICATION_MANIFEST.pdf | Index | — |
| REF_01_Matter_of_Arai_13_IN_Dec_494.pdf | 13 I&N Dec. 494 | ✓ Verified |
| REF_02_Matter_of_Marin_16_IN_Dec_581.pdf | 16 I&N Dec. 581 | ✓ Verified |
| REF_03_Matter_of_Patel_17_IN_Dec_597.pdf | 17 I&N Dec. 597 | ✓ Verified |
| REF_04_Matter_of_Edwards_20_IN_Dec_191.pdf | 20 I&N Dec. 191 | ✓ Verified |
| REF_05_Matter_of_Mendez_Morales_21_IN_Dec_296.pdf | 21 I&N Dec. 296 | ✓ Verified |
| REF_06_USCIS_Policy_Manual_E8_Discretion.pdf | 1 USCIS-PM E.8 | ✓ Verified |
| REF_07_PM_602_0199_VERIFICATION_NEEDED.pdf | PM-602-0199 (May 2026) | ⚠ Needed |

---

*Kingdom Counsel Firm | kingdomcounselfirm@gmail.com*
*This skill specification is for internal use. Not for distribution.*
