## FastAPI Mutation Layer Design for AssociateOnDemand

This document details the design of the FastAPI mutation layer for AssociateOnDemand, focusing on enabling Create, Read, Update, and Delete (CRUD) operations for core entities. This layer is critical for data persistence and will now be extended to support the detailed data points from the `Case_Assessment_Template.md` and `Exit_Audit_Tracker-ExitAuditTracker.csv`.

### 1. Purpose and Scope

The mutation layer provides the API endpoints for the frontend and other internal services to interact with the PostgreSQL database. It ensures data integrity, enforces multi-tenancy, and facilitates the structured storage of legal case information, including the comprehensive assessment and audit data.

### 2. Core Entities and Extended Schemas

The following core entities will have their schemas extended to incorporate the new data points:

#### 2.1 Case Entity

**Existing Fields (Example):**
*   `case_id: UUID`
*   `tenant_id: UUID`
*   `matter_type: str`
*   `client_name: str`
*   `status: str`
*   `assigned_attorney_id: UUID`

**New/Extended Fields (from Case Assessment & Exit Audit):**
*   `client_ref_number: Optional[str]`
*   `last_active_date: Optional[datetime]`
*   `audit_date: Optional[date]`
*   `procedural_posture: Optional[str]`
*   `court_agency: Optional[str]`
*   `judge_officer: Optional[str]`
*   `current_stage: Optional[str]`
*   `filing_history: Optional[List[Dict]]` (e.g., `[{\'date\': \'YYYY-MM-DD\', \'filing\': \'I-589\'}]`)
*   `representations_on_record: Optional[List[Dict]]` (e.g., `[{\'date\': \'YYYY-MM-DD\', \'forum\': \'Court\', \'substance\': \'Statement\'}]`)
*   `vulnerability_flags: Optional[List[str]]`
*   `next_deadline: Optional[date]`
*   `deadline_risk_days_out: Optional[int]`
*   `additional_deadlines: Optional[List[Dict]]`
*   `claim_type: Optional[str]`
*   `legal_standard: Optional[str]`
*   `claim_elements: Optional[List[Dict]]` (e.g., `[{\'element\': \'Eligibility\', \'facts\': \'Key facts\', \'evidence\': \'Docs\', \'status\': \'Strong\'}]`)
*   `key_facts_on_file: Optional[str]`
*   `evidence_gaps: Optional[str]`
*   `sufficiency_assessment: Optional[str]`
*   `documents_in_file: Optional[List[Dict]]` (e.g., `[{\'document\': \'Passport\', \'present\': True, \'notes\': \'Valid\'}]`)
*   `areas_to_strengthen: Optional[str]`
*   `overall_assessment: Optional[str]`
*   `immediate_actions_required: Optional[List[Dict]]` (e.g., `[{\'action\': \'File motion\', \'owner\': \'Atty\', \'due_date\': \'YYYY-MM-DD\'}]`)
*   `last_client_contact: Optional[Dict]` (e.g., `{\'date\': \'YYYY-MM-DD\', \'method\': \'Email\'}`)
*   `outstanding_client_tasks: Optional[str]`
*   `next_scheduled_contact: Optional[date]`
*   `attorney_review_needed: Optional[str]`
*   `strategy_questions: Optional[str]`
*   `reminders_to_set: Optional[str]`
*   `fee_agreement_type: Optional[str]`
*   `total_fee_agreed: Optional[float]`
*   `amount_paid_to_date: Optional[float]`
*   `balance_due: Optional[float]`
*   `last_payment_date: Optional[date]`
*   `next_payment_due: Optional[date]`
*   `payment_plan_terms: Optional[str]`
*   `fee_waiver_reduction_notes: Optional[str]`
*   `reviewed_by: Optional[str]`
*   `review_date: Optional[date]`
*   `referred_to: Optional[str]`
*   `escalation_required: Optional[bool]`
*   `audit_status: Optional[str]`
*   `notes_flags: Optional[str]`

#### 2.2 Task Entity

**Existing Fields (Example):**
*   `task_id: UUID`
*   `case_id: UUID`
*   `description: str`
*   `due_date: date`
*   `assigned_to_id: UUID`
*   `status: str`

**New/Extended Fields (from Case Assessment & Exit Audit):**
*   `source_audit_id: Optional[UUID]` (Link to audit that generated this task)
*   `priority: Optional[str]` (e.g., \'High\', \'Medium\', \'Low\')

#### 2.3 Note Entity

**Existing Fields (Example):**
*   `note_id: UUID`
*   `case_id: UUID`
*   `content: str`
*   `created_by_id: UUID`
*   `created_at: datetime`

**New/Extended Fields:**
*   `category: Optional[str]` (e.g., \'Client Communication\', \'Internal Strategy\', \'Audit Finding\')

### 3. API Endpoints (FastAPI)

Existing endpoints will be updated to handle the extended schemas. New endpoints will be created as needed for specific audit-related functionalities.

#### 3.1 Case Endpoints

*   `POST /api/v1/cases/`: Create a new case. (Schema updated)
*   `GET /api/v1/cases/{case_id}`: Retrieve a single case. (Schema updated)
*   `PUT /api/v1/cases/{case_id}`: Update an existing case. (Schema updated)
*   `GET /api/v1/cases/`: List all cases (with filtering by `audit_status`, `deadline_risk_days_out`, `assigned_attorney_id`).

#### 3.2 Task Endpoints

*   `POST /api/v1/tasks/`: Create a new task. (Schema updated)
*   `PUT /api/v1/tasks/{task_id}`: Update an existing task. (Schema updated)

#### 3.3 Note Endpoints

*   `POST /api/v1/notes/`: Create a new note. (Schema updated)

### 4. Multi-Tenancy Enforcement

All API endpoints will continue to enforce multi-tenancy by filtering data based on the `tenant_id` associated with the authenticated user. This ensures that each firm\'s data, including all new assessment and audit details, remains isolated and secure.

### 5. Database Interaction (Drizzle ORM)

The FastAPI services will use Drizzle ORM to interact with the PostgreSQL database. The Drizzle schemas will be updated to reflect the extended Pydantic models, ensuring that all new fields are correctly mapped to database columns.

### 6. Integration with Mass Case Auditor

The Mass Case Auditor will primarily interact with these mutation endpoints to:
*   **Update Case Data**: Populate and update the detailed assessment fields within the Case entity.
*   **Create Tasks**: Generate new tasks based on identified immediate actions and reminders.
*   **Create Notes**: Log audit findings and observations as notes associated with the case.

This updated mutation layer provides the robust backend support necessary for the Mass Case Auditor and the comprehensive case assessment workflow.
