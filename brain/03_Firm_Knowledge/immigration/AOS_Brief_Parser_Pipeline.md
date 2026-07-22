# AOS Brief Parsing and Generation Pipeline
## Kingdom Counsel Firm | Immigration Law Practice
### Technical System Guide — Works Without LLM, Enhanced With API

**For:** Developers building the KCF AOS brief automation system.  
**Purpose:** This document defines every rule, every classification decision, every data structure, and every processing step needed to (1) parse an existing AOS brief into a reusable template, and (2) generate a new filing-quality AOS brief from that template and client facts — with or without an active API connection.

**Design principle:** The system must produce a structurally correct, legally complete output from deterministic rules alone. The API enhances prose quality. It does not carry the legal logic. If the API is unavailable, the output is a complete, factually accurate brief with placeholder prose markers. If the API is available, those markers are replaced with polished attorney-quality writing.

---

## Part 1 — Why Two Separate Systems Exist

Before building anything, a developer needs to understand why the parser and the generator are separate, and what each one does.

### 1.1 What the Parser Does

The parser takes an existing AOS brief — one that was already written and filed — and converts it into a structured template. It reads the document, classifies every section, and outputs a JSON object that separates reusable content from case-specific content.

**Input:** An existing .docx or .pdf AOS brief  
**Output:** A JSON template object with every section labeled PRESERVE, FILL, CAPTION, or BOILERPLATE

The parser runs once per source brief. Once you have the template, you do not parse again — you use the template for all future cases of the same type.

### 1.2 What the Generator Does

The generator takes the template JSON from the parser plus a structured set of client facts collected through an intake form, and produces a new brief for the current case.

**Input:** Template JSON + Client Facts JSON  
**Output:** A new .docx AOS brief, complete and ready for attorney review

### 1.3 What Each System Needs to Know

The parser needs to know: **What does an AOS brief look like structurally?** — so it can identify headings, sections, and classify content correctly without misidentifying legal boilerplate as client-specific content.

The generator needs to know: **What are the legal rules?** — so it assembles a legally correct document, not just a text substitution. The prose needs to correctly apply the law to the facts.

Both documents in this guide encode that knowledge explicitly, so neither the parser nor the generator has to "figure it out."

---

## Part 2 — Legal Context the System Must Encode

**This section is mandatory reading before any code is written.** The system cannot classify correctly without understanding why each section exists. This is the knowledge that would otherwise come from legal training or LLM pre-training.

### 2.1 Why Some Sections Are Always the Same

An AOS brief must cite specific BIA (Board of Immigration Appeals) cases and specific sections of the Immigration and Nationality Act (INA). These legal authorities are fixed by law — they do not change based on who the client is. The rule about what "discretion" means is the same whether the applicant is 25 or 68, whether they entered on a student visa or a tourist visa, whether they are from Thailand or Mexico.

**Specifically: these are the legal authorities that are always cited in an AOS discretionary brief, always say the same thing, and never change:**

| Authority | What It Says | Why It Doesn't Change |
|-----------|-------------|----------------------|
| INA §245(a) | The three requirements to be eligible for adjustment of status | It's a statute — it says the same thing until Congress amends it |
| Matter of Patel, 17 I&N Dec. 597 (BIA 1980) | Adjustment is "administrative grace"; applicant bears the burden | It's published precedent — binding on every USCIS officer |
| Matter of Marin, 16 I&N Dec. 581 (BIA 1978) | The balancing test: weigh positive equities vs. adverse factors | Same — binding precedent |
| Matter of Arai, 13 I&N Dec. 494 (BIA 1970) | In the absence of serious adverse factors, adjustment is ordinarily granted | Same — binding precedent |
| 1 USCIS-PM E.8 | The officer's internal framework for discretionary analysis | The Policy Manual is USCIS's own instructions to its officers |

Any paragraph that consists of these legal authorities — quoted verbatim, explained, or cited — is **PRESERVE content.** It is the same in every brief of this type.

### 2.2 Why Some Sections Always Change

The applicant's facts are always different. Their name, their entry date, their family members, their job, their medical circumstances, their community ties — all of this is unique to each case. The legal argument structure is the same (because the law is the same), but the facts that are plugged into that structure change entirely.

Additionally, the "case theme" — the one-sentence framing of who the applicant is and what is at stake — is attorney-authored and case-specific. It is not derived from a rule or a statute. It is a judgment call about what the most compelling single fact is.

**Specifically: these elements change every case:**

- Applicant name, A-number, date of birth, country of birth
- Entry date, visa type, port of entry, I-94 expiration date
- Petitioner name, petitioner's citizenship, relationship to applicant
- I-130 receipt number, I-130 filing date, I-130 approval date
- I-485 filing date
- Case theme sentence (entirely new each time)
- Section A heading and content (primary equity — unique to each client)
- Section B heading and content (secondary equities — unique to each client)
- Adverse factor description and context
- Adverse section heading (must be framed per this client's situation)
- Balancing inventory (drawn from this client's specific equities)

### 2.3 The Four CREAC Positions and What Goes in Each

CREAC is the structure of legal analysis: **Conclusion → Rule → Explanation → Application → Conclusion.**

An AOS brief maps to CREAC as follows:

| Document Section | CREAC Position | Classification |
|-----------------|----------------|----------------|
| Cover page | Conclusion | CAPTION + FILL (case theme) |
| Section I: Legal Standard | Rule + Explanation | PRESERVE (the law does not change) |
| Section II: Statutory Eligibility | Application of rules to threshold facts | FILL (the specific entry date, relationship, and petition history) |
| Section III-A and III-B (equities) | Application of rules to discretionary facts | FILL (the client's specific positive equities) |
| Section III-C (AOS mechanism) | Rule + Application | PRESERVE (the statutory argument) + FILL (specific harm from departure) |
| Section III-D (adverse factors) | Application | FILL (the client's specific adverse history) |
| Section III-E (balancing) | Application + Conclusion | FILL (inventory of this case's equities) + PRESERVE (closing template sentence) |
| Section IV: Conclusion | Conclusion | PRESERVE (template) + FILL (name and theme restatement) |
| Footnotes | Rule (citation support) | PRESERVE (legal citations) + FILL (case-specific cites) |

### 2.4 The Critical Distinction: Legal Standard Paragraphs vs. Fact Application Paragraphs

This is the hardest classification challenge. Both types of paragraphs look like normal prose. The system must distinguish them.

**A legal standard paragraph:**
- References cases (Matter of X, Y I&N Dec. Z)
- States a rule about what the law requires or permits
- Contains no specific dates, names, or facts from the current case
- Could be photocopied unchanged into any brief of the same type

Example:
> "The grant of an application for adjustment of status under section 245 is a matter of administrative grace. An applicant has the burden of showing that discretion should be exercised in his favor. Matter of Patel, 17 I&N Dec. 597 (BIA 1980)."

**A fact application paragraph:**
- Uses the client's name, dates, family members, or specific circumstances
- Applies a legal standard to specific facts
- Would be factually wrong if copied into a different case unchanged

Example:
> "Ms. Sakkhi has resided in the United States since her lawful admission on February 22, 2023. Her daughter, a U.S. citizen, filed an I-130 petition on her behalf on June 1, 2023, which was approved."

The system's classification rule: **If replacing the client's name with another name would make the paragraph factually false, it is FILL. If replacing the name would not change whether the paragraph is true or false, it is PRESERVE.**

---

## Part 3 — Document Parsing Layer (Deterministic — No API Required)

### 3.1 Supported Input Formats

The system must accept:
- `.docx` (Microsoft Word Open XML format) — preferred
- `.pdf` — supported with text extraction; may lose some structure

**Why .docx is preferred:** A .docx file is actually a ZIP archive containing XML files. The heading structure (Section I, Section A, etc.) is stored explicitly in the XML as paragraph styles. This means the parser can extract the document's outline without guessing.

A PDF is a rendered page — it does not store semantic structure. The parser must infer headings from font size and position, which is less reliable.

**Recommendation:** Require .docx as the primary input format for the parser. Accept PDF only for viewing.

### 3.2 Parsing a .docx File — How It Works

A .docx file when unzipped contains these files (among others):
```
word/
  document.xml     ← All paragraphs, headings, and body text
  footnotes.xml    ← All footnote text
  styles.xml       ← Style definitions (what "Heading 1" looks like)
```

The `document.xml` file contains every paragraph in the document, each wrapped in a `<w:p>` element. Each paragraph has:
- A `<w:pStyle w:val="..."/>` element that identifies its style name (e.g., "Heading1", "Heading2", "Normal")
- A `<w:r>` (run) element inside that contains the actual text
- Optional formatting elements (bold, italic, etc.)

**The parser's job:** Walk through every `<w:p>` element, extract its style and text, and build a flat list of `{style, text}` objects.

### 3.3 Python Implementation — docx Parser

This is production-ready Python code. It uses `python-docx`, which handles the XML parsing internally.

```python
from docx import Document
import json
import re

def parse_docx_to_blocks(docx_path):
    """
    Parse a .docx file into a list of blocks.
    Each block is: {
        "type": "heading1" | "heading2" | "heading3" | "paragraph" | "footnote",
        "text": "...",
        "style": "Heading 1" | "Normal" | etc.
    }
    """
    doc = Document(docx_path)
    blocks = []
    
    for para in doc.paragraphs:
        if not para.text.strip():
            continue  # Skip empty paragraphs
        
        style_name = para.style.name if para.style else "Normal"
        
        # Map Word style names to simplified types
        block_type = map_style_to_type(style_name, para.text)
        
        blocks.append({
            "type": block_type,
            "text": para.text.strip(),
            "style": style_name
        })
    
    # Also extract footnotes
    for footnote in doc.part.footnotes.values() if hasattr(doc.part, 'footnotes') else []:
        for para in footnote.paragraphs:
            if para.text.strip():
                blocks.append({
                    "type": "footnote",
                    "text": para.text.strip(),
                    "style": "Footnote"
                })
    
    return blocks


def map_style_to_type(style_name, text):
    """
    Convert Word paragraph style names to simplified block types.
    Style names vary between documents — this handles the most common variants.
    """
    style_lower = style_name.lower()
    
    if any(s in style_lower for s in ["heading 1", "heading1", "title"]):
        return "heading1"
    elif any(s in style_lower for s in ["heading 2", "heading2"]):
        return "heading2"
    elif any(s in style_lower for s in ["heading 3", "heading3"]):
        return "heading3"
    elif "footnote" in style_lower:
        return "footnote"
    else:
        # Even if the style says "Normal", check if it looks like a heading
        # Some attorneys format headings by hand with bold + all caps
        if text.isupper() and len(text) < 120 and text.strip().startswith(
            ("I.", "II.", "III.", "IV.", "V.", "A.", "B.", "C.", "D.", "E.")
        ):
            return "heading2"
        return "paragraph"
```

### 3.4 Grouping Blocks Into Sections

After extracting blocks, group them into sections. A section starts at every heading and ends at the next heading of the same or higher level.

```python
def group_blocks_into_sections(blocks):
    """
    Group blocks into sections based on headings.
    Returns a list of sections: {
        "heading": str,
        "level": 1 | 2 | 3,
        "paragraphs": [str, ...],
        "subsections": [...]
    }
    """
    sections = []
    current_section = None
    
    for block in blocks:
        if block["type"] in ("heading1", "heading2", "heading3"):
            level = int(block["type"][-1])
            
            if current_section:
                sections.append(current_section)
            
            current_section = {
                "heading": block["text"],
                "level": level,
                "paragraphs": [],
                "raw_blocks": []
            }
        elif current_section is not None:
            current_section["paragraphs"].append(block["text"])
            current_section["raw_blocks"].append(block)
        else:
            # Content before the first heading (cover page area)
            sections.append({
                "heading": "__COVER__",
                "level": 0,
                "paragraphs": [block["text"]],
                "raw_blocks": [block]
            })
    
    if current_section:
        sections.append(current_section)
    
    return sections
```

---

## Part 4 — Classification Rules (Deterministic — No API Required)

This is the core of the system. These rules encode the legal knowledge that determines what is preserved and what is filled in. **Every rule here has a legal reason behind it.** The comments explain why, not just what.

### 4.1 The Four Classification Labels

| Label | Meaning | Action on New Case |
|-------|---------|-------------------|
| `PRESERVE` | Reusable legal standard content — same in every AOS brief | Copy verbatim into new brief |
| `FILL` | Case-specific content — changes every case | Replace with client's facts |
| `CAPTION` | Document identification — parties, filing info | Replace with new case's information |
| `BOILERPLATE` | Procedural language — signature blocks, service certificates | Copy verbatim or update firm name/date only |

### 4.2 Section-Level Classification Rules

Apply these rules first to classify entire sections before looking at individual paragraphs.

```python
# These heading patterns always classify as PRESERVE.
# Legal reason: these section titles correspond to the fixed legal standard
# that does not change between AOS cases filed in the same statutory era.
PRESERVE_HEADING_PATTERNS = [
    r"legal standard",
    r"statutory (framework|basis|authority)",
    r"discretionary (standard|analysis|framework)",
    r"standard of (review|discretion)",
    r"applicable (law|legal standard)",
    r"congress created adjustment",
    r"adjustment of status.*permit",
    r"uscis policy",
    r"policy (manual|memorandum|framework)",
]

# These heading patterns always classify as FILL.
# Legal reason: these section titles correspond to the attorney's case-specific
# argument. The heading itself is client-specific (an argument claim about
# this client's equities) and so is the content beneath it.
FILL_HEADING_PATTERNS = [
    r"statutory eligibility",          # contains client's entry date and petition
    r"argument",                       # the entire argument section is fact-specific
    r"favorable.*discretion",          # usually the argument header
    r"family ties",
    r"humanitarian",
    r"moral character",
    r"community",
    r"employment",
    r"adverse",
    r"negative",
    r"balancing",
    r"equit",                          # catches "equities", "equity"
    r"circumstance",
]

# These heading patterns always classify as CAPTION.
CAPTION_HEADING_PATTERNS = [
    r"^in (the )?re\b",
    r"^(in support of|memorandum)",
    r"^(re:|subject:)",
    r"^cover",
]

# These heading patterns always classify as BOILERPLATE.
BOILERPLATE_HEADING_PATTERNS = [
    r"certificate of service",
    r"signature",
    r"respectfully submitted",
    r"counsel of record",
    r"conclusion",               # conclusion is mostly boilerplate + name fill
]


def classify_section_by_heading(heading_text):
    """Classify a section based on its heading text."""
    heading_lower = heading_text.lower()
    
    for pattern in PRESERVE_HEADING_PATTERNS:
        if re.search(pattern, heading_lower):
            return "PRESERVE"
    
    for pattern in CAPTION_HEADING_PATTERNS:
        if re.search(pattern, heading_lower):
            return "CAPTION"
    
    for pattern in BOILERPLATE_HEADING_PATTERNS:
        if re.search(pattern, heading_lower):
            return "BOILERPLATE"
    
    for pattern in FILL_HEADING_PATTERNS:
        if re.search(pattern, heading_lower):
            return "FILL"
    
    # Default: unknown sections need paragraph-level classification
    return "UNKNOWN"
```

### 4.3 Paragraph-Level Classification Rules

For sections classified as `UNKNOWN`, or to validate section-level classifications, apply paragraph-level rules.

```python
# These patterns indicate PRESERVE content.
# Legal reason: paragraphs mentioning BIA decisions and I&N Dec. citations
# are stating fixed legal authority. The cases cited are binding precedent
# that applies to all AOS filings — they are not client-specific.
PRESERVE_PARAGRAPH_SIGNALS = [
    r"\d+\s+I&N Dec\.\s+\d+",         # matches "13 I&N Dec. 494"
    r"Matter of [A-Z][a-z]+",          # matches "Matter of Arai"
    r"INA\s*§\s*\d+",                  # matches "INA §245"
    r"8\s+U\.S\.C\.\s*§",             # matches "8 U.S.C. §1255"
    r"1 USCIS-PM",                     # USCIS Policy Manual citation
    r"PM-\d{3}-\d{4}",                 # Policy Memorandum citation
    r"administrative grace",           # verbatim from Matter of Patel
    r"ordinarily be granted",          # verbatim from Matter of Arai
    r"balancing.*negative factors",    # verbatim from Matter of Marin
    r"unusual or (even )?outstanding equities",  # verbatim from Marin/Arai
    r"burden of showing that discretion",        # verbatim from Patel
]

# These patterns indicate FILL content.
# Legal reason: specific dates, names, and identifiers are always
# client-specific. Any sentence that contains them is applying the law
# to this specific client's facts.
FILL_PARAGRAPH_SIGNALS = [
    r"\[.*?\]",                        # bracketed placeholders
    r"\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}",  # specific dates
    r"\b\d{1,2}/\d{1,2}/\d{4}",       # dates in numeric format
    r"\bA-\d{8,9}\b",                  # alien registration numbers
    r"\bI-\d{3}\b",                    # form numbers in context of specific filings
    r"\b(Ms\.|Mr\.|Mrs\.)\s+[A-Z][a-z]+",  # specific name references
    r"receipt number",
    r"case number",
    r"born (in|on)",
    r"native (of|and citizen of)",
    r"was admitted",
    r"entered the United States",
    r"filed (an|a|her|his|the) (I-\d+|petition|application)",
]


def classify_paragraph(text):
    """
    Classify a single paragraph as PRESERVE, FILL, or AMBIGUOUS.
    Returns the classification and a confidence score (0.0 to 1.0).
    """
    text_lower = text.lower()
    
    preserve_matches = sum(
        1 for p in PRESERVE_PARAGRAPH_SIGNALS if re.search(p, text)
    )
    fill_matches = sum(
        1 for p in FILL_PARAGRAPH_SIGNALS if re.search(p, text)
    )
    
    total = preserve_matches + fill_matches
    if total == 0:
        return "AMBIGUOUS", 0.5
    
    if fill_matches > 0 and preserve_matches == 0:
        return "FILL", fill_matches / max(fill_matches, 1)
    
    if preserve_matches > 0 and fill_matches == 0:
        return "PRESERVE", preserve_matches / max(preserve_matches, 1)
    
    # Mixed paragraph — contains both legal authority AND specific facts.
    # This is a paragraph that applies legal authority to facts.
    # Classification: FILL — because the facts make it case-specific.
    # The preserve content (the legal citation) will be kept as a footnote
    # reference, but the paragraph itself must be rewritten.
    if fill_matches >= preserve_matches:
        return "FILL", 0.6
    else:
        return "PRESERVE", 0.6
```

### 4.4 Special Handling: Mixed Paragraphs

A mixed paragraph contains both legal standard language and client facts. Example:

> "As established in Matter of Marin, 16 I&N Dec. 581, 584 (BIA 1978), the factors to be weighed include 'family ties within the United States.' Ms. Sakkhi's family ties are extraordinary: her autistic grandson Saeng, a U.S. citizen born September 2016, depends entirely on her specialized nursing care."

This paragraph is `FILL` — because the specific client facts (Ms. Sakkhi, Saeng, September 2016) make it case-specific. However, the legal citation embedded in it (Matter of Marin, 16 I&N Dec. 581) is a `PRESERVE` element that must be retained in the new version.

**Rule:** When a paragraph is classified FILL, extract any BIA citations, INA citations, or USCIS-PM citations from it and store them separately. These citations must appear in the corresponding paragraph of the new brief, even though the surrounding prose is rewritten.

```python
def extract_citations_from_paragraph(text):
    """
    Extract legal citations from a paragraph for preservation
    even when the paragraph itself is classified FILL.
    """
    citation_patterns = [
        r"Matter of \w+(?:-\w+)?,\s*\d+ I&N Dec\. \d+(?:,\s*\d+)?\s*\(BIA \d{4}\)",
        r"INA\s*§\s*\d+\([a-z]\)",
        r"8\s+U\.S\.C\.\s*§\s*\d+",
        r"1 USCIS-PM [A-Z]\.\d+(?:\([A-Z]\))?",
        r"PM-\d{3}-\d{4}",
        r"\d+\s+C\.F\.R\.\s*§\s*\d+\.\d+",
    ]
    
    found = []
    for pattern in citation_patterns:
        matches = re.findall(pattern, text)
        found.extend(matches)
    
    return list(set(found))  # deduplicate
```

### 4.5 Variable Element Detection Within FILL Sections

Within a FILL section, the system must identify exactly what needs to be replaced. These are the variable slots.

```python
def detect_variable_slots(text, known_applicant_name=None):
    """
    Within a FILL paragraph, find every variable element that needs
    to be replaced with new case facts. Returns a list of detected slots.
    
    A "slot" is: {
        "slot_type": str,       # what kind of variable it is
        "matched_text": str,    # the text found in the document
        "replacement_key": str  # the key in the client facts dict to use
    }
    """
    slots = []
    
    # 1. Explicit brackets — attorney already marked these as variables
    for match in re.finditer(r'\[([^\]]+)\]', text):
        slots.append({
            "slot_type": "bracket",
            "matched_text": match.group(0),
            "replacement_key": slugify(match.group(1))
        })
    
    # 2. Alien Registration Number
    for match in re.finditer(r'\bA-\d{8,9}\b', text):
        slots.append({
            "slot_type": "a_number",
            "matched_text": match.group(0),
            "replacement_key": "applicant_a_number"
        })
    
    # 3. Applicant name (if known)
    if known_applicant_name:
        name_pattern = re.escape(known_applicant_name)
        for match in re.finditer(name_pattern, text):
            slots.append({
                "slot_type": "applicant_name",
                "matched_text": match.group(0),
                "replacement_key": "applicant_full_name"
            })
    
    # 4. Specific dates
    date_pattern = r'(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}'
    for match in re.finditer(date_pattern, text):
        # Determine what date this is likely to be based on context
        context = text[max(0, match.start()-80):match.end()+80].lower()
        if "admitted" in context or "entry" in context or "entered" in context:
            key = "entry_date"
        elif "filed" in context and "i-130" in context:
            key = "i130_filed_date"
        elif "approved" in context and "i-130" in context:
            key = "i130_approved_date"
        elif "filed" in context and "i-485" in context:
            key = "i485_filed_date"
        elif "born" in context:
            key = "applicant_dob"
        else:
            key = "date_unknown"
        
        slots.append({
            "slot_type": "date",
            "matched_text": match.group(0),
            "replacement_key": key
        })
    
    # 5. Visa type references
    visa_pattern = r'\b(B-1/B-2|B-2|F-1|J-1|H-1B|H-4|L-1|O-1|tourist visa|student visa|work visa)\b'
    for match in re.finditer(visa_pattern, text, re.IGNORECASE):
        slots.append({
            "slot_type": "visa_type",
            "matched_text": match.group(0),
            "replacement_key": "entry_visa_type"
        })
    
    return slots


def slugify(text):
    """Convert a bracket label to a snake_case key."""
    return re.sub(r'[^a-z0-9]+', '_', text.lower()).strip('_')
```

---

## Part 5 — The Template Data Structure

After parsing and classifying, the result is stored as a structured JSON object. This is what gets saved and reused for every future case.

### 5.1 Template Schema

```json
{
  "template_id": "aos_discretionary_standard_v1",
  "template_name": "AOS Discretionary Memorandum — Standard Family-Based",
  "created_from": "Sakkhi_AOS_Discretionary_Brief.docx",
  "created_date": "2026-07-22",
  "brief_type": "AOS_DISCRETIONARY",
  "sections": [
    {
      "section_id": "cover",
      "heading": null,
      "classification": "CAPTION",
      "content_type": "mixed",
      "preserved_text": null,
      "slots": [
        {
          "slot_type": "applicant_name",
          "label": "Applicant Full Name",
          "replacement_key": "applicant_full_name",
          "required": true
        },
        {
          "slot_type": "bracket",
          "label": "A-Number",
          "replacement_key": "applicant_a_number",
          "required": true
        },
        {
          "slot_type": "bracket",
          "label": "Case Theme",
          "replacement_key": "case_theme",
          "required": true,
          "note": "Must be authored by attorney — cannot be auto-generated"
        }
      ]
    },
    {
      "section_id": "legal_standard",
      "heading": "I. LEGAL STANDARD",
      "classification": "PRESERVE",
      "content_type": "verbatim",
      "preserved_text": "Section 245 of the Immigration and Nationality Act (INA) provides that the Attorney General may, in his discretion, adjust the status of an eligible alien to that of a lawful permanent resident. INA §245(a), 8 U.S.C. §1255(a)...",
      "slots": [],
      "citations_embedded": [
        "Matter of Patel, 17 I&N Dec. 597 (BIA 1980)",
        "Matter of Marin, 16 I&N Dec. 581, 584 (BIA 1978)",
        "Matter of Arai, 13 I&N Dec. 494, 496 (BIA 1970)",
        "1 USCIS-PM E.8(A)"
      ]
    },
    {
      "section_id": "statutory_eligibility",
      "heading": "II. STATUTORY ELIGIBILITY",
      "classification": "FILL",
      "content_type": "structured_fill",
      "preserved_text": null,
      "fill_template": "##APPLICANT_FULL_NAME## was inspected and admitted to the United States on ##ENTRY_DATE## at ##PORT_OF_ENTRY## on a ##ENTRY_VISA_TYPE## visa. [Prong 2 paragraph]. [Prong 3 paragraph].",
      "slots": [
        { "replacement_key": "applicant_full_name", "label": "Applicant Full Name", "required": true },
        { "replacement_key": "entry_date", "label": "Date of Entry", "required": true },
        { "replacement_key": "port_of_entry", "label": "Port of Entry", "required": true },
        { "replacement_key": "entry_visa_type", "label": "Visa Type at Entry", "required": true },
        { "replacement_key": "petitioner_name", "label": "U.S. Citizen Petitioner Name", "required": true },
        { "replacement_key": "petitioner_relationship", "label": "Petitioner's Relationship to Applicant", "required": true },
        { "replacement_key": "i130_approved_date", "label": "I-130 Approval Date", "required": true },
        { "replacement_key": "i485_filed_date", "label": "I-485 Filing Date", "required": true }
      ],
      "api_assistance": "optional"
    },
    {
      "section_id": "argument_intro",
      "heading": "III. ARGUMENT",
      "classification": "FILL",
      "content_type": "api_generated",
      "preserved_text": null,
      "fill_template": "##APPLICANT_FULL_NAME## satisfies the statutory eligibility requirements set forth in INA §245(a), as established above. The question before this officer is whether a favorable exercise of discretion is warranted. As established in Matter of Patel, the applicant bears the burden of demonstrating that discretion should be exercised in her favor. ##CASE_THEME## The record compiles that demonstration in full.",
      "slots": [
        { "replacement_key": "applicant_full_name", "label": "Applicant Full Name", "required": true },
        { "replacement_key": "case_theme", "label": "Case Theme Sentence", "required": true }
      ],
      "api_assistance": "optional"
    },
    {
      "section_id": "section_a",
      "heading": "A. [ATTORNEY-AUTHORED HEADING]",
      "classification": "FILL",
      "content_type": "api_generated",
      "preserved_text": null,
      "fill_template": null,
      "slots": [
        { "replacement_key": "section_a_heading", "label": "Section A Heading (argument claim)", "required": true },
        { "replacement_key": "section_a_facts", "label": "All facts for Section A", "required": true }
      ],
      "api_assistance": "required",
      "citations_to_include": [
        "Matter of Marin, 16 I&N Dec. 581, 584-85 (BIA 1978)",
        "Matter of Mendez-Morales, 21 I&N Dec. 296, 301 (BIA 1996)",
        "1 USCIS-PM E.8(C)(2)"
      ],
      "note": "API must develop the Section A facts into 2-4 paragraphs using the provided citations"
    },
    {
      "section_id": "section_b",
      "heading": "B. [ATTORNEY-AUTHORED HEADING]",
      "classification": "FILL",
      "content_type": "api_generated",
      "preserved_text": null,
      "fill_template": null,
      "slots": [
        { "replacement_key": "section_b_heading", "label": "Section B Heading (argument claim)", "required": true },
        { "replacement_key": "section_b_facts", "label": "All facts for Section B", "required": true }
      ],
      "api_assistance": "required",
      "citations_to_include": [
        "Matter of Marin, 16 I&N Dec. 581, 584-85 (BIA 1978)",
        "1 USCIS-PM E.8(C)(2)"
      ]
    },
    {
      "section_id": "section_c_aos_mechanism",
      "heading": "C. Congress Created Adjustment of Status to Permit Eligible Applicants to Complete the Immigration Process Without Needless Family Separation",
      "classification": "PRESERVE",
      "content_type": "verbatim_with_fill",
      "preserved_text": "Congress created adjustment of status to permit eligible applicants who were lawfully admitted to the United States to complete the immigration process without the family separation, risk, and disruption that departure and consular processing would entail...",
      "slots": [
        { "replacement_key": "applicant_full_name", "label": "Applicant Full Name", "required": true },
        { "replacement_key": "entry_date", "label": "Date of Entry", "required": true },
        { "replacement_key": "departure_harm", "label": "Specific harm if applicant were to depart", "required": true }
      ],
      "api_assistance": "optional"
    },
    {
      "section_id": "section_d_adverse",
      "heading": "D. [ATTORNEY-AUTHORED ADVERSE HEADING]",
      "classification": "FILL",
      "content_type": "api_generated",
      "preserved_text": null,
      "fill_template": null,
      "slots": [
        { "replacement_key": "adverse_heading", "label": "Adverse section heading (proportionality frame)", "required": true },
        { "replacement_key": "adverse_facts", "label": "Adverse facts with full context", "required": true }
      ],
      "api_assistance": "required",
      "citations_to_include": [
        "Matter of Arai, 13 I&N Dec. 494, 496 (BIA 1970)",
        "Matter of Marin, 16 I&N Dec. 581, 585 (BIA 1978)"
      ],
      "heading_constraint": "Heading MUST NOT contain the words 'Immigration Violations', 'Overstay', or 'Unlawful Presence'"
    },
    {
      "section_id": "section_e_balancing",
      "heading": "E. The Balance of Equities Strongly Favors a Favorable Exercise of Discretion",
      "classification": "FILL",
      "content_type": "api_generated_with_template_close",
      "closing_template": "This is not a case about ##ADVERSE_FACTOR_BRIEF##. It is a case about ##CASE_THEME_BRIEF##. A favorable exercise of discretion is both legally supported and compelled by the facts of this record.",
      "slots": [
        { "replacement_key": "adverse_factor_brief", "label": "Adverse factor in one phrase", "required": true },
        { "replacement_key": "case_theme_brief", "label": "Case theme restated briefly", "required": true },
        { "replacement_key": "balancing_inventory", "label": "List of positive equities for inventory", "required": true }
      ],
      "api_assistance": "required",
      "citations_to_include": [
        "Matter of Arai, 13 I&N Dec. 494, 496 (BIA 1970)",
        "Matter of Marin, 16 I&N Dec. 581, 584 (BIA 1978)"
      ]
    },
    {
      "section_id": "conclusion",
      "heading": "IV. CONCLUSION",
      "classification": "BOILERPLATE",
      "content_type": "verbatim_with_fill",
      "preserved_text": "For the foregoing reasons, ##APPLICANT_FULL_NAME## respectfully requests that U.S. Citizenship and Immigration Services exercise its discretion favorably and approve the pending Application to Register Permanent Residence or Adjust Status (Form I-485).\n\n##APPLICANT_FULL_NAME## has demonstrated both legal eligibility and compelling grounds for a favorable exercise of discretion. ##CASE_THEME## A favorable exercise of discretion is warranted.\n\nRespectfully submitted,\n\n##ATTORNEY_NAME##\n##FIRM_NAME##\n##ATTORNEY_BAR##\n##DATE##",
      "slots": [
        { "replacement_key": "applicant_full_name", "required": true },
        { "replacement_key": "case_theme", "required": true },
        { "replacement_key": "attorney_name", "required": true },
        { "replacement_key": "firm_name", "required": true },
        { "replacement_key": "attorney_bar", "required": false },
        { "replacement_key": "date", "required": true }
      ]
    }
  ],
  "footnotes": {
    "preserved_citations": [
      { "key": "fn_patel", "text": "Matter of Patel, 17 I&N Dec. 597 (BIA 1980)." },
      { "key": "fn_marin_584", "text": "Matter of Marin, 16 I&N Dec. 581, 584 (BIA 1978)." },
      { "key": "fn_marin_585", "text": "Matter of Marin, 16 I&N Dec. 581, 585 (BIA 1978)." },
      { "key": "fn_arai", "text": "Matter of Arai, 13 I&N Dec. 494, 496 (BIA 1970)." },
      { "key": "fn_mendez", "text": "Matter of Mendez-Morales, 21 I&N Dec. 296, 301 (BIA 1996)." },
      { "key": "fn_edwards", "text": "Matter of Edwards, 20 I&N Dec. 191, 196 (BIA 1990)." },
      { "key": "fn_pm_e8", "text": "1 USCIS-PM E.8(A), available at https://www.uscis.gov/policy-manual/volume-1-part-e-chapter-8." },
      { "key": "fn_ina_245", "text": "INA §245(a), 8 U.S.C. §1255(a)." },
      { "key": "fn_ina_212_9b", "text": "INA §212(a)(9)(B), 8 U.S.C. §1182(a)(9)(B)." },
      { "key": "fn_ina_201b", "text": "INA §201(b)(2)(A)(i), 8 U.S.C. §1151(b)(2)(A)(i)." }
    ],
    "fill_citations": []
  }
}
```

---

## Part 6 — Client Facts Schema (The Intake Form)

Before the generator can run, it needs these facts. This is the complete set of inputs the system must collect from the attorney or through a web form.

```json
{
  "case_facts": {
    
    "meta": {
      "matter_id": "required | string | e.g. KCF-2026-001",
      "prepared_by": "required | string | attorney name",
      "prepared_date": "required | ISO date | YYYY-MM-DD",
      "brief_type": "AOS_DISCRETIONARY"
    },

    "applicant": {
      "full_name": "required | string | e.g. Phanpit Sakkhi",
      "a_number": "optional | string | format A-XXXXXXXXX",
      "date_of_birth": "required | string | Month DD, YYYY",
      "country_of_birth": "required | string",
      "country_of_citizenship": "required | string",
      "gender": "required | M | F | X",
      "pronoun_subject": "required | she | he | they",
      "pronoun_object": "required | her | him | them",
      "pronoun_possessive": "required | her | his | their"
    },

    "entry_and_immigration_history": {
      "last_entry_date": "required | string | Month DD, YYYY",
      "last_entry_port": "required | string",
      "last_entry_visa_type": "required | string | e.g. B-2 Tourist Visa",
      "authorized_stay_expiration": "required | string | Month DD, YYYY",
      "overstay_start_date": "optional | string | date authorized stay expired",
      "prior_entries": "optional | array | [{ date, visa_type, port }]",
      "prior_removal_orders": "optional | boolean",
      "prior_immigration_violations": "optional | string | describe or null",
      "departure_would_trigger_bar": "required | boolean | true if 3/10-year bar would apply on departure"
    },

    "petition": {
      "petitioner_name": "required | string",
      "petitioner_us_citizen_date": "required | string | date petitioner became US citizen",
      "petitioner_relationship": "required | string | e.g. daughter | son | spouse | parent",
      "i130_filed_date": "required | string | Month DD, YYYY",
      "i130_receipt_number": "optional | string",
      "i130_approved_date": "required | string | Month DD, YYYY",
      "i485_filed_date": "required | string | Month DD, YYYY",
      "i485_receipt_number": "optional | string"
    },

    "attorney": {
      "attorney_name": "required | string",
      "firm_name": "required | string",
      "bar_number": "optional | string",
      "email": "optional | string",
      "phone": "optional | string",
      "address": "optional | string"
    },

    "case_architecture": {
      "case_theme": "required | string | one sentence authored by attorney",
      "case_theme_brief": "required | string | shorter restatement for balancing closing",
      "adverse_factor_brief": "required | string | e.g. 'an overstay'",
      "section_a_heading": "required | string | argument claim — not a category label",
      "section_b_heading": "required | string | argument claim — not a category label",
      "adverse_heading": "required | string | proportionality-framed heading",
      "include_aos_mechanism": "required | boolean | always true for post-May 2026 or overstay cases",
      "include_edwards": "required | boolean | true if criminal history present",
      "include_mendez": "required | boolean | true if quality of family relationship is centerpiece"
    },

    "positive_factors": {
      "family_ties": {
        "members": "required | array | [{ name, relationship, status, dependence, quality_description }]",
        "quality_notes": "optional | string | anything specific about the depth of the relationship"
      },
      "humanitarian": {
        "age": "optional | number",
        "health_conditions": "optional | array | [{ condition, severity, impact }]",
        "hardship_if_denied": "optional | string | what happens to the family if applicant is removed"
      },
      "employment_and_economic": {
        "us_employment_history": "optional | array | [{ employer, role, dates, status }]",
        "professional_credentials": "optional | array | [{ credential, issuing_body, year }]",
        "tax_history": "optional | string | e.g. filed US taxes for X years"
      },
      "community_and_moral_character": {
        "service_activities": "optional | array | [{ organization, role, dates, description }]",
        "awards_recognitions": "optional | array | [{ name, issuer, year, description }]",
        "religious_community": "optional | string",
        "educational_activities": "optional | string",
        "character_witnesses": "optional | array | [{ name, role, relationship }]",
        "criminal_record": "required | boolean | false if clean",
        "criminal_record_details": "optional | string | if true, describe"
      }
    },

    "adverse_factors": {
      "primary_adverse": {
        "type": "required | overstay | prior_removal | criminal | other",
        "description": "required | string | what happened",
        "date_arose": "optional | string",
        "context": "required | string | why it happened, changed circumstances, etc.",
        "is_fraud": "required | boolean | false if not involving fraud or misrepresentation",
        "rehabilitation": "optional | string | what positive conduct has occurred since"
      },
      "additional_adverse": "optional | array | [{ type, description, context }]"
    },

    "departure_harm": "optional | string | specific harm that would result if applicant departed for consular processing",

    "evidence_index": "optional | array | [{ document_name, description, relevance }]"
  }
}
```

---

## Part 7 — The Generation Pipeline (With and Without API)

### 7.1 Overview of the Pipeline

```
[Template JSON]  +  [Client Facts JSON]
         ↓
Step 1:  Validate inputs — all required fields present?
         ↓
Step 2:  Merge simple substitutions — name, dates, numbers
         (DETERMINISTIC — no API required)
         ↓
Step 3:  Assemble PRESERVE sections
         (DETERMINISTIC — copy verbatim from template)
         ↓
Step 4:  Generate FILL sections
         (API REQUIRED for prose quality; template fallback without API)
         ↓
Step 5:  Assemble footnotes
         (DETERMINISTIC — preserved citations + case-specific citations)
         ↓
Step 6:  Build .docx document
         (DETERMINISTIC — python-docx)
         ↓
Step 7:  Run quality validation
         (DETERMINISTIC — pattern matching)
         ↓
[Output: complete .docx brief + validation report]
```

### 7.2 Step 2 — Simple Substitution (No API)

For every section in the template, replace `##REPLACEMENT_KEY##` tokens with the corresponding value from the client facts JSON.

```python
def apply_simple_substitutions(template_text, facts):
    """
    Replace all ##KEY## tokens in template_text with values from facts.
    Returns the substituted text and a list of any unfilled tokens.
    """
    result = template_text
    unfilled = []
    
    # Build a flat lookup from the nested facts dict
    flat_facts = flatten_dict(facts)
    
    for match in re.finditer(r'##([A-Z_]+)##', template_text):
        key = match.group(1).lower()
        if key in flat_facts and flat_facts[key]:
            result = result.replace(match.group(0), str(flat_facts[key]))
        else:
            unfilled.append(match.group(1))
    
    return result, unfilled


def flatten_dict(d, prefix=''):
    """Convert nested dict to flat dict with underscore-joined keys."""
    result = {}
    for k, v in d.items():
        full_key = f"{prefix}{k}" if not prefix else f"{prefix}_{k}"
        if isinstance(v, dict):
            result.update(flatten_dict(v, full_key))
        else:
            result[full_key] = v
    return result
```

### 7.3 Step 3 — Assembling PRESERVE Sections (No API)

For sections classified PRESERVE, copy the `preserved_text` verbatim. Then apply any simple substitutions within that text (for PRESERVE sections that have embedded fill slots, like the AOS mechanism section).

```python
def assemble_preserve_section(section, facts):
    """Assemble a PRESERVE section."""
    text = section.get("preserved_text", "")
    if not text:
        return ""
    text, _ = apply_simple_substitutions(text, facts)
    return text
```

### 7.4 Step 4 — Generating FILL Sections

#### Option A: Without API (Template Fallback Mode)

For each FILL section, use the `fill_template` if one exists, apply substitutions, and leave structured placeholders where API prose would go.

```python
def assemble_fill_section_no_api(section, facts):
    """
    Assemble a FILL section without API.
    Uses fill_template if available, otherwise returns a structured placeholder.
    """
    if section.get("fill_template"):
        text, unfilled = apply_simple_substitutions(section["fill_template"], facts)
        return text
    
    # No template available — return structured placeholder
    required_slots = [s for s in section.get("slots", []) if s.get("required")]
    slot_summary = "\n".join([f"  - {s['label']}: {get_fact(facts, s['replacement_key'])}" 
                               for s in required_slots])
    
    return (
        f"[SECTION REQUIRES API PROSE GENERATION]\n"
        f"Section: {section['heading']}\n"
        f"Available facts:\n{slot_summary}\n"
        f"Citations to include: {', '.join(section.get('citations_to_include', []))}\n"
        f"[END PLACEHOLDER]"
    )
```

#### Option B: With API (Full Generation Mode)

For each FILL section that requires API assistance, send a structured prompt to the API. The prompt encodes all the legal knowledge — the API does not need to know anything about immigration law from its training. It only needs to assemble good prose from the instructions.

The complete API prompt template is in Part 8.

### 7.5 Step 5 — Footnote Assembly (No API)

The footnote page is assembled deterministically from two sources:
1. Preserved citations from the template (always present)
2. Case-specific citations added during generation

```python
def assemble_footnotes(template_footnotes, used_citations):
    """
    Build the footnotes section.
    template_footnotes: the preserved_citations from the template JSON
    used_citations: citations collected during generation (case-specific)
    
    Returns: ordered list of { number, text } footnotes
    """
    # Start with preserved citations (always included)
    all_citations = {fn["key"]: fn["text"] for fn in template_footnotes["preserved_citations"]}
    
    # Add any case-specific citations
    for cite in used_citations:
        key = slugify(cite)
        if key not in all_citations:
            all_citations[key] = cite
    
    # Assign numbers in the order they appear in the document
    # (document assembly step tracks which citation keys are used and in what order)
    numbered = []
    for i, (key, text) in enumerate(all_citations.items(), start=1):
        numbered.append({"number": i, "key": key, "text": text})
    
    return numbered
```

### 7.6 Step 6 — Building the .docx Output (No API)

```python
from docx import Document
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH

def build_output_docx(sections_assembled, footnotes, facts, output_path):
    """
    Build the final .docx brief from assembled sections and footnotes.
    """
    doc = Document()
    
    # ── Page Setup ────────────────────────────────────────────────
    section = doc.sections[0]
    section.page_width  = Inches(8.5)
    section.page_height = Inches(11)
    section.top_margin    = Inches(1.0)
    section.bottom_margin = Inches(1.0)
    section.left_margin   = Inches(1.25)
    section.right_margin  = Inches(1.25)
    
    # ── Default Font ──────────────────────────────────────────────
    style = doc.styles['Normal']
    style.font.name = 'Times New Roman'
    style.font.size = Pt(12)
    
    # ── Cover Page ────────────────────────────────────────────────
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run("MEMORANDUM IN SUPPORT OF APPLICATION FOR ADJUSTMENT OF STATUS")
    run.bold = True
    run.font.size = Pt(14)
    
    doc.add_paragraph()  # spacer
    
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.add_run(f"Applicant: {facts['case_facts']['applicant']['full_name']}")
    
    if facts['case_facts']['applicant'].get('a_number'):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.add_run(f"File No. {facts['case_facts']['applicant']['a_number']}")
    
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run(facts['case_facts']['case_architecture']['case_theme'])
    run.italic = True
    run.font.size = Pt(11)
    
    doc.add_paragraph()
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.add_run(f"Submitted: {facts['case_facts']['meta']['prepared_date']}")
    p.add_run(f"\nPrepared by: {facts['case_facts']['attorney']['attorney_name']}")
    p.add_run(f"\n{facts['case_facts']['attorney']['firm_name']}")
    
    doc.add_page_break()
    
    # ── Body Sections ─────────────────────────────────────────────
    for section_content in sections_assembled:
        heading_text = section_content.get("heading")
        body_text    = section_content.get("body", "")
        level        = section_content.get("level", 1)
        
        if heading_text and heading_text != "__COVER__":
            style_name = f"Heading {level}"
            try:
                doc.add_heading(heading_text, level=level)
            except:
                p = doc.add_paragraph(heading_text)
                p.runs[0].bold = True
        
        if body_text:
            for para_text in body_text.split("\n\n"):
                if para_text.strip():
                    p = doc.add_paragraph(para_text.strip())
                    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    
    doc.add_page_break()
    
    # ── Footnotes ─────────────────────────────────────────────────
    doc.add_heading("FOOTNOTES", level=1)
    for fn in footnotes:
        p = doc.add_paragraph()
        run = p.add_run(f"{fn['number']}. ")
        run.bold = True
        p.add_run(fn['text'])
        p.paragraph_format.left_indent = Inches(0.25)
    
    doc.save(output_path)
    return output_path
```

---

## Part 8 — The Complete API Prompt (All Legal Knowledge Encoded)

When the API is available, each FILL section that requires prose generation receives this prompt. The prompt encodes all legal knowledge — the model does not need to know immigration law from training. Everything it needs is in the prompt.

### 8.1 System Prompt (Send Once Per Session)

This is the system prompt that initializes the API session. It should be sent as the `system` parameter in the API call.

```
You are a legal brief drafting assistant for Kingdom Counsel Firm, an immigration law practice. You are drafting a section of an AOS Discretionary Memorandum — a brief filed with U.S. Citizenship and Immigration Services (USCIS) in support of a Form I-485 Application to Register Permanent Residence or Adjust Status.

THE LEGAL FRAMEWORK YOU MUST APPLY:

The following legal authorities govern every AOS discretionary analysis. You must apply them correctly and cite them accurately.

1. THE STATUTE — INA §245(a), 8 U.S.C. §1255(a)
Adjustment of status is available if: (1) the applicant files an application, (2) the applicant is eligible to receive an immigrant visa and is admissible to the United States for permanent residence, and (3) an immigrant visa is immediately available. For immediate relatives of U.S. citizens (spouses, parents, unmarried children under 21), an immigrant visa is ALWAYS immediately available as a matter of law under INA §201(b)(2)(A)(i).

2. THE BURDEN OF PROOF — Matter of Patel, 17 I&N Dec. 597 (BIA 1980)
VERBATIM QUOTE: "The grant of an application for adjustment of status under section 245 is a matter of administrative grace. An applicant has the burden of showing that discretion should be exercised in his favor."
USE: Cite this case to establish that the applicant must affirmatively demonstrate merit. The brief's structure is the mechanism for satisfying that burden.

3. THE BALANCING TEST — Matter of Marin, 16 I&N Dec. 581, 584-85 (BIA 1978)
VERBATIM QUOTE (balancing test): "The immigration judge must balance the adverse factors evidencing an alien's undesirability as a permanent resident with the social and humane considerations presented in his behalf to determine whether the granting of section 212(c) relief appears in the best interests of this country."
VERBATIM QUOTE (elevated standard): "As the negative factors grow more serious, it becomes incumbent upon the applicant to introduce additional offsetting favorable evidence, which in some cases may have to involve unusual or outstanding equities."
FAVORABLE FACTORS MARIN RECOGNIZES: family ties within the United States; residence of long duration (particularly when residency began at a young age); evidence of hardship to the respondent and family if removal occurs; service in this country's Armed Forces; history of employment; existence of property or business ties; evidence of value and service to the community; proof of genuine rehabilitation if a criminal record exists; other evidence attesting to good character.
ADVERSE FACTORS MARIN RECOGNIZES: nature and circumstances of the inadmissibility ground at issue; additional significant immigration law violations; existence of a criminal record (nature, recency, seriousness); other evidence of bad character or undesirability.
USE: Establish the balancing test as the operative framework. Then use Marin's elevated standard in reverse — because the adverse factors here are limited, the elevated standard does not apply.

4. THE BASELINE RULE — Matter of Arai, 13 I&N Dec. 494, 496 (BIA 1970)
VERBATIM QUOTE: "In the absence of adverse factors, adjustment will ordinarily be granted, still as a matter of discretion."
USE: After presenting positive equities, cite Arai to establish that where adverse factors are not serious, the baseline rule favors approval. The brief's job is to show the applicant falls under Arai, not under the elevated Marin standard.

5. QUALITY OF FAMILY RELATIONSHIPS — Matter of Mendez-Morales, 21 I&N Dec. 296, 301 (BIA 1996)
VERBATIM QUOTE: "If the alien has relatives in the United States, the quality of their relationship must be considered in determining the weight to be awarded this equity."
USE: When developing the family ties section, close with this citation to signal that the quality of the relationship — not merely its existence — has been established.

6. REHABILITATION — Matter of Edwards, 20 I&N Dec. 191, 196 (BIA 1990)
VERBATIM QUOTE: "A clear showing of reformation is not an absolute prerequisite to a favorable exercise of discretion in every section 212(c) application involving an alien with a criminal record; therefore, section 212(c) applications involving convicted aliens must be evaluated on a case-by-case basis, with rehabilitation a factor to be considered in the exercise of discretion."
USE: Only when the applicant has a criminal record. Cite to prevent automatic denial based on the existence of past conduct.

7. USCIS POLICY MANUAL — 1 USCIS-PM E.8
KEY QUOTE: "Where an immigration benefit is discretionary, meeting the statutory and regulatory requirements alone does not entitle the requestor to the benefit sought."
USE: Cite this alongside BIA cases whenever a favorable factor is presented. It signals to the officer that the brief is applying their own framework.

8. THE UNLAWFUL PRESENCE BAR — INA §212(a)(9)(B)
KEY RULE: The 3-year and 10-year unlawful presence bars are triggered by DEPARTURE from the United States — not by continued presence. An applicant who has overstayed but has not departed does NOT face these bars. Departure for consular processing would trigger the very bars that do not currently apply. Adjustment of status avoids this consequence.
USE: In the AOS mechanism section, explain that adjustment is the appropriate mechanism because departure would impose consequences the statute was designed to allow the applicant to avoid.

WRITING RULES YOU MUST FOLLOW:

1. The case theme appears in the opening of the Argument section, in the balancing closing, and in the Conclusion. Do not omit it from any of these positions.
2. Section headings are argument claims about this specific client — not category labels. "Family Unity" is a category label. "[Applicant]'s 40-Year Nursing Career Makes Her Uniquely Qualified to Care for Her Autistic U.S. Citizen Grandson" is an argument claim.
3. Minor equities are bundled — do not give each minor equity its own paragraph heading.
4. The adverse section heading MUST NOT contain the words "Immigration Violations," "Overstay," or "Unlawful Presence." It must frame the discussion as a proportionality argument.
5. All citations go in footnotes only. The body of the brief contains no in-text parenthetical citations.
6. Use verbatim quotes from the legal authorities listed above. Do not paraphrase them.
7. Cite the USCIS Policy Manual alongside BIA case law whenever a favorable factor is presented.
8. Do not use the word "rebuttal." This is a filing in support, not an opposition brief.
9. Do not apologize. Do not use "unfortunately," "we acknowledge," or "while it is true that."
10. Every factual claim must be documentable. Do not add facts that are not in the provided intake.
11. Use brackets [LIKE THIS] to mark any fact that requires attorney confirmation.
12. The balancing section must close with: "This is not a case about [adverse factor]. It is a case about [case theme restated]. A favorable exercise of discretion is both legally supported and compelled by the facts of this record."

OUTPUT FORMAT:

When asked to draft a section, output:
- HEADING: [the section heading]
- BODY: [the prose, with no in-text citations]
- FOOTNOTES: [numbered footnotes for all citations used in this section, using the format: 1. Matter of Arai, 13 I&N Dec. 494, 496 (BIA 1970).]

Do not output anything outside this format.
```

### 8.2 User Prompt Per Section (Send Separately for Each FILL Section)

```python
def build_section_prompt(section, facts):
    """
    Build the user-turn prompt for generating a specific section.
    """
    ca = facts["case_facts"]["case_architecture"]
    pf = facts["case_facts"]["positive_factors"]
    af = facts["case_facts"]["adverse_factors"]
    app = facts["case_facts"]["applicant"]
    
    # Build the facts narrative for this section
    if section["section_id"] == "section_a":
        facts_narrative = f"""
PRIMARY EQUITY SECTION FACTS:
Section heading (use exactly): {ca['section_a_heading']}
Applicant name: {app['full_name']}
Applicant pronouns: {app['pronoun_subject']}/{app['pronoun_object']}/{app['pronoun_possessive']}
Case theme: {ca['case_theme']}
Facts to develop:
{ca.get('section_a_facts', '[No Section A facts provided]')}
Family members and relationship quality:
{format_family_facts(pf['family_ties'])}
Citations to include: Matter of Marin (16 I&N Dec. 581), Matter of Mendez-Morales (21 I&N Dec. 296), 1 USCIS-PM E.8(C)(2)
Include Mendez-Morales: {ca.get('include_mendez', True)}
Length: 2-4 substantive paragraphs. The first paragraph introduces the centerpiece equity. Middle paragraphs develop specific facts. Final paragraph connects to legal standard and cites authority.
"""

    elif section["section_id"] == "section_b":
        facts_narrative = f"""
SECONDARY EQUITY SECTION FACTS:
Section heading (use exactly): {ca['section_b_heading']}
Applicant name: {app['full_name']}
Applicant pronouns: {app['pronoun_subject']}/{app['pronoun_object']}/{app['pronoun_possessive']}
Facts to develop (bundle all of these into 2-4 paragraphs — do not give each its own sub-heading):
{ca.get('section_b_facts', '[No Section B facts provided]')}
Humanitarian factors: {format_humanitarian(pf.get('humanitarian', {}))}
Employment: {format_employment(pf.get('employment_and_economic', {}))}
Community: {format_community(pf.get('community_and_moral_character', {}))}
Citations to include: Matter of Marin (16 I&N Dec. 581), 1 USCIS-PM E.8(C)(2)
"""

    elif section["section_id"] == "section_d_adverse":
        facts_narrative = f"""
ADVERSE FACTORS SECTION FACTS:
Section heading (use exactly): {ca['adverse_heading']}
Applicant name: {app['full_name']}
Applicant pronouns: {app['pronoun_subject']}/{app['pronoun_object']}/{app['pronoun_possessive']}
Adverse fact: {af['primary_adverse']['description']}
Context (why it arose): {af['primary_adverse']['context']}
Adverse factor type: {af['primary_adverse']['type']}
Is fraud involved: {af['primary_adverse']['is_fraud']}
Length: 1-2 paragraphs ONLY. No more.
Instructions: (1) State the adverse fact directly in the first sentence. Do not obscure it. (2) Provide context in remaining sentences. (3) Establish this does not trigger the elevated Marin standard. (4) Cite Matter of Arai (13 I&N Dec. 494) to establish the baseline rule applies.
Do NOT use these words in the heading: Immigration Violations, Overstay, Unlawful Presence
"""

    elif section["section_id"] == "section_e_balancing":
        facts_narrative = f"""
BALANCING SECTION FACTS:
Applicant name: {app['full_name']}
Applicant pronouns: {app['pronoun_subject']}/{app['pronoun_object']}/{app['pronoun_possessive']}
Adverse factor (one phrase): {ca['adverse_factor_brief']}
Positive equities inventory: {ca.get('balancing_inventory', '[List positive equities from Sections A and B]')}
Case theme (for closing sentence): {ca['case_theme_brief']}
Citations to include: Matter of Arai (13 I&N Dec. 494), Matter of Marin (16 I&N Dec. 581)
The FINAL SENTENCE must be exactly: "This is not a case about {ca['adverse_factor_brief']}. It is a case about {ca['case_theme_brief']}. A favorable exercise of discretion is both legally supported and compelled by the facts of this record."
Length: 2-3 paragraphs.
"""

    else:
        facts_narrative = f"[Unknown section: {section['section_id']}]"

    return f"Draft the following section of the AOS Discretionary Memorandum:\n\n{facts_narrative}"


def format_family_facts(family_ties):
    members = family_ties.get("members", [])
    lines = [
        f"  - {m['name']}: {m['relationship']}, status: {m['status']}, dependence: {m.get('dependence', 'N/A')}, relationship quality: {m.get('quality_description', 'N/A')}"
        for m in members
    ]
    notes = family_ties.get("quality_notes", "")
    return "\n".join(lines) + (f"\nAdditional notes: {notes}" if notes else "")
```

### 8.3 API Call (Python)

```python
import anthropic

def call_api(system_prompt, user_prompt, model="claude-opus-4-8"):
    """
    Call the Anthropic API to generate brief prose.
    Returns the generated text, or None if the API call fails.
    """
    client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
    
    try:
        message = client.messages.create(
            model=model,
            max_tokens=2048,
            system=system_prompt,
            messages=[
                {"role": "user", "content": user_prompt}
            ]
        )
        return message.content[0].text
    except Exception as e:
        print(f"API call failed: {e}")
        return None


def parse_api_response(response_text):
    """
    Parse the structured API response into heading, body, and footnotes.
    """
    result = {"heading": None, "body": "", "footnotes": []}
    
    lines = response_text.strip().split("\n")
    current_section = None
    buffer = []
    
    for line in lines:
        if line.startswith("HEADING:"):
            current_section = "heading"
            result["heading"] = line[8:].strip()
        elif line.startswith("BODY:"):
            if buffer and current_section == "heading":
                buffer = []
            current_section = "body"
            remaining = line[5:].strip()
            if remaining:
                buffer.append(remaining)
        elif line.startswith("FOOTNOTES:"):
            if current_section == "body":
                result["body"] = "\n".join(buffer).strip()
                buffer = []
            current_section = "footnotes"
        else:
            if current_section in ("body", "footnotes"):
                buffer.append(line)
    
    # Flush remaining buffer
    if current_section == "body" and buffer:
        result["body"] = "\n".join(buffer).strip()
    elif current_section == "footnotes" and buffer:
        result["footnotes"] = [l.strip() for l in buffer if l.strip()]
    
    return result
```

---

## Part 9 — Quality Validation (No API Required)

After generation, run these checks before presenting the brief to the attorney.

```python
def validate_brief(sections_assembled, facts):
    """
    Run all quality checks on the assembled brief.
    Returns a validation report with passed and failed checks.
    """
    errors = []
    warnings = []
    
    case_theme = facts["case_facts"]["case_architecture"]["case_theme"]
    adverse_factor_brief = facts["case_facts"]["case_architecture"]["adverse_factor_brief"]
    applicant_name = facts["case_facts"]["applicant"]["full_name"]
    
    full_text = "\n\n".join([s.get("body", "") for s in sections_assembled])
    headings  = [s.get("heading", "") for s in sections_assembled if s.get("heading")]
    
    # ── STRUCTURAL CHECKS ──────────────────────────────────────────
    
    # Theme appears in balancing section
    balancing = next((s for s in sections_assembled 
                      if "balancing" in (s.get("section_id") or "").lower()), None)
    if balancing:
        balancing_text = balancing.get("body", "")
        closing = f"This is not a case about"
        if closing not in balancing_text:
            errors.append("FAIL: Balancing section does not contain 'This is not a case about' closing.")
    else:
        errors.append("FAIL: Balancing section (III-E) not found in output.")
    
    # Theme appears in conclusion
    conclusion = next((s for s in sections_assembled 
                       if "conclusion" in (s.get("section_id") or "").lower()), None)
    if conclusion and case_theme[:30] not in conclusion.get("body", ""):
        warnings.append("WARN: Case theme may not appear in Conclusion section.")
    
    # ── HEADING CHECKS ─────────────────────────────────────────────
    
    # Adverse heading does not use forbidden words
    adverse = next((s for s in sections_assembled 
                    if "adverse" in (s.get("section_id") or "").lower() 
                    or "section_d" in (s.get("section_id") or "").lower()), None)
    if adverse:
        h = (adverse.get("heading") or "").lower()
        for forbidden in ["immigration violation", "overstay", "unlawful presence"]:
            if forbidden in h:
                errors.append(f"FAIL: Adverse section heading contains forbidden word '{forbidden}'.")
    
    # No heading is a category label (rough check)
    category_labels = ["family unity", "humanitarian concerns", "good moral character",
                       "community ties", "employment history", "adverse factors", 
                       "immigration violations", "immigration history"]
    for heading in headings:
        if heading.lower().strip() in category_labels:
            errors.append(f"FAIL: Section heading '{heading}' is a category label, not an argument claim.")
    
    # ── CITATION CHECKS ────────────────────────────────────────────
    
    # In-text citations (citations should be in footnotes only)
    in_text_cite_pattern = r'\(\w+ of \w+,\s+\d+ I&N'
    for section in sections_assembled:
        body = section.get("body", "")
        if re.search(in_text_cite_pattern, body):
            errors.append(f"FAIL: In-text citation found in section '{section.get('section_id')}'. Citations must be in footnotes only.")
    
    # Core citations must be present
    footnote_text = "\n".join([fn.get("text", "") for fn in sections_assembled 
                                if isinstance(fn, dict)])
    # Check in the assembled footnotes list instead
    # (caller should pass footnotes separately for this check)
    
    # ── FACTUAL CHECKS ─────────────────────────────────────────────
    
    # Unresolved brackets
    bracket_pattern = r'\[[^\]]{5,100}\]'
    for section in sections_assembled:
        matches = re.findall(bracket_pattern, section.get("body", ""))
        for m in matches:
            # Distinguish intentional legal citation brackets [INA §245(a)] from fill brackets
            if not any(x in m for x in ["INA", "8 U.S.C.", "§", "BIA", "I&N Dec."]):
                warnings.append(f"WARN: Unresolved bracket in '{section.get('section_id')}': {m[:60]}...")
    
    # Applicant name appears in brief
    if applicant_name not in full_text:
        errors.append(f"FAIL: Applicant name '{applicant_name}' not found in brief text.")
    
    # ── LANGUAGE CHECKS ────────────────────────────────────────────
    
    forbidden_phrases = [
        ("rebuttal", "ERROR"),
        ("in rebuttal", "ERROR"),
        ("unfortunately", "WARNING"),
        ("we regret", "WARNING"),
        ("while it is true that", "WARNING"),
        ("it should be noted that", "WARNING"),
        ("we wish to point out", "WARNING"),
    ]
    
    for phrase, severity in forbidden_phrases:
        if phrase in full_text.lower():
            if severity == "ERROR":
                errors.append(f"FAIL: Forbidden phrase '{phrase}' found in brief.")
            else:
                warnings.append(f"WARN: Weak phrasing '{phrase}' found — consider removing.")
    
    return {
        "passed": len(errors) == 0,
        "error_count": len(errors),
        "warning_count": len(warnings),
        "errors": errors,
        "warnings": warnings
    }
```

---

## Part 10 — Complete Processing Flow (Putting It Together)

This is the entry point function that runs the entire pipeline.

```python
def generate_aos_brief(docx_template_path_or_template_json, 
                       client_facts_json, 
                       output_path,
                       api_key=None,
                       system_prompt=None):
    """
    Generate an AOS Discretionary Brief.
    
    Args:
        docx_template_path_or_template_json: Either a .docx file to parse,
            or a pre-parsed template JSON dict
        client_facts_json: The client facts dict (see Part 6 schema)
        output_path: Where to write the output .docx
        api_key: Optional Anthropic API key for prose generation
        system_prompt: Optional override for the system prompt (use Part 8.1 default)
    
    Returns:
        dict: { "output_path": str, "validation": dict, "api_used": bool }
    """
    
    # ── Step 1: Load Template ────────────────────────────────────────
    if isinstance(docx_template_path_or_template_json, str):
        # Parse from .docx
        blocks = parse_docx_to_blocks(docx_template_path_or_template_json)
        sections = group_blocks_into_sections(blocks)
        template = classify_and_build_template(sections)
    else:
        template = docx_template_path_or_template_json
    
    facts = client_facts_json
    
    # ── Step 2: Validate Required Inputs ────────────────────────────
    missing = validate_required_inputs(facts, template)
    if missing:
        return {
            "error": "Missing required inputs",
            "missing_fields": missing
        }
    
    # ── Step 3: Initialize API Client (if key provided) ─────────────
    api_available = bool(api_key)
    sp = system_prompt or SYSTEM_PROMPT_PART_8_1  # constant from Part 8.1
    
    # ── Step 4: Assemble Each Section ───────────────────────────────
    assembled_sections = []
    all_footnotes_used = set()
    
    for section in template["sections"]:
        classification = section["classification"]
        
        if classification == "PRESERVE":
            body = assemble_preserve_section(section, facts)
        
        elif classification in ("FILL", "BOILERPLATE"):
            if section.get("api_assistance") == "required" and api_available:
                user_prompt = build_section_prompt(section, facts)
                raw_response = call_api(sp, user_prompt)
                if raw_response:
                    parsed = parse_api_response(raw_response)
                    body = parsed["body"]
                    all_footnotes_used.update(parsed["footnotes"])
                else:
                    body = assemble_fill_section_no_api(section, facts)
            else:
                body = assemble_fill_section_no_api(section, facts)
        
        elif classification == "CAPTION":
            body, _ = apply_simple_substitutions(
                section.get("fill_template", ""), facts
            )
        
        else:
            body = section.get("preserved_text", "")
        
        # Track citations embedded in PRESERVE sections
        for cite_key in section.get("citations_to_include", []):
            all_footnotes_used.add(cite_key)
        
        assembled_sections.append({
            "section_id": section["section_id"],
            "heading": section.get("heading"),
            "level": section.get("level", 1),
            "body": body
        })
    
    # ── Step 5: Assemble Footnotes ────────────────────────────────────
    footnotes = assemble_footnotes(template["footnotes"], list(all_footnotes_used))
    
    # ── Step 6: Build .docx ───────────────────────────────────────────
    build_output_docx(assembled_sections, footnotes, facts, output_path)
    
    # ── Step 7: Validate ─────────────────────────────────────────────
    validation = validate_brief(assembled_sections, facts)
    
    return {
        "output_path": output_path,
        "validation": validation,
        "api_used": api_available,
        "sections_generated": len(assembled_sections),
        "footnotes_count": len(footnotes)
    }
```

---

## Part 11 — What Works Without API vs. What Needs API

This section exists so a developer building the standalone site knows exactly what they can promise without an API connection.

### Without API — Fully Deterministic Output

The system produces a complete, legally accurate, structurally correct AOS brief with no API required for:

- Section I (Legal Standard) — verbatim from template, always correct
- Section II (Statutory Eligibility) — template with simple substitution; factually accurate if facts are accurate
- Section III-C (AOS Mechanism) — verbatim from template with departure harm filled in
- Section III-E closing sentence — verbatim template ("This is not a case about...")
- Section IV (Conclusion) — verbatim template with name and theme substituted
- All footnotes — assembled from preserved citations; factually and legally accurate
- Cover page — CAPTION fields substituted
- Document structure, headings, page layout — fully deterministic

**What the attorney gets without API:** A complete brief where every legal standard is correctly stated, every citation is accurate, every structural requirement is met. The FILL sections (A, B, D, and the narrative portions of E) contain structured placeholder text showing exactly what facts will be developed.

### With API — Enhanced Prose for FILL Sections

The API generates:
- Section III-A prose (primary equity development)
- Section III-B prose (secondary equities, bundled)
- Section III-D prose (adverse factors framing)
- Section III-E narrative prose (balancing, before the template closing sentence)
- The opening paragraph of Section III (argument intro)

**What the attorney gets with API:** A brief ready for attorney review and light editing, with all structural and legal requirements met and all FILL sections written in filing-quality prose derived from the client's facts.

---

## Part 12 — Technology Stack Recommendations

### For a Standalone Web Application

| Layer | Technology | Why |
|-------|-----------|-----|
| Backend (parsing) | Python 3.10+ | `python-docx` is mature and handles .docx reliably |
| Backend (generation) | Python 3.10+ | Anthropic Python SDK |
| Backend (document output) | `python-docx` + `PyMuPDF` | .docx for editing; PDF for viewing |
| API | Anthropic API (claude-opus-4-8 or claude-sonnet-4-6) | Use Sonnet for speed/cost; Opus for quality |
| Template storage | JSON files or SQLite | One JSON per template type |
| Intake form | HTML form or web framework | Collect all fields from Part 6 schema |
| Frontend | Any — React, Vue, plain HTML | Not constrained |

### Minimum Dependencies

```
python-docx==1.1.2      # Parse and build .docx files
PyMuPDF==1.24.0         # PDF viewing/annotation (optional for output)
anthropic==0.28.0       # API client (optional for prose generation)
reportlab==4.2.0        # PDF creation (optional alternative)
```

### Environment Variables Required

```
ANTHROPIC_API_KEY=sk-ant-...    # Required only for API-assisted prose generation
TEMPLATE_DIR=./templates/       # Path to stored template JSON files
OUTPUT_DIR=./output/            # Path for generated brief files
```

---

## Part 13 — Classification Decision Quick Reference

When classifying a paragraph and the rules in Part 4 do not produce a clear result, use this flowchart:

```
Does the paragraph contain a specific date (Month DD, YYYY)?
  → YES: FILL

Does the paragraph contain an applicant name, A-number, or receipt number?
  → YES: FILL

Does the paragraph contain a BIA citation (Matter of X, Y I&N Dec. Z)?
  → YES, AND it contains no specific client facts: PRESERVE
  → YES, BUT it also contains client-specific facts: FILL (preserve the citation in footnotes)

Does the paragraph contain verbatim language from a statute ("section 245", "INA §")?
  → YES, AND it explains the rule abstractly: PRESERVE
  → YES, AND it applies the rule to the specific client: FILL

Does the paragraph describe what the law requires in general terms?
  → YES: PRESERVE

Does the paragraph describe what THIS applicant did, has, or needs?
  → YES: FILL

Is the paragraph a signature block, certificate of service, or date of filing?
  → BOILERPLATE

Is the paragraph the document title, applicant name block, or case identifying information?
  → CAPTION
```

---

*Kingdom Counsel Firm | kingdomcounselfirm@gmail.com | Immigration Law Practice*  
*Internal technical documentation. Not for distribution.*
