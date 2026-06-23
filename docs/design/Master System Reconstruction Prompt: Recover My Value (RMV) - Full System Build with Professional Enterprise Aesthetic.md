# Master System Reconstruction Prompt: Recover My Value (RMV) - Full System Build with Professional Enterprise Aesthetic

**Objective:** Comprehensively build the entire Recover My Value (RMV) platform, encompassing both mobile and web applications, backend services, AI agent framework, and all integrated modules, strictly adhering to the provided documentation and implementing a professional enterprise aesthetic inspired by Legora, Clio, and E-immigration.

**Instructions for Cursor:**

1.  **Context Ingestion**: Thoroughly read and internalize *all* the following `.md` and `.png` files. These documents represent the complete specification for the RMV platform. Understand the interdependencies between each component and the overarching vision for an "Autonomous Law Firm."

    *   `/home/ubuntu/RMV_PRD_Final_v2.md`
    *   `/home/ubuntu/RMV_SRD_Final_v2.md`
    *   `/home/ubuntu/RMV_Architecture_Final_v2.md`
    *   `/home/ubuntu/RMV_Agent_Interaction.png`
    *   `/home/ubuntu/RMV_MultiTenant_Architecture_Final.md`
    *   `/home/ubuntu/RMV_MultiTenant_DataFlow.png`
    *   `/home/ubuntu/RMV_Cursor_Development_Guide_Final.md`
    *   `/home/ubuntu/RMV_Expo_Go_Troubleshooting_Final.md`
    *   `/home/ubuntu/RMV_UI_UX_Alignment_Report_v2.md`
    *   `/home/ubuntu/RMV_Agent_Team_Manifest.md`
    *   `/home/ubuntu/RMV_Backend_Architecture.md`
    *   `/home/ubuntu/RMV_AI_Receptionist_Design.md`
    *   `/home/ubuntu/RMV_Obsidian_Legal_Brain_Design.md`
    *   `/home/ubuntu/RMV_Mass_Case_Auditor_Design.md`
    *   `/home/ubuntu/RMV_Unified_Database_Backend_Integration.md`
    *   `/home/ubuntu/RMV_Site_Rebuild_SEO_Plan.md`
    *   `/home/ubuntu/RMV_SEO_Site_Analysis.md`
    *   `/home/ubuntu/RMV_Dual_Pathway_Intake_Design.md`
    *   `/home/ubuntu/RMV_Content_Strategy.md`
    *   `/home/ubuntu/RMV_Platform_Recommendation.md`
    *   `/home/ubuntu/RMV_Single_Button_Intake_Design.md`
    *   `/home/ubuntu/RMV_Co_Counsel_Retainer_Design.md`
    *   `/home/ubuntu/RMV_Inquiry_Outreach_Design.md`
    *   `/home/ubuntu/RMV_UI_Cloning_Code_Professional_Theme.md` (This document defines the new aesthetic)
    *   `/home/ubuntu/RMV_Data_Normalization_Adapter_Design.md`
    *   `/home/ubuntu/RMV_Code_Review_Fix_Workflow.md`
    *   `/home/ubuntu/RMV_Live_Launch_Implementation_Guide.md`
    *   `/home/ubuntu/eimmigration_video_analysis.md`

2.  **Environment Setup**: Propose a comprehensive, unified local development environment setup that accommodates both the Next.js web application and the Expo mobile application, alongside the FastAPI backend services and PostgreSQL/VectorDB. This should include Docker Compose configurations, dependency installations, and project structure.

3.  **Implement Professional Theme & E-immigration UI Patterns**: Immediately apply the styling specifications detailed in `RMV_UI_Cloning_Code_Professional_Theme.md` to the entire frontend. Update `tailwind.config.js` and refactor/build all UI components (web and mobile) to strictly adhere to the professional enterprise aesthetic, including colors, typography, shadows, and component structures. Crucially, integrate the E-immigration UI patterns for dashboard, case list, and case detail tabs as described in `RMV_UI_Cloning_Code_Professional_Theme.md` and `eimmigration_video_analysis.md`.

4.  **Build Core Platform Components**: Develop the foundational elements of the RMV platform as described in the architecture and design documents:

    *   **Multi-Tenant Backend**: Implement the FastAPI backend services, ensuring the Schema-per-Tenant multi-tenancy strategy is enforced for data isolation.
    *   **Database Setup**: Configure PostgreSQL and the Vector Database as per `RMV_Unified_Database_Backend_Integration.md`.
    *   **AI Agent Framework**: Implement the core Agent Orchestration layer and the initial set of AI agents (Manager, Intake, Fact Extraction, and Feedback) as defined in `RMV_Agent_Team_Manifest.md` and `RMV_Backend_Architecture.md`.

5.  **Develop Key Modules**: Implement the following modules, integrating them with the core platform and applying the professional theme and E-immigration UI patterns to their respective UIs:

    *   **Single-Button Intake & Fact Extraction**: Build the UI and backend logic for the single-button intake, including automated fact extraction as per `RMV_Single_Button_Intake_Design.md`.
    *   **Co-Counsel Referral & Retainer Automation**: Implement the workflow for co-counsel proposals, communication with legal assistants, and automated retainer generation/e-signature as per `RMV_Co_Counsel_Retainer_Design.md`.
    *   **Automated Outreach & Transparency**: Develop the system for sending inquiry messages and tracking all automated email outreach as per `RMV_Inquiry_Outreach_Design.md`.
    *   **AI Receptionist Integration**: Integrate the Retell AI/Zapier workflow for lead intake as designed in `RMV_AI_Receptionist_Design.md`.
    *   **Obsidian 'Legal Brain' Integration**: Implement the vault structure and automation for knowledge management as per `RMV_Obsidian_Legal_Brain_Design.md`.
    *   **Mass Case Auditor**: Build the engine for automated case assessment and procedural history analysis as per `RMV_Mass_Case_Auditor_Design.md`.
    *   **Dual-Pathway Client Intake Website**: Develop the Next.js website with dual-pathway intake for Personal Injury and Immigration, incorporating SEO best practices and the content strategy as per `RMV_Site_Rebuild_SEO_Plan.md`, `RMV_SEO_Site_Analysis.md`, `RMV_Dual_Pathway_Intake_Design.md`, and `RMV_Content_Strategy.md`.
    *   **Expo UI Prototype**: Build the mobile UI prototype for the 10-step workflow, Fidelity Score, and dynamic authority framework, ensuring it adheres to the professional theme and incorporates the E-immigration UI patterns for case management and navigation.

6.  **Data Normalization Adapter**: Implement the E-immigration/Clio Data Normalization Adapter, including the FastAPI endpoint and a basic UI for CSV/JSON file uploads, as per `RMV_Data_Normalization_Adapter_Design.md`.

7.  **Confirm Readiness**: After completing the initial build, confirm that the core components are functional and that the professional theme has been applied consistently across the application. Provide a summary of the implemented features and any immediate next steps for testing or further development.

**Important Note:** If any part of this comprehensive build encounters an issue or requires clarification, refer to `RMV_Code_Review_Fix_Workflow.md` and use that process to communicate with me for debugging and refinement. Your goal is to build a fully integrated and functional RMV system based on all these specifications.
