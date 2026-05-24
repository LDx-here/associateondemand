# Recover My Value (RMV) - Dual-Pathway Client Intake Design

**Author:** Manus AI
**Date:** April 28, 2026
**Project:** Recover My Value (RMV) / Lightship

## 1. Introduction

This document outlines the design for a dual-pathway client intake system for Recover My Value (RMV), specifically tailored to accommodate prospective clients for Personal Injury (PI) and Immigration law. The goal is to provide a clear, intuitive, and efficient intake experience that guides clients to the appropriate legal services while seamlessly integrating with the RMV AI Receptionist and Advanced Intake & Scheduling Module.

## 2. Core Objectives

*   **Clear Pathway Selection**: Enable prospective clients to easily identify and select their area of legal need (Personal Injury or Immigration).
*   **Tailored Intake Experience**: Provide customized intake questions and information gathering relevant to each practice area.
*   **Efficient Lead Qualification**: Quickly qualify leads for each pathway, ensuring they are directed to the most appropriate legal professional or resource.
*   **Seamless Integration**: Integrate the dual-pathway intake with the existing RMV AI Receptionist, Advanced Intake & Scheduling, and CRM functionalities.
*   **Data Consistency**: Ensure that client data collected through both pathways is consistently stored and accessible within the RMV system.
*   **Brand Alignment**: Maintain a professional and user-friendly interface consistent with the Legora/Clio aesthetic.

## 3. User Journey & Decision Points

The dual-pathway intake will commence from the moment a prospective client lands on the RMV website or interacts with the AI Receptionist. The journey is designed to be intuitive, minimizing friction and maximizing conversion.

### 3.1. Initial Touchpoint & Pathway Selection

*   **Website Landing Page**: The redesigned website will feature prominent, clear calls to action (CTAs) for "Personal Injury" and "Immigration" services. This could be a hero section with two distinct buttons or a clear navigation menu.
*   **AI Receptionist Interaction**: If a client initiates contact via chat or voice with the AI Receptionist, the AI will be programmed to ask a qualifying question early in the conversation to determine the area of law (e.g., "Are you seeking assistance with an injury claim or an immigration matter?").

### 3.2. Practice Area Specific Intake

Once a pathway is selected, the client will be guided through a series of tailored intake steps:

#### 3.2.1. Personal Injury Pathway

*   **Initial Questions**: Focus on the type of injury, date of incident, brief description of what happened, parties involved, and insurance information.
*   **Severity Assessment**: Basic questions to gauge the severity of the injury and potential claim value.
*   **Document Upload**: Option to upload accident reports, medical bills, or photos.
*   **Conflict Check**: Automated check against existing RMV cases and contacts.
*   **Scheduling**: Direct integration with the Advanced Intake & Scheduling Module to book a consultation with a Personal Injury attorney.

#### 3.2.2. Immigration Pathway

*   **Initial Questions**: Focus on the type of immigration matter (e.g., family-based, employment-based, asylum), country of origin, current visa status, and any immediate deadlines.
*   **Eligibility Assessment**: Basic questions to determine potential eligibility for common immigration benefits.
*   **Document Upload**: Option to upload passport copies, visa documents, or previous application forms.
*   **Conflict Check**: Automated check against existing RMV cases and contacts.
*   **Scheduling**: Direct integration with the Advanced Intake & Scheduling Module to book a consultation with an Immigration attorney.

## 4. Integration with RMV Modules

```mermaid
graph TD
    A[Prospective Client] --> B{RMV Website / AI Receptionist}
    B -- Select Pathway --> C{Pathway Selection (PI or Immigration)}
    C -- Personal Injury --> D[PI Intake Form / AI Interaction]
    C -- Immigration --> E[Immigration Intake Form / AI Interaction]
    D --> F[RMV AI Receptionist (Qualification)]
    E --> F
    F -- Qualified Lead --> G[Advanced Intake & Scheduling Module]
    G -- Book Consultation --> H[Google/Outlook Calendar]
    G -- Create Lead/Case --> I[RMV CRM / Case Management]
    I --> J[RMV Workflow Orchestration Service]
    J --> K[Manager Agent]

    style A fill:#bbf,stroke:#333,stroke-width:2px
    style B fill:#eee,stroke:#333,stroke-width:2px
    style C fill:#ccf,stroke:#333,stroke-width:2px
    style D fill:#f9f,stroke:#333,stroke-width:2px
    style E fill:#f9f,stroke:#333,stroke-width:2px
    style F fill:#f9f,stroke:#333,stroke-width:2px
    style G fill:#f9f,stroke:#333,stroke-width:2px
    style H fill:#ffc,stroke:#333,stroke-width:2px
    style I fill:#ffc,stroke:#333,stroke-width:2px
    style J fill:#f9f,stroke:#333,stroke-width:2px
    style K fill:#f9f,stroke:#333,stroke-width:2px
```

**Integration Flow:**

1.  **Initial Contact**: A prospective client interacts with the RMV website or AI Receptionist.
2.  **Pathway Selection**: The client explicitly selects either the Personal Injury or Immigration pathway.
3.  **Tailored Intake**: The system presents a dynamic intake form or guides the AI Receptionist to ask specific questions relevant to the chosen practice area.
4.  **AI Qualification**: The RMV AI Receptionist (or a dedicated qualification agent) processes the intake information to assess lead quality and fit.
5.  **Scheduling**: For qualified leads, the **Advanced Intake & Scheduling Module** is invoked to facilitate booking a consultation with the appropriate legal professional.
6.  **CRM/Case Management**: The collected client information is seamlessly pushed to the RMV CRM and Case Management system, creating a new lead or pre-filling a case file.
7.  **Workflow Orchestration**: The RMV Workflow Orchestration Service, guided by the Manager Agent, initiates the relevant legal workflow based on the practice area.

## 5. Multi-Tenancy Considerations

*   **Tenant-Specific Pathways**: Each law firm (tenant) can configure which practice areas they offer and customize the intake questions and workflows for each.
*   **Role-Based Routing**: Leads are routed to specific attorneys or teams based on their practice area expertise, as defined within the tenant's configuration.
*   **Data Isolation**: All intake data is stored securely and isolated per tenant, ensuring confidentiality.

## 6. Conclusion

The Dual-Pathway Client Intake Design transforms RMV into a versatile platform capable of efficiently serving diverse legal needs. By providing clear, tailored pathways for Personal Injury and Immigration, RMV enhances the client experience, streamlines lead qualification, and ensures that legal professionals can focus on their specialized areas of practice. This module is critical for expanding RMV's reach and maximizing client acquisition for the Autonomous Law Firm.
