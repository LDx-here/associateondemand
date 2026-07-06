# AssociateOnDemand: Practice-Specific Fact Mapping for Intelligent Intake

**Author:** Manus AI
**Date:** July 5, 2026
**Project:** AssociateOnDemand Strategic Pivot

## 1. Introduction

This document details the **Practice-Specific Fact Mapping** for the AssociateOnDemand Intelligent Intake Engine. The goal is to define the critical facts and documents required for specific project types within key practice areas. This mapping will enable the platform to dynamically prompt law firms for essential information, ensuring freelance attorneys receive comprehensive instructions and can produce high-quality, context-rich deliverables efficiently.

## 2. General Principles for Fact Mapping

For each project type, the fact mapping will identify:

*   **Core Facts**: Essential pieces of information that are universally required for the task.
*   **Supporting Documents**: Key documents that provide evidence or context for the facts.
*   **Conditional Facts**: Information that may be required based on specific circumstances or sub-types of the project.
*   **Firm Memory Integration**: Opportunities to leverage the firm's stored preferences (e.g., sample documents, style guides).

## 3. Practice Area: Immigration Law

### 3.1. Project Type: Asylum Brief Drafting

**Objective**: To draft a persuasive legal brief supporting an asylum claim.

| Fact Category | Specific Facts Required | Supporting Documents / Context |
| :--- | :--- | :--- |
| **Client Identity** | Full Name, Date of Birth, Nationality, A-Number | Client's Declaration, Passport/ID |
| **Persecution Narrative** | Detailed chronology of events, dates, locations, perpetrators, specific threats/harms suffered | Client's Declaration, Witness Affidavits, Police Reports, Medical Records |
| **Protected Ground** | Specific protected ground (race, religion, nationality, political opinion, particular social group), detailed explanation of nexus to persecution | Client's Declaration, Expert Witness Reports, Country Conditions Reports |
| **Corroborating Evidence** | Any evidence supporting the persecution claim | Country Conditions Reports, News Articles, Medical Records, Photos, Videos, Social Media Posts |
| **Prior Filings** | Details of any previous asylum applications, outcomes, appeals | Prior Application Forms (I-589), Decision Notices |
| **Legal Arguments** | Key legal theories, relevant statutes/regulations, controlling case law | Firm's Preferred Cases, Legal Research Memos |
| **Firm Style** | Preferred formatting, tone, citation style | Firm's Sample Briefs, Style Guide |

## 4. Practice Area: Personal Injury (PI)

### 4.1. Project Type: Demand Letter Drafting

**Objective**: To draft a comprehensive demand letter to an insurance company or opposing party, outlining liability and damages.

| Fact Category | Specific Facts Required | Supporting Documents / Context |
| :--- | :--- | :--- |
| **Client Identity** | Full Name, Contact Information | Client Intake Form, ID |
| **Incident Details** | Date, Time, Location of incident, Description of how incident occurred, Parties involved (at-fault party, insurance info) | Police Report, Incident Report, Witness Statements, Photos/Videos of Scene |
| **Liability Arguments** | Legal basis for liability, specific negligence/fault of at-fault party | Relevant Statutes, Case Law, Expert Witness Reports (e.g., accident reconstruction) |
| **Injuries & Treatment** | Detailed list of injuries, medical diagnoses, treatment received (dates, providers), prognosis, permanency | Medical Records (ER, hospital, physician notes), Billing Statements, Therapy Notes, Expert Medical Reports |
| **Damages (Economic)** | Medical bills (past & future), lost wages (past & future), property damage, other out-of-pocket expenses | Medical Bills, Wage Loss Verification (pay stubs, tax returns), Repair Estimates, Receipts |
| **Damages (Non-Economic)** | Pain and suffering, emotional distress, loss of enjoyment of life, disfigurement | Client's Journal, Witness Statements, Photos of Injuries |
| **Demand Amount** | Specific monetary demand, rationale for demand | Damages Calculation Worksheet, Settlement Offers/Demands |
| **Firm Style** | Preferred formatting, tone, standard clauses, settlement language | Firm's Sample Demand Letters, Style Guide |

## 5. Integration with Intelligent Intake Engine

This fact mapping will directly inform the dynamic prompting within the Intelligent Intake Engine. When a firm selects a specific project type, the system will use the corresponding fact schema to:

*   **Generate Targeted Questions**: Ask precise questions to gather each required fact.
*   **Request Specific Documents**: Prompt for the exact supporting documents needed.
*   **Leverage "Strong Reader"**: Guide the "Strong Reader" to extract relevant information from uploaded documents according to the schema.
*   **Identify Missing Information**: Flag any critical facts or documents that are still outstanding before the project can be fully submitted or assigned.

This structured approach ensures that the intake process is efficient, comprehensive, and tailored to the unique requirements of each legal task, significantly enhancing the quality of deliverables from AssociateOnDemand. 
