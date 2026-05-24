## E-immigration/Clio Data Normalization Adapter Design for AssociateOnDemand

This document details the design of the data normalization adapter for importing case data from E-immigration or Clio (via CSV/JSON exports) into AssociateOnDemand. The adapter will now be enhanced to map and ingest the comprehensive data points outlined in the `Case_Assessment_Template.md` and `Exit_Audit_Tracker-ExitAuditTracker.csv`.

### 1. Purpose and Scope

The adapter's primary purpose is to facilitate the migration and continuous synchronization of existing case data from external legal practice management systems into AssociateOnDemand. This ensures that historical data is preserved and made actionable within the new system, populating the extended case schemas and supporting the Mass Case Auditor and Obsidian 'Legal Brain'.

### 2. Data Sources and Formats

*   **Primary Sources**: E-immigration, Clio
*   **Supported Formats**: CSV, JSON (exported from the respective systems)

### 3. Data Mapping and Normalization

The adapter will perform a one-to-one or many-to-one mapping from source system fields to AssociateOnDemand's extended `Case` entity schema. It will handle data type conversions, default values for missing fields, and basic data cleaning.

#### 3.1 Key Mapping Principles

*   **Prioritize AssociateOnDemand Schema**: All incoming data will be transformed to fit the `Case` entity schema defined in `RMV_FastAPI_Mutation_Layer_Design.md`.
*   **Handle Missing Data**: Implement strategies for missing data (e.g., `Optional` fields, default values, or flagging for manual review).
*   **Standardize Enums**: Map source system's status, matter types, etc., to AssociateOnDemand's standardized enumerations.
*   **Complex Field Parsing**: For fields like `filing_history`, `representations_on_record`, `claim_elements`, and `immediate_actions_required`, the adapter will attempt to parse structured data from text or JSON arrays within the source files. This may involve leveraging the Fact Extraction Agent for more complex, unstructured text parsing.

#### 3.2 Mapping Table (Illustrative Examples)

| E-immigration/Clio Field (Example) | AssociateOnDemand Field | Data Type | Notes |
| :--------------------------------- | :---------------------- | :-------- | :---- |
| Case ID | `case_id` | UUID | Unique identifier. |
| Client Name | `client_name` | string | |
| Matter Type | `matter_type` | string | Map to AssociateOnDemand's MatterType enum. |
| Status | `status` | string | Map to AssociateOnDemand's CaseStatus enum. |
| Attorney | `assigned_attorney_id` | UUID | Map to existing user ID or create placeholder. |
| Client Ref # | `client_ref_number` | string | From Exit Audit Tracker. |
| Last Activity Date | `last_active_date` | datetime | From Exit Audit Tracker. |
| Audit Date | `audit_date` | date | Can be set to import date or extracted if available. |
| Court / Agency | `court_agency` | string | From Case Assessment Template. |
| Judge / Officer | `judge_officer` | string | From Case Assessment Template. |
| Current Stage | `current_stage` | string | From Case Assessment Template. |
| Filing History (text/JSON) | `filing_history` | List[Dict] | Parse into structured list. |
| Representations on Record | `representations_on_record` | List[Dict] | Parse into structured list. |
| Vulnerability | `vulnerability_flags` | List[str] | Flags statements conflicting with current case theory. |
| Next Deadline | `next_deadline` | date | From Case Assessment Template. |
| Deadline Risk (Days Out) | `deadline_risk_days_out` | int | Calculated risk based on days remaining. |
| Additional Deadlines | `additional_deadlines` | List[Dict] | List of any other anticipated deadlines. |
| Claim Type | `claim_type` | string | From Case Assessment Template. |
| Legal Standard | `legal_standard` | string | From Case Assessment Template. |
| Claim Elements | `claim_elements` | List[Dict] | Parse into structured list. |
| Key Facts on File | `key_facts_on_file` | string | Summary of key facts present in the file. |
| Evidence Gaps | `evidence_gaps` | string | Identified gaps in evidence. |
| Sufficiency Assessment | `sufficiency_assessment` | string | Overall assessment of claim sufficiency. |
| Document List | `documents_in_file` | List[Dict] | Inventory of all documents in the file. |
| Areas to Strengthen | `areas_to_strengthen` | string | Opportunities to build the record. |
| Overall Assessment | `overall_assessment` | string | Concise summary of case posture. |
| Immediate Actions | `immediate_actions_required` | List[Dict] | Priority-ordered list of actions. |
| Owner (Atty/Staff/Client) | `owner` | string | Responsible party for the action. |
| Due Date (Action) | `due_date` | date | Due date for the action. |
| Last Client Contact | `last_client_contact` | Dict | Date and method of last client communication. |
| Outstanding Client Tasks | `outstanding_client_tasks` | string | Documents/information still needed from the client. |
| Next Scheduled Contact | `next_scheduled_contact` | date | Date and purpose of next client touchpoint. |
| Attorney Review Needed | `attorney_review_needed` | string | Specific items requiring attorney attention. |
| Strategy Questions | `strategy_questions` | string | Open strategic questions. |
| Reminders to Set | `reminders_to_set` | string | Calendar reminders, follow-up dates, automated alerts. |
| Fee Agreement Type | `fee_agreement_type` | string | Type of fee agreement. |
| Total Fee Agreed | `total_fee_agreed` | float | Total agreed-upon fee. |
| Amount Paid to Date | `amount_paid_to_date` | float | Amount paid by the client. |
| Balance Due | `balance_due` | float | Remaining balance. |
| Last Payment Date | `last_payment_date` | date | Date of last payment. |
| Next Payment Due | `next_payment_due` | date | Date of next payment. |
| Payment Plan Terms | `payment_plan_terms` | string | Details of payment plan. |
| Fee Waiver / Reduction Notes | `fee_waiver_reduction_notes` | string | Reason for waiver/reduction and approval. |
| Reviewed By | `reviewed_by` | string | Name and role of the reviewer. |
| Review Date | `review_date` | date | Date of review. |
| Referred To | `referred_to` | string | Attorney name for confirmed assignment. |
| Escalation Required? | `escalation_required` | bool | Yes/No, with description if yes. |
| Audit Status | `audit_status` | string | Overall audit status. |
| Notes / Flags | `notes_flags` | string | Additional notes or flags from the audit. |

### 4. Implementation Details

#### 4.1 FastAPI Endpoint

*   **POST /api/v1/import/eimmigration**: Accepts a CSV or JSON file upload.
    *   **Request Body**: `UploadFile` (for CSV/JSON file).
    *   **Response**: `ImportSummary` (e.g., `{'total_records': 100, 'imported_count': 95, 'errors': 5}`).

#### 4.2 Processing Logic

1.  **File Reception**: Receive the uploaded file via FastAPI.
2.  **Format Detection**: Determine if the file is CSV or JSON.
3.  **Row Iteration**: Read the file row by row (for CSV) or record by record (for JSON).
4.  **Data Extraction & Mapping**: For each record:
    *   Extract relevant fields.
    *   Apply the mapping rules defined in Section 3.2.
    *   Perform data type conversions and basic validation.
    *   For complex fields, use AI (Fact Extraction Agent) if necessary to parse unstructured text into structured lists/dicts.
5.  **AssociateOnDemand Entity Creation**: Create or update `Case` entities (and potentially `Task` or `Note` entities for `immediate_actions_required` or `notes_flags`) using the `PUT /api/v1/cases/{case_id}` or `POST /api/v1/cases/` endpoints of the FastAPI Mutation Layer.
6.  **Error Handling**: Log any records that fail validation or mapping, and report them in the `ImportSummary`.

### 5. Integration with Frontend

A simple file upload component will be added to the AssociateOnDemand dashboard or a dedicated 'Import' page. Users will be able to upload their E-immigration/Clio export files and view the import summary.

### 6. Cursor Implementation Prompt

> "Read `RMV_Eimmigration_Data_Import_Design.md`. Implement the E-immigration Data Import & Mapping Logic. Create the FastAPI endpoint `POST /api/v1/import/eimmigration` that handles CSV and JSON file uploads, parses the content, and calls a service layer function for data mapping and persistence. For the frontend, create a new `/import` page in the Next.js web application with a file upload component and a display for import results, adhering to the professional enterprise theme. Also, generate a sample CSV template file named `eimmigration_sample_data.csv` based on the example provided in the design document."
