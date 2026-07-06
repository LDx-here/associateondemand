> **Phase 3+ only (July 2026 strategic lock):** Schema for contract-associate marketplace — not built in Phase 0–2. See [`README.md`](./README.md).

# AssociateOnDemand: Associate Services Marketplace Airtable Schema Design

**Author:** Manus AI
**Date:** July 5, 2026
**Project:** AssociateOnDemand Associate Services Marketplace

## 1. Introduction

This document outlines the refined Airtable schema for the **Associate Services Marketplace** within the AssociateOnDemand platform. This architecture focuses exclusively on facilitating project-based associate services such as drafting, legal research, and memo writing, removing all elements related to court appearances. The goal is to provide a streamlined and highly efficient experience for law firms to post substantive legal tasks and for freelance attorneys to find and manage these assignments.

## 2. Core Airtable Tables for the Associate Services Marketplace

These tables will reside within the existing "AssociateOnDemand Master Base" and will be linked to the `Matters` and `Contacts` tables where appropriate.

### 2.1. Projects Table

This table will serve as the central hub for all associate service projects.

| Field Name | Field Type | Description |
| :--- | :--- | :--- |
| Project ID | Auto Number | Unique identifier for the project (e.g., AOD-PROJ-001). |
| Project Type | Single Select | **Required:** e.g., "Brief Drafting," "Legal Research," "Memo Writing," "Document Review," "Contract Drafting," "Other Associate Service." |
| Requesting Firm | Linked Record | Link to the `Contacts` table (Role: Requesting Firm). |
| Matter Link | Linked Record | Link to the `Matters` table (if applicable). |
| Title | Single Line Text | Concise title of the project (e.g., "Draft Asylum Brief," "Research on Patent Infringement"). |
| Description | Long Text | Detailed description of the task, scope, and deliverables. |
| Deadline | Date | The date by which the project must be completed. |
| Proposed Fee | Currency | Flat fee offered for the project. |
| Required Qualifications | Multiple Select | e.g., "Immigration Law," "Civil Litigation," "Legal Research," "Contract Law." |
| Jurisdictions Required | Multiple Select | States/Counties where the attorney must be licensed or familiar with the law. |
| Status | Single Select | e.g., "Open," "Pending Review," "Assigned," "In Progress," "Submitted," "Approved," "Canceled." |
| Assigned Attorney | Linked Record | Link to the `Freelance Attorneys` table. |
| Deliverable Due Date | Date | Deadline for the freelance attorney to submit their work product. |
| Payment Status | Single Select | e.g., "Pending Escrow," "In Escrow," "Paid," "Canceled." |
| Documents Uploaded | Attachment | Files uploaded by the requesting firm (e.g., case documents, templates). |
| Work Product Submitted | Attachment | Files submitted by the freelance attorney (e.g., draft brief, research memo). |

### 2.2. Freelance Attorneys Table

This table will store profiles of freelance attorneys available for associate services.

| Field Name | Field Type | Description |
| :--- | :--- | :--- |
| Attorney ID | Auto Number | Unique identifier for the freelance attorney (e.g., FATT-001). |
| Full Name | Single Line Text | Freelance attorney's full name. |
| Email | Email | Primary contact email. |
| Phone | Phone Number | Primary contact phone. |
| Bar Number | Single Line Text | State Bar number. |
| Jurisdictions Licensed | Multiple Select | States/Counties where the attorney is licensed. |
| Practice Areas | Multiple Select | e.g., "Immigration," "Personal Injury," "Family Law," "Corporate Law." |
| Skills | Multiple Select | e.g., "Legal Research," "Brief Drafting," "Contract Drafting," "Document Review." |
| Availability | Multiple Select | e.g., "Full-time," "Part-time," "Project-based." |
| Bio / Experience | Long Text | Brief professional biography and relevant experience. |
| Linked Projects | Linked Record | Link to the `Projects` table. |
| Hourly Rate (Optional) | Currency | If offering hourly services, their standard rate. |
| Bar State | Single/Multiple Select | Jurisdiction(s) where the `Bar Number` is verified (e.g., "MN," "OH," "CA"). |
| Bar Status | Single Select | e.g., "Active / Good Standing," "Suspended," "Inactive," "Unverified" (default: "Unverified"). |
| Bar Verified Date | Date | Date the bar status was last confirmed against the state bar. |
| Background Check Status | Single Select | e.g., "Not Started," "Pending," "Clear," "Flagged," "Failed" (default: "Not Started"). |
| Background Check Date | Date | Date the background check result was recorded. |
| Verified | Checkbox / Formula | **Master gate.** `true` only when `Bar Status` = "Active / Good Standing" **AND** `Background Check Status` = "Clear" **AND** today is on/before `Verification Expiry`. Defaults `false`. |
| Verification Expiry | Date | Date the current verification lapses (drives annual re-verification). |
| Verification Notes | Long Text | Reviewer notes: source of bar lookup, background-check vendor/reference, flag resolution, etc. |

### 2.3. Project Applications Table

This table tracks applications by freelance attorneys to open projects.

| Field Name | Field Type | Description |
| :--- | :--- | :--- |
| Application ID | Auto Number | Unique identifier for the application. |
| Project Link | Linked Record | Link to the `Projects` table. |
| Attorney Link | Linked Record | Link to the `Freelance Attorneys` table. |
| Application Date | Date/Time | When the attorney applied. |
| Status | Single Select | e.g., "Applied," "Reviewed," "Selected," "Rejected." |
| Cover Letter / Message | Long Text | Message from the attorney to the requesting firm. |

### 2.4. Requesting-Firm Attorney Verification (Contacts)

Requesting-firm attorneys are **also bar-verified** before they can post projects — a firm buying associate work must itself be a licensed attorney in good standing (this supports the Rule 1.5(e) consent chain and confirms the arrangement stays lawyer-to-lawyer). Add these fields to the existing `Contacts` table for records where `Role` = "Requesting Firm" (or split into a dedicated `Firm Attorneys` view if `Contacts` also holds non-attorney client contacts):

| Field Name | Field Type | Description |
| :--- | :--- | :--- |
| Bar Number | Single Line Text | State Bar number of the requesting attorney. |
| Bar State | Single/Multiple Select | Jurisdiction(s) where the bar number is verified. |
| Bar Status | Single Select | e.g., "Active / Good Standing," "Suspended," "Inactive," "Unverified" (default: "Unverified"). |
| Verified | Checkbox / Formula | `true` only when `Bar Status` = "Active / Good Standing." Defaults `false`; project posting is gated on `true`. |

*(Optional parity fields — `Bar Verified Date`, `Verification Notes` — may mirror the Freelance Attorneys table if the same review lane handles both sides.)*

### 2.5. Verification Gating

*   **Default deny:** Every freelance (and requesting-firm) attorney record is created with `Verified = false`, `Bar Status = "Unverified"`, and `Background Check Status = "Not Started"`.
*   **Feed filter:** The smart-matching engine and freelance project feed **MUST** filter to `Verified = true`. Unverified attorneys never see project matches and cannot apply.
*   **Manual review lane:** A dedicated Airtable view (e.g., "Pending Verification") holds all `Verified = false` attorneys for a human reviewer to confirm bar status, order/record the background check, set `Verification Expiry`, and flip the gate.
*   **Annual re-verification:** A scheduled automation (Zapier/Make) flips `Verified = false` when `Verification Expiry` passes, returning the attorney to the review lane until re-confirmed — no attorney stays active on a stale check.

## 3. Integration with Existing Tables

*   **`Matters` Table**: The `Projects` table will link to the `Matters` table, allowing firms to associate any associate service project with specific cases already managed within AssociateOnDemand.
*   **`Contacts` Table**: The `Requesting Firm` field in `Projects` will link to the `Contacts` table, ensuring that firm details are centrally managed.

## 4. Frontend Considerations

*   **Firm Portal**: A single portal where firms can post new associate service projects, track all ongoing projects, and review submitted work.
*   **Freelance Attorney Portal**: A single portal for freelance attorneys to browse available projects, apply, manage assignments, and submit deliverables.
*   **Smart Matching Interface**: An enhanced system to display available projects to qualified attorneys based on their registered jurisdictions, practice areas, and skills.

## 5. Automation Opportunities (Zapier/Make)

*   **New Project Notification**: Automatically notify qualified freelance attorneys when a new project is posted matching their criteria.
*   **Application Management**: Automate notifications to requesting firms about new applications and to freelance attorneys about application status changes.
*   **Assignment Confirmation**: Send automated confirmations to both the requesting firm and the assigned attorney upon project acceptance.
*   **Deliverable Submission & Review**: Trigger notifications for deliverable submission and facilitate the review process.
*   **Payment Processing**: Integrate with payment gateways to automate escrow and release of funds upon project completion and approval.
