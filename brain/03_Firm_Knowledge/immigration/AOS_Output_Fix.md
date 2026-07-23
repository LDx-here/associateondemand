# AOS Brief Output Fix
## Kingdom Counsel Firm — System Correction Guide

**Problem:** The current system outputs template labels and raw intake facts as the brief body, instead of assembled legal prose.

**Root cause:** Three disconnected layers — the assembly layer outputs its instructions, the PRESERVE slots hold labels not text, and there is no transformation step between facts and paragraphs.

**This document:** Exact corrections, in order. Each fix is independent — apply them in sequence.

---

## Fix 1 — Load Actual Text Into PRESERVE Slots

The template JSON currently stores labels like `[PRESERVE from firm template] INA §245(a) / Matter of Marin`. These labels need to be replaced with the actual verbatim prose.

### Where to Make This Change

In your template JSON (or wherever your system stores section content), find every section with `classification: "PRESERVE"` and populate its `preserved_text` field with the verbatim content below.

---

### PRESERVE TEXT 1 — Legal Standard (Section I)

**Section ID:** `legal_standard`  
**Heading:** `I. LEGAL STANDARD`

Paste this verbatim into `preserved_text`:

```
Section 245 of the Immigration and Nationality Act provides that the Attorney General 
may, in his discretion, adjust the status of an alien to that of a lawful permanent 
resident if: (1) the alien makes an application for such adjustment; (2) the alien is 
eligible to receive an immigrant visa and is admissible for permanent residence; and 
(3) an immigrant visa is immediately available at the time the application is filed. 
INA §245(a), 8 U.S.C. §1255(a).

The grant of an application for adjustment of status under section 245 is "a matter of 
administrative grace." Matter of Patel, 17 I&N Dec. 597, 601 (BIA 1980). An applicant 
bears "the burden of showing that discretion should be exercised in his favor." Id. 
USCIS exercises this discretion by balancing the totality of the circumstances, weighing 
favorable and adverse factors to determine whether a grant of adjustment "appears in the 
best interests of this country." Matter of Marin, 16 I&N Dec. 581, 584 (BIA 1978).

The Board of Immigration Appeals has identified favorable factors that may be considered 
in an adjustment case, including: family ties within the United States; residence of long 
duration in this country, particularly where the alien began residency at a young age; 
evidence of hardship to the respondent and family if adjustment is denied; a history of 
employment; evidence of value and service to the community; proof of genuine 
rehabilitation if a criminal record exists; and other evidence attesting to good character. 
Matter of Marin, 16 I&N Dec. at 584–85.

Adverse factors include the nature and underlying circumstances of the ground of 
inadmissibility at issue, the presence of additional significant violations of this 
country's immigration laws, the existence of a criminal record and, if so, its nature, 
recency, and seriousness, and the presence of other evidence indicative of bad character 
or undesirability as a permanent resident. Id. at 584.

"[I]n the absence of adverse factors, adjustment will ordinarily be granted, still as 
a matter of discretion." Matter of Arai, 13 I&N Dec. 494, 496 (BIA 1970). Where adverse 
factors are not serious, the applicant need not demonstrate "unusual or outstanding 
equities" — that heightened standard applies only where negative factors are significant. 
Matter of Marin, 16 I&N Dec. at 585. USCIS has adopted this framework as the governing 
standard for discretionary analysis. 1 USCIS-PM E.8(A).
```

**Footnotes for this section:**
```
1. INA §245(a), 8 U.S.C. §1255(a).
2. Matter of Patel, 17 I&N Dec. 597, 601 (BIA 1980).
3. Matter of Marin, 16 I&N Dec. 581, 584 (BIA 1978).
4. Matter of Arai, 13 I&N Dec. 494, 496 (BIA 1970).
5. 1 USCIS-PM E.8(A), available at https://www.uscis.gov/policy-manual/volume-1-part-e-chapter-8.
```

---

### PRESERVE TEXT 2 — AOS Mechanism (Section III-C)

**Section ID:** `section_c_aos_mechanism`  
**Heading:** `C. Congress Created Adjustment of Status to Permit Eligible Applicants to Complete the Immigration Process Without Needless Family Separation`

Slots in this text: `##APPLICANT_FULL_NAME##`, `##APPLICANT_PRONOUN_SUBJECT##`, `##DEPARTURE_BAR_TYPE##`, `##DEPARTURE_HARM##`

```
Congress created adjustment of status to permit eligible applicants who were lawfully 
admitted to the United States to complete the immigration process without the family 
separation, disruption, and legal risk that consular processing would impose. For an 
applicant in ##APPLICANT_FULL_NAME##'s position, this statutory design is not a 
technicality — it is the operative mechanism that makes a grant of permanent residence 
practically available.

A critical consequence of consular processing is that departure from the United States 
would trigger the unlawful presence bars under INA §212(a)(9)(B), 8 U.S.C. 
§1182(a)(9)(B). ##APPLICANT_FULL_NAME## has accumulated unlawful presence. Were 
##APPLICANT_PRONOUN_SUBJECT## required to depart and process the immigrant visa at a 
consular post abroad, the ##DEPARTURE_BAR_TYPE## bar under INA §212(a)(9)(B) would 
attach upon departure. These bars are triggered by departure — not by continued presence. 
They do not currently apply to ##APPLICANT_FULL_NAME##.

##DEPARTURE_HARM## Adjustment of status is the only available mechanism for completing 
the immigration process without transforming a currently available path to permanent 
residence into an indefinitely blocked one.
```

**Footnotes for this section:**
```
6. INA §212(a)(9)(B), 8 U.S.C. §1182(a)(9)(B).
7. INA §212(a)(9)(B)(i)(I) (three-year bar for 180+ days unlawful presence); INA §212(a)(9)(B)(i)(II) (ten-year bar for 365+ days unlawful presence).
```

---

### PRESERVE TEXT 3 — Conclusion (Section IV)

**Section ID:** `conclusion`  
**Heading:** `IV. CONCLUSION`

Slots: `##APPLICANT_FULL_NAME##`, `##CASE_THEME##`, `##ATTORNEY_NAME##`, `##FIRM_NAME##`, `##BAR_NUMBER##`, `##DATE##`

```
For the foregoing reasons, ##APPLICANT_FULL_NAME## respectfully requests that U.S. 
Citizenship and Immigration Services exercise its discretion favorably and approve the 
pending Application to Register Permanent Residence or Adjust Status (Form I-485).

##APPLICANT_FULL_NAME## has demonstrated both statutory eligibility and compelling grounds 
for a favorable exercise of discretion. ##CASE_THEME## The equities presented — documented, 
concrete, and substantial — satisfy the applicant's burden under Matter of Patel and 
warrant approval under the framework established in Matter of Arai and Matter of Marin.

A favorable exercise of discretion is warranted.

                                   Respectfully submitted,

                                   ##ATTORNEY_NAME##
                                   ##FIRM_NAME##
                                   Bar No. ##BAR_NUMBER##
                                   ##DATE##
```

---

## Fix 2 — Replace the FILL Output with Paragraph Library Lookup

### The Problem (Current Behavior)

Your current system is doing something like this for FILL sections:

```python
# CURRENT — WRONG
section.output = f"[FILL with matter facts] {intake_facts_as_string}"
# or
section.output = section.label + "\n" + str(section.slots)
```

### The Fix

Replace that with a library lookup. The paragraph library (`AOS_Paragraph_Library.json`) contains pre-written attorney-quality paragraphs indexed by equity type, adverse type, and scenario. The fix is:

```python
import json
import re

# Load the paragraph library once at startup
with open("AOS_Paragraph_Library.json", "r") as f:
    LIBRARY = json.load(f)


def fill_section(section_id, facts):
    """
    Replace the FILL output logic.
    Looks up the right paragraph(s) from the library based on facts,
    substitutes client-specific slots, and returns filing-quality prose.
    """
    ca = facts.get("case_architecture", {})
    pf = facts.get("positive_factors", {})
    af = facts.get("adverse_factors", {})
    app = facts.get("applicant", {})

    if section_id == "argument_intro":
        return build_argument_intro(facts, LIBRARY)

    elif section_id == "section_a":
        return build_primary_equity(facts, LIBRARY)

    elif section_id == "section_b":
        return build_secondary_equities(facts, LIBRARY)

    elif section_id == "section_d_adverse":
        return build_adverse_section(facts, LIBRARY)

    elif section_id == "section_e_balancing":
        return build_balancing(facts, LIBRARY)

    else:
        return f"[SECTION {section_id} — no handler defined]"


def substitute_slots(template_text, facts):
    """
    Replace all ##SLOT## markers with values from facts.
    Facts dict should be pre-flattened (see flatten_facts below).
    """
    flat = flatten_facts(facts)
    result = template_text

    for match in re.finditer(r'##([A-Z_]+)##', template_text):
        key = match.group(1).lower()
        value = flat.get(key, f"[{match.group(1)} — required]")
        result = result.replace(match.group(0), value)

    return result


def flatten_facts(facts):
    """Flatten nested facts dict into a single-level dict with snake_case keys."""
    result = {}

    app = facts.get("applicant", {})
    result["applicant_full_name"]        = app.get("full_name", "")
    result["applicant_a_number"]         = app.get("a_number", "")
    result["applicant_dob"]              = app.get("date_of_birth", "")
    result["applicant_pronoun_subject"]  = app.get("pronoun_subject", "the applicant")
    result["applicant_pronoun_object"]   = app.get("pronoun_object", "the applicant")
    result["applicant_pronoun_possessive"] = app.get("pronoun_possessive", "the applicant's")
    result["applicant_pronoun_subject_cap"] = app.get("pronoun_subject", "The applicant").capitalize()

    entry = facts.get("entry_and_immigration_history", {})
    result["entry_date"]       = entry.get("last_entry_date", "")
    result["port_of_entry"]    = entry.get("last_entry_port", "")
    result["entry_visa_type"]  = entry.get("last_entry_visa_type", "")
    result["authorized_stay"]  = entry.get("authorized_stay_expiration", "")

    petition = facts.get("petition", {})
    result["petitioner_name"]         = petition.get("petitioner_name", "")
    result["petitioner_relationship"] = petition.get("petitioner_relationship", "")
    result["i130_filed_date"]         = petition.get("i130_filed_date", "")
    result["i130_approved_date"]      = petition.get("i130_approved_date", "")
    result["i485_filed_date"]         = petition.get("i485_filed_date", "")

    ca = facts.get("case_architecture", {})
    result["case_theme"]         = ca.get("case_theme", "")
    result["case_theme_brief"]   = ca.get("case_theme_brief", "")
    result["adverse_factor_brief"] = ca.get("adverse_factor_brief", "")
    result["section_a_heading"]  = ca.get("section_a_heading", "")
    result["section_b_heading"]  = ca.get("section_b_heading", "")
    result["adverse_heading"]    = ca.get("adverse_heading", "")

    atty = facts.get("attorney", {})
    result["attorney_name"] = atty.get("attorney_name", "")
    result["firm_name"]     = atty.get("firm_name", "")
    result["bar_number"]    = atty.get("bar_number", "")
    result["date"]          = facts.get("meta", {}).get("prepared_date", "")

    return result
```

---

## Fix 3 — Section Builders (The Missing Bridge)

These are the functions that build each FILL section. They select the right paragraphs from the library based on the intake facts and stitch them into a section.

### Argument Intro

```python
def build_argument_intro(facts, library):
    app = facts["applicant"]
    ca  = facts["case_architecture"]

    template = library["argument"]["intro_template"]
    return substitute_slots(template, facts)
```

### Section A — Primary Equity

```python
def build_primary_equity(facts, library):
    pf = facts.get("positive_factors", {})
    ca = facts.get("case_architecture", {})

    # Determine which primary equity template to use
    family = pf.get("family_ties", {})
    members = family.get("members", [])

    has_autistic_dependent = any(
        "autism" in m.get("quality_description", "").lower() or
        "autistic" in m.get("quality_description", "").lower() or
        "autism" in m.get("dependence", "").lower()
        for m in members
    )
    has_disabled_dependent = any(
        m.get("dependence") and m.get("status") == "US_citizen"
        for m in members
    )
    has_minor_usc_children = any(
        m.get("relationship") in ("son", "daughter", "child") and
        m.get("status") == "US_citizen"
        for m in members
    )

    # Select paragraph template
    if has_autistic_dependent:
        template_key = "caregiver_autistic_dependent"
    elif has_disabled_dependent:
        template_key = "caregiver_disabled_dependent"
    elif has_minor_usc_children:
        template_key = "parent_usc_minor_children"
    else:
        template_key = "family_ties_general"

    para = library["equity"][template_key]["paragraph"]

    # Inject the primary family member's details
    primary_member = members[0] if members else {}
    extra_facts = dict(facts)
    extra_facts["applicant"] = dict(facts["applicant"])
    extra_facts["applicant"]["dependent_name"]         = primary_member.get("name", "[Dependent Name]")
    extra_facts["applicant"]["dependent_relationship"] = primary_member.get("relationship", "family member")
    extra_facts["applicant"]["dependent_condition"]    = primary_member.get("quality_description", "[condition]")
    extra_facts["applicant"]["dependent_dependence"]   = primary_member.get("dependence", "[nature of dependence]")
    extra_facts["applicant"]["care_description"]       = family.get("quality_notes", "[daily care description]")

    return (
        f"{ca.get('section_a_heading', 'A.')}\n\n"
        + substitute_slots(para, extra_facts)
    )
```

### Section B — Secondary Equities (Bundled)

```python
def build_secondary_equities(facts, library):
    pf  = facts.get("positive_factors", {})
    ca  = facts.get("case_architecture", {})
    app = facts.get("applicant", {})

    paragraphs = []

    # Humanitarian (age, medical)
    hum = pf.get("humanitarian", {})
    if hum.get("age") and hum["age"] >= 60:
        para = library["equity"]["age_elderly"]["paragraph"]
        extra = dict(facts)
        extra["applicant"] = dict(app)
        extra["applicant"]["applicant_age"] = str(hum["age"])
        paragraphs.append(substitute_slots(para, extra))

    # Employment / credentials
    emp = pf.get("employment_and_economic", {})
    if emp.get("professional_credentials") or emp.get("us_employment_history"):
        cred_list = emp.get("professional_credentials", [])
        emp_list  = emp.get("us_employment_history", [])
        cred_str  = "; ".join([f"{c['credential']} ({c['issuing_body']})" for c in cred_list]) if cred_list else ""
        emp_str   = "; ".join([f"{e['role']} at {e['employer']}" for e in emp_list]) if emp_list else ""
        extra = dict(facts)
        extra["applicant"] = dict(app)
        extra["applicant"]["credential_summary"] = cred_str or emp_str or "[credentials]"
        extra["applicant"]["employment_summary"]  = emp_str or "[employment history]"
        para = library["equity"]["employment_credentials"]["paragraph"]
        paragraphs.append(substitute_slots(para, extra))

    # Community / moral character
    comm = pf.get("community_and_moral_character", {})
    if comm.get("service_activities") or comm.get("religious_community"):
        svc  = comm.get("service_activities", [])
        rel  = comm.get("religious_community", "")
        svc_str = "; ".join([f"{s['role']} with {s['organization']}" for s in svc]) if svc else ""
        extra = dict(facts)
        extra["applicant"] = dict(app)
        extra["applicant"]["service_summary"]  = svc_str or "[community service activities]"
        extra["applicant"]["religious_community"] = rel or ""
        para = library["equity"]["community_service"]["paragraph"]
        paragraphs.append(substitute_slots(para, extra))

    # Clean criminal record
    if not comm.get("criminal_record"):
        para = library["equity"]["clean_criminal_record"]["paragraph"]
        paragraphs.append(substitute_slots(para, facts))

    heading = ca.get("section_b_heading", "B. Additional Favorable Equities")
    return heading + "\n\n" + "\n\n".join(paragraphs)
```

### Section D — Adverse Factors

```python
def build_adverse_section(facts, library):
    af = facts.get("adverse_factors", {})
    ca = facts.get("case_architecture", {})

    primary = af.get("primary_adverse", {})
    adverse_type = primary.get("type", "overstay")

    # Select paragraph template based on adverse type
    if adverse_type == "overstay":
        context_lower = primary.get("context", "").lower()
        if any(kw in context_lower for kw in ["medical", "illness", "surgery", "hospitalization", "emergency"]):
            template_key = "overstay_compelling_reason"
        else:
            template_key = "simple_overstay"
    elif adverse_type == "prior_removal":
        template_key = "prior_removal_old"
    elif adverse_type == "ewi":
        template_key = "entry_without_inspection"
    else:
        template_key = "simple_overstay"  # fallback

    para = library["adverse"][template_key]["paragraph"]

    extra = dict(facts)
    extra["applicant"] = dict(facts["applicant"])
    extra["applicant"]["adverse_description"] = primary.get("description", "[adverse fact]")
    extra["applicant"]["adverse_context"]      = primary.get("context", "[context]")
    extra["applicant"]["adverse_date"]         = primary.get("date_arose", "[date]")

    heading = ca.get("adverse_heading", "D. The Single Adverse Factor Is Isolated and Does Not Reflect Bad Character")
    return heading + "\n\n" + substitute_slots(para, extra)
```

### Section E — Balancing

```python
def build_balancing(facts, library):
    ca  = facts.get("case_architecture", {})
    pf  = facts.get("positive_factors", {})
    af  = facts.get("adverse_factors", {})

    adverse_type  = af.get("primary_adverse", {}).get("type", "overstay")
    family_members = pf.get("family_ties", {}).get("members", [])
    has_caregiver_role = any(m.get("dependence") for m in family_members)

    # Select inventory paragraph based on case profile
    if has_caregiver_role and adverse_type == "overstay":
        template_key = "balancing_caregiver_vs_overstay"
    else:
        template_key = "balancing_standard"

    inventory_para = library["balancing"][template_key]["paragraph"]
    closing_para   = library["balancing"]["closing_template"]["paragraph"]

    extra = dict(facts)
    extra["applicant"] = dict(facts["applicant"])
    extra["applicant"]["balancing_inventory"] = ca.get("balancing_inventory", "[positive equities from Sections A and B]")

    body = (
        substitute_slots(inventory_para, extra)
        + "\n\n"
        + substitute_slots(closing_para, extra)
    )

    heading = "E. The Balance of Equities Strongly Favors a Favorable Exercise of Discretion"
    return heading + "\n\n" + body
```

---

## Fix 4 — Wire It Into Your Main Generation Function

Find wherever your system produces the section output and replace the output assignment:

```python
# BEFORE (what your system is currently doing):
for section in template["sections"]:
    if section["classification"] == "PRESERVE":
        section["output"] = f"[PRESERVE from firm template] {section['label']}"
    elif section["classification"] == "FILL":
        section["output"] = f"[FILL with matter facts] {format_intake_as_string(facts)}"

# AFTER (corrected):
for section in template["sections"]:
    if section["classification"] == "PRESERVE":
        # Use the actual stored text — apply slot substitution for embedded slots
        raw_text = section.get("preserved_text", "")
        section["output"] = substitute_slots(raw_text, facts)

    elif section["classification"] == "FILL":
        # Use the paragraph library lookup
        section["output"] = fill_section(section["section_id"], facts)

    elif section["classification"] == "CAPTION":
        raw_text = section.get("fill_template", "")
        section["output"] = substitute_slots(raw_text, facts)

    elif section["classification"] == "BOILERPLATE":
        raw_text = section.get("preserved_text", "")
        section["output"] = substitute_slots(raw_text, facts)
```

---

## Fix 5 — The Certificate of Service

The certificate of service is currently outputting raw field labels. This section is BOILERPLATE — it needs a stored template, not a form dump. Replace the current output with this template:

```python
CERTIFICATE_OF_SERVICE_TEMPLATE = """
CERTIFICATE OF SERVICE

I hereby certify that on ##DATE##, a true and correct copy of the foregoing Memorandum 
in Support of Application for Adjustment of Status was served upon:

##PARTIES_SERVED##

by ##SERVICE_METHOD##.

                                   ##ATTORNEY_NAME##
                                   ##FIRM_NAME##
                                   Bar No. ##BAR_NUMBER##
"""
```

And populate it with:
```python
extra = dict(facts)
extra["applicant"] = dict(facts["applicant"])
extra["applicant"]["parties_served"]  = facts.get("service", {}).get("parties", "USCIS")
extra["applicant"]["service_method"]  = facts.get("service", {}).get("method", "electronic submission")
cos_text = substitute_slots(CERTIFICATE_OF_SERVICE_TEMPLATE, extra)
```

---

## Summary of Changes

| What's wrong | What to change | Where |
|-------------|---------------|-------|
| PRESERVE outputs labels, not text | Add verbatim text to `preserved_text` in template JSON (Fixes 1A, 1B, 1C above) | Template JSON |
| FILL outputs raw facts as string | Replace with `fill_section()` function + library lookup | Generator code |
| PRESERVE sections still have slots | Add `substitute_slots()` call before outputting | Generator code |
| FILL section builders not defined | Add the five `build_*` functions (Fix 3) | Generator code |
| Certificate of service is a form dump | Replace with BOILERPLATE template + substitution | Generator code |

**Result without API:** Legally accurate brief with verbatim legal standards, correct citations, and structured paragraph-library prose for every equity and adverse section.

**Result with API:** Same structure, but the FILL sections receive Claude API prose generation instead of library lookup — producing client-specific narrative that goes beyond what the library can express.

---

*Kingdom Counsel Firm | Internal Technical Documentation*
