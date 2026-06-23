# Architecture Outline: AssociateOnDemand powered by AssociateOnDemand

**Author:** Manus AI
**Date:** April 22, 2026
**Project:** AssociateOnDemand powered by AssociateOnDemand / Lightship

## 1. High-Level System Architecture

The AssociateOnDemand powered by AssociateOnDemand system is architected upon a **Modular Agentic Framework**, designed to provide a clear separation of concerns across its operational layers. This framework distinctly segregates the "Data Layer," responsible for all storage and integration aspects, from the "Logic Layer," which encapsulates the intelligent processing performed by AI agents, and the "User Layer," dedicated to user interaction and interface. This modularity ensures scalability, maintainability, and flexibility in adapting to evolving legal requirements and technological advancements.

### 1.1 Architectural Layers

AssociateOnDemand's architecture is composed of four primary layers, each serving a specific function:

*   **Interface Layer**: This layer comprises a web-based dashboard and mobile application, serving as the primary point of interaction for attorneys, paralegals, and other legal professionals. Through this interface, users can interact with the case map, monitor workflow progress, and engage directly with the AI agents.
*   **Orchestration Layer (The Manager)**: Functioning as the central intelligence of the system, the Manager Agent resides within this layer. It is responsible for overseeing the entire "Agent Team," coordinating their activities, and tracking the complete lifecycle of each case from intake to final draft. This layer ensures that tasks are delegated efficiently and that the overall case flow adheres to defined judgment rules.
*   **Service Layer (Specialized Agents)**: This layer consists of independent, specialized AI agents, each designed to perform a distinct task within the legal workflow. These agents include the Extraction Agent, Mapping Agent, Research Agent, Drafting Agent, and Strategy Agent, among others. Their independence allows for parallel processing and specialized expertise in their respective domains.
*   **Data Layer**: The Data Layer is responsible for all data persistence and external integrations. It includes direct integrations with Google Drive for document management, E-immigration for case management (via webhooks or scraping), and a private Vector Database. This Vector Database is crucial for storing "Firm Skills"—proprietary knowledge, model answers, and learned feedback—that enhance the AI's performance and customization.

## 2. System Purpose: The Legal Decision Engine

AssociateOnDemand is fundamentally a **decision engine** that structures how legal decisions are made, validated, and reused. It moves beyond simple document generation to provide a dynamic system that adapts legal reasoning based on context, determining which law matters and how it is used.

## 3. Core Workflow Layers: The 10-Step Legal Decision Process

The system's core functionality is built around a refined 10-step workflow, which guides a case from initial intake through strategic analysis and argument construction. This process is orchestrated by the Manager Agent and executed by specialized agents.

1.  **Entry Layer (Access + Context)**
2.  **Fact Acquisition Layer**
3.  **Issue Detection Layer**
4.  **Element Mapping Layer**
5.  **Authority Layer**
6.  **Strategy Layer**
7.  **Argument Construction Layer**
8.  **Validation Layer**
9.  **Human Override Layer**
10. **Next Step Engine**

## 4. Core Data Structures and Relationships

To support the intricate legal workflow, AssociateOnDemand defines and manages several core data structures and their relationships:

### 4.1 Data Objects

*   **Fact**: An atomic, verified piece of information extracted from case materials.
*   **Issue**: A legal question or point of contention identified from the facts.
*   **Element**: A constituent part of a legal rule that must be satisfied or proven.
*   **Authority**: A specific legal source (e.g., case, statute, regulation) parsed into its rule, elements, key language, and factual posture.
*   **Strategy**: A proposed course of action or legal argument, leveraging facts and authority.
*   **Argument**: A structured legal assertion, typically following frameworks like IRAC/CREAC, linking facts, elements, and authority.
*   **Outcome**: The result or disposition of a case or a specific legal strategy.

### 4.2 Relationships Between Objects

The system establishes clear relationships to model legal reasoning:
*   `Fact` → *supports* → `Element`
*   `Element` → *supported by* → `Authority`
*   `Strategy` → *uses* → `Authority` + `Facts`

## 5. Dynamic Authority Framework

AssociateOnDemand implements a dynamic authority framework that adapts based on the specific case context (e.g., practice area, jurisdiction). Every legal source is treated as a typed node, allowing for modular and flexible application of legal rules.

### 5.1 Authority Source Types

Legal authority is categorized into distinct, modular types:
1.  **Case Law**: Judicial opinions from federal and state courts.
2.  **Statutory Law**: Enacted laws from federal and state legislatures.
3.  **Regulatory**: Rules and regulations promulgated by administrative agencies.
4.  **Administrative/Agency Materials**: Policy manuals, guidance documents, and decisions from specific agencies (e.g., USCIS, BIA).
5.  **Internal Knowledge**: Proprietary data derived from the firm's past cases, arguments, and outcomes.

### 5.2 Authority Profiles

Authority Profiles define the relevant jurisdictions, source priorities, and weighting logic for specific practice areas. This allows the system to dynamically switch its legal reasoning based on the case context.

**Authority Profile: Personal Injury (Ohio)**
*   **Jurisdiction**: Ohio state courts, Federal (6th Circuit Court of Appeals).
*   **Primary Sources**: Ohio case law, Ohio statutes.
*   **Secondary Sources**: Federal persuasive authority (6th Circuit), Internal prior cases.
*   **Weighting Logic**: Binding Ohio authority > Persuasive 6th Circuit > Recent cases > Factually similar internal cases.
*   **Example Use Case**: For an injury issue, the system prioritizes Ohio state cases, then considers persuasive authority from the 6th Circuit.

**Authority Profile: Immigration**
*   **Jurisdiction**: Federal only.
*   **Primary Sources**: Immigration and Nationality Act (INA) statutes, Board of Immigration Appeals (BIA) precedent decisions.
*   **Secondary Sources**: Circuit court decisions (variable by circuit), State Department reports, USCIS policy guidance, Internal prior cases.
*   **Weighting Logic**: BIA precedent heavily weighted > Relevant Circuit court decisions > State Department reports (for factual support).
*   **Example Use Case**: Always applies federal law; uses State Department reports and USCIS guidance to support factual claims regarding country conditions or policy interpretations.

This modular approach enables the system to:
*   Dynamically switch its legal reasoning logic.
*   Easily expand to new practice areas without extensive re-engineering.
*   Avoid redundant rule definitions.

## 6. Decision Logic and Validation Rules

### 6.1 Decision Logic

The system's decision logic defines how it determines the next step in the workflow and how strategies are selected. This involves:
*   **Pattern Recognition Layer**: Implicitly, the system identifies repeating fact patterns and suggests prior internal analogs to inform strategy development.
*   **Strategy Selection**: Based on the comparison of current facts, prior internal cases, and authority, the system proposes and ranks possible strategies.
*   **Rejection Tracking**: The system tracks strategies considered but not used, providing valuable data for refining future decision-making and understanding the firm's intelligence.

### 6.2 Validation Rules

The Validation Layer (Step 8 in the workflow) is governed by specific rules that trigger flags for potential weaknesses:
*   **Missing Element Support**: Flags when a legal element lacks sufficient factual backing.
*   **Weak Authority**: Identifies when an argument relies on non-binding, outdated, or factually dissimilar authority.
*   **Inconsistent Reasoning**: Detects logical inconsistencies within the argument structure.
*   **Policy Misalignment**: Flags deviations from established firm policies or legal interpretations.
*   **Risk Exposure**: Highlights areas where the case might be vulnerable to adverse outcomes.

## 7. Agent Team Interaction Model

The Manager Agent plays a pivotal role in maintaining the "Big Picture" of each case and orchestrating the flow of information and tasks among the specialized agents. This collaborative model ensures that each agent contributes its specific expertise at the appropriate stage of the legal workflow.

![AssociateOnDemand Agent Interaction Diagram](https://private-us-east-1.manuscdn.com/sessionFile/mjKBL4Vea9R8cMVqGprzNf/sandbox/rXLctI3aS2oD4kCO8r26qY-images_1777421758117_na1fn_L2hvbWUvdWJ1bnR1L1JNVl9BZ2VudF9JbnRlcmFjdGlvbg.png?Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvbWpLQkw0VmVhOVI4Y01WcUdwcnpOZi9zYW5kYm94L3JYTGN0STNhUzJvRDRrQ084cjI2cVktaW1hZ2VzXzE3Nzc0MjE3NTgxMTdfbmExZm5fTDJodmJXVXZkV0oxYm5SMUwxSk5WbDlCWjJWdWRGOUpiblJsY21GamRHbHZiZy5wbmciLCJDb25kaXRpb24iOnsiRGF0ZUxlc3NUaGFuIjp7IkFXUzpFcG9jaFRpbWUiOjE3OTg3NjE2MDB9fX1dfQ__&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=dDMXWiQ2OMIl5kM9yWDgPUFckS~ONQBQ9a~xBrPSUHCrFnZ3e--eV57gcw-6ZBxAYF167oXiyXmRWDY4ZNv74wDKOf2zJxyspv1P3JTgh16rHKvLXfMWOjg4FKRSvQZ1Mli5n9D7h6AA6jMlmGWTaV8B~rLukoegsM1BdCtC~n09W23fYrrNwUQfIXRGOSAaYG1XbXeCZY2DdLfipxYVab0JaTvGaOyXqnrK8m~I15-~sIQlDw-6xVsUWrzVok4o0DBMOSFKY3BynHVfZj72M9EEvlhp4sgxOL0jAqtPJF-tu3UTBzcnaCOdzr9AWfKMZa2wDlyWzOCwZgnDangY1Q__)

### 7.1 Agent Roles and Judgment Rules

Each agent within the AssociateOnDemand system has a clearly defined role, guided by "Judgment Rules" that are derived from legal statutes, firm policies, and historical case precedents:

*   **Manager Agent**: This agent is responsible for tracking critical case elements, such as trial deadlines and overall case status. It applies predefined "Judgment Rules" to determine when a case is ready to advance to the next phase, ensuring adherence to legal timelines and strategic objectives. It also calculates and monitors the Fidelity Score.
*   **Extraction Agent**: Utilizing advanced Large Language Model (LLM)-based Named Entity Recognition (NER) capabilities, the Extraction Agent processes documents from sources like Google Drive. Its primary function is to accurately identify and extract key facts, dates, names, and events relevant to the case.
*   **Mapping Agent**: The Mapping Agent cross-references the facts extracted by the Extraction Agent against a "Case Element Chart." This process involves mapping specific facts (e.g., "Client was arrested in Moscow") to relevant legal elements (e.g., "Persecution by Government"), thereby structuring the factual narrative according to legal requirements.
*   **Research Agent**: This agent is designed to execute "Closed-Loop" queries against verified legal databases, such as Westlaw or LexisNexis. Its objective is to find and retrieve supporting case law, statutes, and regulations that precisely match the current fact pattern and legal elements, ensuring the reliability and accuracy of legal research.
*   **Strategy Agent**: This agent compares the current case's facts, the firm's prior internal cases, and the relevant legal authority to surface possible strategies, a recommended path, and—critically—rejected paths with rationale.
*   **Drafting Agent**: The Drafting Agent synthesizes all the processed inputs—structured facts, mapped legal elements, and research—into a cohesive and "Nuanced Narrative." This agent is responsible for generating legal documents, such as briefs or motions, that adhere to the firm's model answers and strategic guidelines, while also accommodating the subtle complexities of legal argumentation.

## 8. The "Skill" Learning Loop

To achieve the goal of a "Collaborative AI" that continuously improves, the AssociateOnDemand architecture incorporates a persistent feedback loop. This mechanism allows the system to learn from human interaction and refine its performance over time:

1.  **Output Generation**: The Drafting Agent produces a preliminary legal document, such as a brief, based on the processed case information.
2.  **Human Review**: An attorney reviews the AI-generated output and makes necessary edits or refinements within a "Structured Editor" (e.g., a block-based editor).
3.  **Feedback Capture**: The Manager Agent analyzes the differences (the "delta") between the AI's initial output and the attorney's final edited version. This analysis identifies specific areas where the AI's logic or output could be improved.
4.  **Skill Update**: The refined logic or specific instructions derived from the attorney's edits are then stored in the **Vector Store** as a "Firm Skill." For example, a skill might be recorded as: "Always emphasize X when dealing with Y judge in Z type of case." This ensures that the system's knowledge base is continuously updated and personalized to the firm's practices and preferences.

## 9. Technology Stack (Proposed)

The proposed technology stack for AssociateOnDemand is designed to support its modular, agentic, and AI-driven architecture, ensuring both performance and flexibility:

*   **Frontend**: The user interface will be developed using **React.js**, providing a dynamic and responsive web application. A block-based editor, such as Lexical or Slate.js, will be integrated to facilitate structured content creation and editing, allowing for granular control over AI-generated text.
*   **Backend**: **Python** will serve as the primary language for the backend, with **FastAPI** utilized for building high-performance APIs and orchestrating the various AI agents. Python's rich ecosystem of AI/ML libraries makes it ideal for this application.
*   **AI Models**: The system will leverage advanced AI models such as **GPT-4o** or **Claude 3.5 Sonnet** for complex reasoning, natural language understanding, and generation tasks. Specialized embeddings will be employed for Retrieval-Augmented Generation (RAG) to enhance the accuracy and relevance of AI outputs by grounding them in specific legal knowledge.
*   **Database**: **PostgreSQL** will be used as the relational database for managing case metadata, user profiles, audit logs, and workflow states. A vector database, such as **Pinecone** or **Weaviate**, will store the "Firm Skills" and other contextual embeddings, enabling efficient semantic search and retrieval for the RAG system.
*   **Integrations**: Key integrations include the **Google Drive API** for seamless document management, **E-immigration** (via webhooks or scraping) for specialized case management, and APIs or search interfaces for legal research platforms like **Westlaw** and **LexisNexis** to ensure closed-loop research and citation verification.

## 10. Security Architecture

Given the highly sensitive nature of legal data, the security architecture of AssociateOnDemand is paramount and designed with a multi-layered approach:

*   **Environment**: The entire system will operate within an **Isolated Virtual Private Cloud (VPC)**, ensuring network isolation and control over inbound and outbound traffic. This provides a secure and dedicated computing environment.
*   **Encryption**: All data, both at rest and in transit, will be protected through **end-to-end encryption**. Data at rest will be encrypted using industry-standard algorithms (e.g., AES-256), while data in transit will be secured using TLS 1.2+ protocols.
*   **Anonymization**: To further enhance privacy and compliance, the system will include an **option to scrub Personally Identifiable Information (PII)** before sending data to external Large Language Models (LLMs), particularly if using APIs that do not guarantee zero-retention policies. This ensures that sensitive client information is protected even when leveraging third-party AI services.
*   **Access Control**: A robust **Role-Based Access Control (RBAC)** system will be implemented to manage user permissions, ensuring that only authorized personnel have access to specific data and functionalities, in line with ABA data security standards and client confidentiality requirements. This granular control prevents unauthorized access and maintains the integrity of legal information.
