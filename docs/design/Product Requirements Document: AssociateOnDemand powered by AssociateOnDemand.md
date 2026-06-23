# Product Requirements Document: AssociateOnDemand powered by AssociateOnDemand

**Author:** Manus AI
**Date:** April 22, 2026
**Project:** AssociateOnDemand powered by AssociateOnDemand / Lightship

## 1. Executive Summary

AssociateOnDemand powered by AssociateOnDemand is a structured legal workflow system designed to optimize the "construction" phase of high-volume legal practice. The core insight driving AssociateOnDemand is that high-volume legal work is not primarily limited by legal skill, but rather by the repetitive reconstruction of facts, research frameworks, and drafting from unstructured inputs. Unlike traditional case management systems that focus primarily on storage, or AI drafting tools that focus solely on output generation, AssociateOnDemand provides an architectural layer. This layer converts raw intake and facts into structured legal frameworks. By reducing the reconstructive cognitive load on attorneys, AssociateOnDemand aims to significantly increase case throughput and consistency, effectively acting as an operating system for high-volume legal practice. The initial wedge market for this product is immigration law, specifically targeting solo practitioners, small firms, and non-profit legal organizations.

## 2. Target Audience and User Personas

The AssociateOnDemand system is designed to support a collaborative environment where different roles interact with the system based on their expertise and administrative responsibilities. The system distinguishes between those who build the foundation and those who validate the legal strategy.

| Persona | Role in System | Key Responsibilities and Needs |
| :--- | :--- | :--- |
| **Founding/Lead Attorney** | Architect and Validator | The attorney defines the judgment rules based on law, policy, and previous cases. They are responsible for validating AI outputs and training the system's "skills" by providing nuanced feedback on specific fact patterns. They require a system that learns from their edits rather than just generating static text. |
| **Paralegal / Legal Assistant** | Builder and Updater | These users handle the administrative and foundational building aspects. They upload documents, add case updates, Shepardize information, and manage processes such as filing procedures. Their work builds the structure that the attorney later validates. |
| **Non-Profit Operations Manager** | System Administrator | In a non-profit setting, this role oversees workflow efficiency, manages multi-user access, and ensures proper resource allocation across various cases and legal teams. |

## 3. Core Workflow: The 10-Step Legal Decision Engine

The foundation of AssociateOnDemand is a 10-step workflow that transforms raw case data into a validated legal argument. This structured process is designed to be iterative and pressure-tested, ensuring that every case is built on a solid foundation of facts, law, and strategy.

1.  **Entry Layer (Access + Context)**: The user journey begins with secure login and matter type selection (e.g., Personal Injury, Immigration), followed by case creation.
2.  **Fact Acquisition Layer**: The system ingests facts through structured intake forms, guided surveys, and direct human input (interviews). The system then extracts, tags, and detects triggers within this data, producing a **Structured Fact Pattern**.
3.  **Issue Detection Layer**: The system analyzes the Structured Fact Pattern to identify potential legal issues, generating an **Issue Tree** that outlines the core legal questions.
4.  **Element Mapping Layer**: The system breaks down each issue into its constituent legal elements and maps the acquired facts to these elements, resulting in an **Element-Linked Fact Structure**.
5.  **Authority Layer**: Leveraging integrations with legal research platforms like Westlaw, the system pulls relevant legal authority (case law, statutes, regulations) and links it to the corresponding elements, creating a **Supported Legal Framework**.
6.  **Strategy Layer**: This is AssociateOnDemand's key differentiator. The system compares the current case's facts, the firm's prior internal cases, and the relevant legal authority to surface possible strategies, a recommended path, and—critically—rejected paths with rationale. The output is a set of **Strategy Options + Rationale**.
7.  **Argument Construction Layer**: Using established legal reasoning frameworks (e.g., REAC, CREAC, IRAC), the system constructs arguments from the structured inputs, moving beyond simple blank-slate drafting.
8.  **Validation Layer**: The system flags potential weaknesses in the case, such as missing element support, weak authority, inconsistent reasoning, policy misalignment, or risk exposure, providing **Structured Review Feedback**.
9.  **Human Override Layer**: The attorney reviews the system's output, makes adjustments, and applies their final judgment. This layer is critical for ethical compliance and strategic positioning.
10. **Next Step Engine**: The system recommends the next procedural and strategic steps, ensuring the case continues to move forward efficiently.

## 4. Core Features and Functional Requirements

### 4.1 The Fidelity Score

To provide a quantifiable measure of a case's strength and readiness, AssociateOnDemand will calculate a **Fidelity Score**. This score evaluates how well a case is structurally and legally supported before action is taken. The Fidelity Score is composed of several key metrics:

*   **Element Support**: The percentage of legal elements supported by concrete facts.
*   **Authority Backing**: The percentage of arguments backed by relevant, strong legal authority.
*   **Strategic Consistency**: The degree of consistency with the firm's prior successful strategies.
*   **Pattern Deviation**: The extent of deviation from known strong legal patterns.

### 4.2 Feedback Loop and Pattern Recognition

AssociateOnDemand is a learning system. After a case outcome is known, the system prompts for feedback on what worked, what failed, and what could be done differently. This feedback directly refines the **Strategy Layer** for future cases. The system will also explicitly identify repeating fact patterns and suggest prior internal analogs, accelerating the strategy development process. Furthermore, the system will track strategies that were considered but not used, providing a rich dataset for understanding the firm's decision-making intelligence.

## 5. User Experience Goals

The user experience is centered around end-to-end visibility and collaborative refinement. The system must provide a "Manager View" that allows users to see the big picture of the case flow, from initial intake to the final draft. The interaction with the AI should feel less like a standard chatbot and more like a structured collaboration, where the AI provides a foundation that the attorney can prune, edit, and refine. The system must handle the nuance of legal writing, allowing the attorney to maintain their unique voice and strategic approach while benefiting from the AI's organizational capabilities.

## 6. Integration Requirements

To fit seamlessly into existing law firm operations, AssociateOnDemand must integrate with tools that firms already use. The primary integration priority for the initial architecture is Google Drive, which will serve as the main repository for file management and document storage. For the non-profit sector, integration with E-immigration is a top priority, as it is a widely used case management system in that space. In the future, the system should aim to reverse-engineer or deeply integrate with comprehensive practice management platforms like Clio, allowing AssociateOnDemand to act as the workflow layer on top of these storage and management systems.

## 7. Success Metrics

The success of AssociateOnDemand will be measured by its impact on law firm efficiency and output quality. The primary metric is increased throughput, specifically targeting a 40% to 60% reduction in the time attorneys spend on reconstructive work and drafting. Consistency is another key metric, measured by the improved alignment of case briefs with the firm's established model answers and strategies. Finally, accuracy is paramount; the system must achieve zero hallucinations in legal citations, ensuring that all generated research is entirely reliable and verifiable. The Fidelity Score will serve as a leading indicator of case quality and readiness.
