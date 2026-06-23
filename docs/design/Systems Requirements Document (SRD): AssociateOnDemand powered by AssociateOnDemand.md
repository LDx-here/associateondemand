# Systems Requirements Document (SRD): AssociateOnDemand powered by AssociateOnDemand

**Author:** Manus AI
**Date:** April 22, 2026
**Project:** AssociateOnDemand powered by AssociateOnDemand / Lightship

## 1. System Overview

The AssociateOnDemand powered by AssociateOnDemand system is conceptualized as a multi-agent artificial intelligence (AI) architecture specifically engineered to automate and structure complex legal workflows. Functioning as a critical middleware layer, AssociateOnDemand integrates seamlessly between existing document storage solutions, such as Google Drive, and specialized case management systems like E-immigration. The system leverages advanced Large Language Models (LLMs) to perform core functions including fact extraction, precise mapping of facts to legal elements, and the generation of legal drafts. Crucially, AssociateOnDemand is not just a practice-specific tool; it is a dynamic system that adapts legal reasoning based on context, deciding which law matters and how it is used.

## 2. Core Data Structures and Relationships

To support the 10-step workflow, the system must maintain strict, relational data structures.

### 2.1 Data Objects

*   **Fact**: An extracted, verified piece of information from the case.
*   **Issue**: A legal question identified from the facts.
*   **Element**: A specific component of a legal rule that must be proven.
*   **Authority**: A specific legal source (case, statute, regulation) broken down into rule, elements, key language, and factual posture.
*   **Strategy**: A proposed path forward, utilizing specific facts and authority.
*   **Argument**: A constructed legal point (e.g., using CREAC) linking facts, elements, and authority.
*   **Outcome**: The final result of a strategy or case.

### 2.2 Object Relationships

The system's logic relies on mapping these objects:
*   `Fact` → *supports* → `Element`
*   `Element` → *supported by* → `Authority`
*   `Strategy` → *uses* → `Authority` + `Facts`

## 3. The Dynamic Logic Layer: Authority Profiles

A core requirement of AssociateOnDemand is the ability to switch logic dynamically based on the legal context (e.g., Personal Injury vs. Immigration). This is achieved through **Authority Profiles**. Every legal source is treated as a typed node, not a generic category bucket.

### 3.1 Authority Source Types

The system must categorize authority into distinct types:
1.  **Case Law**: Federal/state courts, Westlaw cases.
2.  **Statutory Law**: Federal statutes (e.g., INA), state statutes.
3.  **Regulatory**: CFR, agency rules.
4.  **Administrative/Agency Materials**: State Department reports, USCIS policy manuals, BIA decisions.
5.  **Internal Knowledge**: Prior firm cases, arguments, and outcomes.

### 3.2 Example Authority Profiles

The system uses these profiles to determine source priority and weighting logic.

**Authority Profile: Personal Injury (Ohio)**
*   **Jurisdiction**: Ohio courts, Federal (6th Circuit).
*   **Primary Sources**: Ohio case law, Ohio statutes.
*   **Secondary Sources**: Federal persuasive authority, Internal prior cases.
*   **Weighting Logic**: Binding Ohio authority > Persuasive 6th Circuit > Recent cases > Factually similar internal cases.
*   **Example Use Case**: If an injury issue arises, prioritize Ohio cases, then look to the 6th Circuit for persuasive support.

**Authority Profile: Immigration**
*   **Jurisdiction**: Federal only.
*   **Primary Sources**: INA (statutes), BIA precedent.
*   **Secondary Sources**: Circuit court (varies), State Dept reports, USCIS guidance, Internal prior cases.
*   **Weighting Logic**: BIA precedent heavily weighted > Circuit court > State Dept reports (for factual support).
*   **Example Use Case**: Always apply federal law; use State Department reports to support factual claims regarding country conditions.

## 4. Technical Requirements

### 4.1 Data Processing and Storage

The AssociateOnDemand system necessitates robust capabilities for data handling and persistent storage. Document parsing requires Optical Character Recognition (OCR) and text extraction for various formats. A vector database is essential for storing proprietary "Legal Skills," model answers, and firm-specific knowledge bases, facilitating efficient Retrieval-Augmented Generation (RAG). A relational database (PostgreSQL) will manage the structured objects (Facts, Issues, Elements) and their relationships.

### 4.2 AI and Agentic Logic

The intelligence of the AssociateOnDemand system is rooted in its sophisticated AI and agentic logic. The system must not only generate text but also execute the **Decision Logic**—determining the next step and selecting strategies based on the Authority Profiles. A critical technical requirement is the implementation of hallucination mitigation strategies via the **Validation Layer**, which flags missing element support or weak authority.

## 5. Compliance and Security

Given the sensitive nature of legal data, compliance with industry standards and robust security measures are non-negotiable.

### 5.1 ABA and Legal Standards

Adherence to American Bar Association (ABA) data security standards is a core requirement. This includes stringent confidentiality protocols, mandating that all data be encrypted both at rest (using AES-256 encryption) and in transit (via TLS 1.2+). Protection of Personally Identifiable Information (PII) is critical. A robust Role-Based Access Control (RBAC) system will delineate user permissions.

### 5.2 Reliability

To ensure trustworthiness, the AssociateOnDemand system will incorporate a mandatory verification layer for all legal citations, cross-referencing them against authoritative legal databases (e.g., Westlaw) to confirm their existence and applicability. Comprehensive audit logs will record all AI-generated content and human modifications.

## 6. Agent Team Definitions

The AssociateOnDemand system operates through a collaborative team of specialized AI agents:

| Agent Role | Primary Function | Key Responsibilities |
| :--- | :--- | :--- |
| **The Manager Agent** | Workflow Orchestration | Oversees the 10-step workflow, calculates the Fidelity Score, and manages the "Big Picture" state. |
| **The Extraction Agent** | Data Ingestion | Focuses on reading raw documents and identifying Facts (Step 2). |
| **The Mapping Agent** | Element Alignment | Maps Facts to Elements and Issues (Steps 3 & 4). |
| **The Research Agent** | Authority Retrieval | Interfaces with Westlaw to pull Authority and applies the relevant Authority Profile (Step 5). |
| **The Strategy Agent** | Decision Engine | Compares facts, internal cases, and authority to surface Strategy Options (Step 6). |
| **The Drafting Agent** | Argument Construction | Synthesizes structured inputs into legal narratives (Step 7). |

## 7. Performance Requirements

To meet the demands of high-volume legal practice, the AssociateOnDemand system must adhere to stringent performance criteria. The latency for initial document analysis should be completed within 60 to 120 seconds. The architecture must be inherently scalable, capable of supporting concurrent case processing for multiple users. The core workflow engine is expected to maintain 99.9% uptime.
