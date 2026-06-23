## AssociateOnDemand powered by RMV - Fact-to-Legal Element Mapping Logic Design

**Author:** Manus AI
**Date:** April 28, 2026
**Project:** AssociateOnDemand powered by RMV / Lightship

### 1. Introduction

This document outlines the design for the Fact-to-Legal Element Mapping Logic within AssociateOnDemand. Building upon the Intelligent Document Ingestion and Fact Extraction Layer, this component is responsible for taking the structured facts extracted from documents and mapping them directly to the legal elements and criteria defined in the `Case_Assessment_Template.md`. This mapping is crucial for automating the legal analysis process, generating the Fidelity Score, and providing attorneys with a clear, data-driven assessment of each case.

### 2. Core Principles

*   **Accuracy**: Ensure precise mapping of facts to the correct legal elements.
*   **Transparency**: Provide clear traceability from extracted facts to mapped legal elements and their supporting evidence.
*   **Flexibility**: Adapt to different claim types and their unique legal elements.
*   **Feedback Loop**: Incorporate attorney feedback to continuously improve mapping accuracy and AI agent performance.
*   **Integration**: Seamlessly integrate with the Mass Case Auditor, Case Detail Page, and Obsidian Sync Engine.

### 3. Architecture Overview

The Fact-to-Legal Element Mapping will be primarily handled by a specialized AI agent, the **Legal Mapping Agent**, which will receive structured facts and the relevant `Case_Assessment_Template` for a given case. It will then apply its legal knowledge base to perform the mapping.

```mermaid
graph TD
    A[Structured Facts (from Fact Extraction Agent)] --> B(Legal Mapping Agent)
    C[Case Assessment Template.md] --> B
    B --> D{Mapped Legal Elements}
    D --> E[Database (PostgreSQL)]
    D --> F[Case Detail Page (UI)]
    D --> G[Mass Case Auditor]
    D --> H[Obsidian Sync Engine]
```

### 4. Components and Functionality

#### 4.1 Legal Mapping Agent

*   **Functionality**: Receives structured facts and the `Case_Assessment_Template` for a specific case. It then uses its internal legal knowledge base and rules to identify which facts support which legal elements.
*   **Knowledge Base**: Contains definitions of common legal elements for various claim types (e.g., elements of asylum, elements of negligence for personal injury).
*   **Mapping Logic**: 
    *   **Keyword Matching**: Identify legal terms and phrases within facts that correspond to elements.
    *   **Semantic Analysis**: Use NLP to understand the meaning of facts and their relevance to legal elements.
    *   **Contextual Reasoning**: Consider the overall context of the case and the relationships between facts.
*   **Output**: A structured JSON object containing:
    *   `legal_element_id`: Reference to the specific legal element from the `Case_Assessment_Template`.
    *   `supporting_facts`: List of `fact_id`s that support this element.
    *   `evidence_on_file`: List of `document_id`s or `fact_id`s that serve as evidence.
    *   `status`: (e.g., `Strong`, `Developing`, `Needs Attention`) based on the quantity and quality of supporting facts.
    *   `confidence_score`: A numerical score indicating the agent's confidence in the mapping.

#### 4.2 Case Assessment Template Integration

*   The `Case_Assessment_Template.md` will be parsed and stored in a structured format (e.g., JSON) within the database. This allows the Legal Mapping Agent to dynamically reference the required legal elements for each case type.
*   The template defines categories like `Procedural Posture & History`, `Claim Basis & Assessment`, and `Next Steps, Follow-Ups & Reminders`, each containing specific elements (e.g., `Court / Agency`, `Claim Type`, `Immediate Actions Required`).

#### 4.3 Database Schema Extensions

*   The `Case` entity in PostgreSQL will be extended to store the mapped legal elements and their statuses.
*   New tables might be introduced to store `LegalElementMapping` records, linking `facts` to `legal_elements` and `cases`.

### 5. Integration with Existing Modules

*   **Case Detail Page (UI)**: The mapped legal elements and their statuses will be prominently displayed on the Case Detail Page, providing attorneys with an at-a-glance view of the case's strengths and weaknesses. This will directly populate the 
Fidelity Score and guide the attorney's review.
*   **Mass Case Auditor**: The auditor will use the mapped legal elements to perform automated assessments, identify gaps, and generate actionable insights based on the criteria in the `Exit_Audit_Tracker-ExitAuditTracker.csv`.
*   **Obsidian Sync Engine**: Mapped legal elements and their supporting facts will be synchronized with the Obsidian vault, creating a rich, interconnected knowledge base for each case.

### 6. Cursor Implementation Prompt

> "Read `AssociateOnDemand_Fact_to_Legal_Mapping_Design.md` and `Case_Assessment_Template.md`. Implement the Fact-to-Legal Element Mapping Logic. Create a `Legal Mapping Agent` service that takes structured facts (from the Fact Extraction Agent) and maps them to the legal elements defined in the `Case_Assessment_Template.md`. Extend the FastAPI backend to store these mapped elements and their statuses. Update the Case Detail Page in the Next.js web application to display these mapped legal elements, their supporting facts, and their status (e.g., Strong, Developing, Needs Attention), adhering to the professional enterprise theme. Ensure this mapping contributes to the calculation of the Fidelity Score."
