> **Phase 3+ only (July 2026 strategic lock):** Year-one revenue is **RMV-verified deliverables** via B2B overflow intake — not this LawClerk-style associate marketplace. See [`README.md`](./README.md) and [`AssociateOnDemand_Implementation_Phasing.md`](./AssociateOnDemand_Implementation_Phasing.md).

# AssociateOnDemand: Associate Services Project Request & Matching Workflow

**Author:** Manus AI
**Date:** July 5, 2026
**Project:** AssociateOnDemand Associate Services Marketplace

## 1. Introduction

This document outlines the end-to-end workflow for the AssociateOnDemand Associate Services Marketplace. It details a streamlined process for law firms to initiate various substantive legal projects (such as drafting, legal research, and memo writing) and for freelance attorneys to be matched, assigned, and complete these tasks. The workflow is designed for efficiency, transparency, and seamless integration with the Airtable-backed AssociateOnDemand platform, drawing inspiration from successful models like LawClerk, but with a singular focus on associate-level legal work.

## 2. Workflow for Requesting Firms

### 2.1. Initiate New Project Request

1.  **Access Point**: Firms will access the Associate Services module via a new dedicated section in their AssociateOnDemand dashboard (e.g., "New Associate Project" or "Post a Legal Task").
2.  **Project Intake (Chat-Centric UI)**: The firm interacts with a chat-centric AI intake (Harvey-style) or fills out a structured form, providing the following details:
    *   **Project Type**: Firm selects from a dropdown: "Brief Drafting," "Legal Research," "Memo Writing," "Document Review," "Contract Drafting," "Other Associate Service." This is a critical differentiator.
    *   **Case Information**: Case Name, Case Number, Matter Link (to existing `Matters` table if applicable).
    *   **Project Details**: Title, detailed Description of the task, scope, and desired deliverables.
    *   **Deadline**: The date by which the project must be completed.
    *   **Proposed Fee**: The flat fee the firm is offering for the project. The system can suggest a range based on project type and complexity (similar to LawClerk's pricing guidance).
    *   **Required Qualifications**: Specific practice area, bar admission (jurisdiction), and skills (e.g., "Legal Research," "Brief Drafting," "Contract Drafting").
    *   **Jurisdictions Required**: States/Counties where the attorney must be licensed or familiar with the law relevant to the project.
3.  **Document Upload**: Secure upload of relevant case documents (e.g., complaint, research materials, templates) to be shared with the freelance attorney. These documents will be processed by the "Strong Reader" for key information extraction, which can pre-populate fields or provide context.
4.  **Review & Submit**: The firm reviews the project summary and submits it. The project is then created in the `Projects` table in Airtable with an "Open" status, and a corresponding record is created in the `Project Applications` table for tracking.

### 2.2. Track Project Status & Select Attorney

1.  **Dashboard View**: Firms can view all their active projects on a dedicated dashboard, showing status (Open, Pending Review, Assigned, In Progress, Submitted, Approved, etc.), assigned attorney, and deliverable due date.
2.  **Application Review**: As freelance attorneys apply, the firm receives notifications. The firm can review attorney profiles (credentials, experience, ratings) and their application messages (from `Project Applications` table).
3.  **Attorney Selection**: The firm selects the most suitable freelance attorney. Upon selection, the `Projects` table is updated with the `Assigned Attorney`, and the `Project Applications` table reflects the "Selected" status for the chosen attorney and "Rejected" for others.
4.  **Notifications**: Firms receive automated notifications when:
    *   New applications are received.
    *   An attorney is assigned.
    *   The freelance attorney submits their work product.
    *   Payment is processed.

### 2.3. Review Work Product & Process Payment

1.  **Work Product Review**: Once the freelance attorney submits their work product (e.g., draft brief, research memo), the firm is notified and can review it directly within the platform. The submitted files are stored in the `Work Product Submitted` field of the `Projects` table.
2.  **Approval/Feedback**: The firm can approve the work product, triggering payment release, or provide feedback/request revisions (if revision rounds are included in the service terms).
3.  **Automated Payment**: Upon approval, the platform automatically releases the payment from escrow to the freelance attorney, and updates the `Payment Status` in Airtable.

## 3. Workflow for Freelance Attorneys

### 3.1. Profile Setup & Management

1.  **Registration**: Freelance attorneys register on the platform, providing their credentials, bar number, contact information, payment details, and a professional bio. This data populates the `Freelance Attorneys` table.
2.  **Jurisdiction, Practice Area & Skills Selection**: Attorneys specify the states/counties they are licensed in, their practice areas, and specific skills (e.g., "Legal Research," "Brief Drafting," "Contract Drafting," "Document Review").
3.  **Availability**: Attorneys can set their availability (e.g., block out dates, indicate full-time/part-time).

### 3.2. Browsing & Applying for Projects

1.  **Project Feed**: Qualified freelance attorneys receive real-time notifications (email, in-app) for new projects matching their specified jurisdictions, practice areas, and skills.
2.  **Review Project**: Attorneys can view detailed project information, including type, description, deadline, and proposed fee.
3.  **Apply for Project**: Attorneys submit an application, which includes a cover letter/message, to the `Project Applications` table. They can also indicate if they are willing to accept a lower fee or suggest an alternative approach.

### 3.3. Completing Project & Submitting Deliverables

1.  **Access Project Details**: Upon assignment, the attorney gains secure access to shared case documents and detailed project instructions.
2.  **Conduct Work**: The attorney performs the assigned task (e.g., drafts a brief, conducts legal research).
3.  **Submit Deliverables**: The attorney submits the completed work product (e.g., draft brief, research memo) through the platform. This populates the `Work Product Submitted` field in the `Projects` table.
4.  **Upload Supporting Documents**: Option to upload any new documents or research materials related to the project.

## 4. AI & Automation Integration Points

*   **"Strong Reader" for Document Ingestion**: Automatically extract key details from uploaded case documents to pre-fill project request forms and provide context to freelance attorneys.
*   **AI-Assisted Work Product Summarization**: After a freelance attorney submits a detailed report or draft, an AI agent can generate a concise summary for the requesting firm, highlighting critical outcomes and next steps.
*   **Automated Notifications (Zapier/Make)**: Trigger notifications for new projects, applications, assignments, deliverable submissions, and payment processing.
*   **Smart Matching Engine**: AI or rule-based logic to efficiently match projects with the most suitable freelance attorneys based on project type, location, practice area, skills, availability, and performance history.
*   **Conflict Checking**: The platform can flag potential conflicts based on names in the `Contacts` table, requiring manual attorney review.
*   **AI-Driven Project Scoping**: AI can assist firms in drafting clear and comprehensive project descriptions based on initial inputs, ensuring all necessary details are captured.

## 5. UI/UX Considerations

*   **Dedicated Dashboards**: Separate, tailored dashboards for requesting firms and freelance attorneys, providing relevant information at a glance for all project types.
*   **Chat-Centric Interaction**: Integrate the "Harvey-style" chat interface for quick inquiries, status updates, and potentially even for firms to initiate project requests conversationally.
*   **Mobile Responsiveness**: Ensure both firms and attorneys can manage projects and assignments seamlessly from any device.
*   **Clear Status Indicators**: Use visual cues (e.g., color-coded badges) to clearly indicate the status of projects and applications.
*   **Rating & Review System**: Implement a system for firms to rate freelance attorneys and vice-versa, fostering trust and quality within the marketplace.
