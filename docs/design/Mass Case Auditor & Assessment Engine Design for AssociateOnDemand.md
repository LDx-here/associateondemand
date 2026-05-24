## Mass Case Auditor & Assessment Engine Design for AssociateOnDemand

This document details the design of the Mass Case Auditor, an integral component of AssociateOnDemand powered by RMV, responsible for systematically reviewing and assessing legal cases. The auditor will leverage the structured data points and assessment criteria derived from the provided `Case_Assessment_Template.md` and `Exit_Audit_Tracker-ExitAuditTracker.csv` to ensure comprehensive and consistent case evaluation.

### 1. Purpose and Scope

The Mass Case Auditor aims to automate the process of evaluating case status, identifying procedural gaps, assessing claim basis, and tracking next steps. Its primary goal is to enhance efficiency, reduce human error, and provide a consistent, data-driven perspective on the entire case portfolio.

### 2. Core Functionality

The Mass Case Auditor will perform the following key functions:

*   **Automated Data Extraction**: Utilize the Fact Extraction Agent to pull relevant information from case documents, communications, and internal notes.
*   **Procedural History Tracking**: Reconstruct the procedural posture and history of each case, including filings, hearings, and representations on record.
*   **Claim Basis Assessment**: Evaluate the legal basis of the claim, identifying required elements, supporting facts, and available evidence.
*   **Deadline Management**: Monitor and flag upcoming deadlines, categorizing risk based on proximity.
*   **Action Item Generation**: Propose immediate actions, follow-ups, and reminders based on the case assessment.
*   **Audit Status Reporting**: Generate comprehensive audit reports, highlighting areas of concern, sufficiency assessments, and recommended next steps.

### 3. Data Points and Assessment Criteria

The auditor will process and assess data based on the following categories and specific data points, directly mapped from the `Case_Assessment_Template.md` and `Exit_Audit_Tracker-ExitAuditTracker.csv`:

#### 3.1 Case Identification and Assignment

| Field | Source | Description |
| :---- | :---- | :---- |
| Matter ID | Internal AssociateOnDemand / Exit Audit Tracker | Unique identifier for the case. |
| Client Ref # (No PII) | Exit Audit Tracker | Client reference number, anonymized. |
| Matter Type | Case Assessment Template / Exit Audit Tracker | Type of legal matter (e.g., Asylum, Marriage-Based, DACA). |
| Assigned Attorney (Current) | Exit Audit Tracker | Attorney currently assigned to the case. |
| Last Active Date | Exit Audit Tracker | Date of last activity on the case. |
| Audit Date | Case Assessment Template | Date the case assessment was performed. |
| Case Status | Case Assessment Template | Current status of the case (e.g., Hearing Scheduled, RFE Issued, Filed-Pending). |

#### 3.2 Procedural Posture & History

| Field | Source | Description |
| :---- | :---- | :---- |
| Court / Agency & Venue | Case Assessment Template / Exit Audit Tracker | The specific court, agency, and geographical venue. |
| Judge / Officer | Case Assessment Template | Name of the presiding judge or officer. |
| Current Stage | Case Assessment Template / Exit Audit Tracker | The current procedural stage of the case. |
| Filing History | Case Assessment Template | A chronological list of filings with dates. |
| Representations on Record | Case Assessment Template / Exit Audit Tracker | Documented statements made by prior counsel or client. |
| Vulnerability | Case Assessment Template | Flags statements conflicting with current case theory. |

#### 3.3 Deadlines and Risk Assessment

| Field | Source | Description |
| :---- | :---- | :---- |
| Next Deadline | Case Assessment Template / Exit Audit Tracker | Date and description of the most urgent upcoming deadline. |
| Deadline Risk (Days Out) | Case Assessment Template / Exit Audit Tracker | Calculated risk based on days remaining until the deadline (Red: <30, Amber: 30-60, Green: 60+). |
| Additional Deadlines | Case Assessment Template | List of any other anticipated deadlines. |

#### 3.4 Claim Basis & Assessment

| Field | Source | Description |
| :---- | :---- | :---- |
| Claim Type | Case Assessment Template / Exit Audit Tracker | Specific type of claim (e.g., Asylum - Particular Social Group). |
| Legal Standard | Case Assessment Template | Required legal standard and burden/standard of proof. |
| Claim Element | Case Assessment Template | Each element required for the claim. |
| Relevant Facts | Case Assessment Template | Key facts establishing each element. |
| Evidence on File | Case Assessment Template | List of documents supporting each element. |
| Status (Element) | Case Assessment Template | Assessment of element strength (Strong, Developing, Needs Attention). |
| Key Facts on File | Exit Audit Tracker | Summary of key facts present in the file. |
| Evidence Gaps | Exit Audit Tracker | Identified gaps in evidence. |
| Sufficiency Assessment | Exit Audit Tracker | Overall assessment of claim sufficiency (Sufficient, Gaps Identified). |

#### 3.5 Documents and Areas to Strengthen

| Field | Source | Description |
| :---- | :---- | :---- |
| Document List | Case Assessment Template | Inventory of all documents in the file. |
| Document Present | Case Assessment Template | Boolean indicating if a document is present. |
| Document Notes | Case Assessment Template | Observations on document condition, completeness, or relevance. |
| Areas to Strengthen | Case Assessment Template | Opportunities to build the record for specific elements. |
| Overall Assessment | Case Assessment Template | Concise summary of case posture. |

#### 3.6 Next Steps, Follow-Ups & Reminders

| Field | Source | Description |
| :---- | :---- | :---- |
| Immediate Actions Required | Case Assessment Template / Exit Audit Tracker | Priority-ordered list of actions (Description, Owner, Due Date). |
| Owner (Atty/Staff/Client) | Exit Audit Tracker | Responsible party for the action. |
| Due Date (Action) | Exit Audit Tracker | Due date for the action. |
| Last Client Contact | Case Assessment Template / Exit Audit Tracker | Date and method of last client communication. |
| Outstanding Client Tasks | Case Assessment Template | Documents/information still needed from the client. |
| Next Scheduled Contact | Case Assessment Template | Date and purpose of next client touchpoint. |
| Attorney Review Needed | Case Assessment Template | Specific items requiring attorney attention. |
| Strategy Questions | Case Assessment Template | Open strategic questions. |
| Reminders to Set | Case Assessment Template | Calendar reminders, follow-up dates, automated alerts. |

#### 3.7 Billing & Fees

| Field | Source | Description |
| :---- | :---- | :---- |
| Fee Agreement Type | Case Assessment Template | Type of fee agreement (Flat Fee, Contingency, Hourly, Pro Bono, Reduced Fee). |
| Total Fee Agreed | Case Assessment Template | Total agreed-upon fee. |
| Amount Paid to Date | Case Assessment Template | Amount paid by the client. |
| Balance Due | Case Assessment Template | Remaining balance. |
| Last Payment Date | Case Assessment Template | Date of last payment. |
| Next Payment Due | Case Assessment Template | Date of next payment. |
| Payment Plan Terms | Case Assessment Template | Details of payment plan. |
| Fee Waiver / Reduction Notes | Case Assessment Template | Reason for waiver/reduction and approval. |

#### 3.8 Audit Sign-Off

| Field | Source | Description |
| :---- | :---- | :---- |
| Reviewed By | Case Assessment Template | Name and role of the reviewer. |
| Review Date | Case Assessment Template | Date of review. |
| Referred To | Case Assessment Template | Attorney name for confirmed assignment. |
| Escalation Required? | Case Assessment Template | Yes/No, with description if yes. |
| Audit Status | Exit Audit Tracker | Overall audit status (Action Required, In Review, Sufficient). |
| Notes / Flags | Exit Audit Tracker | Additional notes or flags from the audit. |

### 4. Integration with Fact Extraction Agent

The Mass Case Auditor will rely heavily on the Fact Extraction Agent to populate these data points. The Fact Extraction Agent will be enhanced to specifically identify and extract information corresponding to each field listed above from unstructured legal documents, emails, and other case-related communications. It will prioritize accuracy and flag any ambiguities or missing information for human review.

### 5. Output and Reporting

The Mass Case Auditor will generate a structured output for each case, mirroring the `Case_Assessment_Template.md` format. This output will be stored in the AssociateOnDemand database and made accessible through the UI. For portfolio-level insights, the auditor will aggregate data to produce reports similar to the `Exit_Audit_Tracker-ExitAuditTracker.csv`, allowing for identification of trends, common gaps, and overall firm performance metrics.

### 6. Fidelity Score Integration

The data points gathered and assessed by the Mass Case Auditor will directly feed into the calculation of the Fidelity Score. For example:

*   **Element Support**: Derived from the "Status" of each Claim Element.
*   **Authority Backing**: Assessed based on the presence and strength of "Evidence on File" for each element.
*   **Strategic Consistency**: Can be inferred from the "Overall Assessment" and "Areas to Strengthen" in comparison to firm-wide best practices.
*   **Pattern Deviation**: Identified by flagging "Vulnerability" in representations on record or significant "Evidence Gaps."

This integration ensures that the Fidelity Score provides a real-time, data-driven measure of case health and readiness, directly informed by the detailed assessments performed by the Mass Case Auditor.
