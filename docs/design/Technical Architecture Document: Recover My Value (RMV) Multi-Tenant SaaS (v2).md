# Technical Architecture Document: Recover My Value (RMV) Multi-Tenant SaaS (v2)

**Author:** Manus AI
**Date:** April 28, 2026
**Project:** Recover My Value (RMV) / Lightship

## Table of Contents

1.  Introduction
2.  Core Technology Stack
    2.1. Frontend (Web & Mobile)
    2.2. Backend (API Services)
    2.3. Database
    2.4. APIs and Integrations
    2.5. Additional Third-Party Services
3.  Multi-Tenancy Strategy
    3.1. Data Isolation
    3.2. Tenant Provisioning and Management
    3.3. Security Considerations for Multi-Tenancy
4.  Data Feed to Cursor (Development Workflow)
5.  High-Level Data Flow (Multi-Tenant)
6.  Cursor-Optimized Development Guide
    6.1. Introduction to Cursor-Driven Development
    6.2. Setting Up Your Cursor Environment
    6.3. Leveraging AI Agent Teams with Cursor
    6.4. Multi-Tenancy Development Considerations
    6.5. Best Practices for Cursor-Assisted Development
7.  Website Rebuild & SEO Integration
    7.1. Platform Decision: Custom Next.js/FastAPI
    7.2. Dual-Pathway Client Intake Integration
    7.3. SEO Optimization Strategy
8.  References

---

## 1. Introduction

This document details the technical architecture for Recover My Value (RMV) as a multi-tenant Software-as-a-Service (SaaS) platform. The design prioritizes scalability, robust security, and an optimized development experience, particularly for environments leveraging tools like Cursor and AI agent teams. A multi-tenant architecture is chosen to enable a single instance of the software to efficiently serve multiple customer organizations, or tenants, each maintaining isolated data and configurations. This approach maximizes resource utilization, streamlines operational management, and reduces the overall cost of ownership for the platform.

This updated version incorporates the decision to rebuild the public-facing website using the same custom Next.js/FastAPI stack, integrating advanced SEO strategies and a dual-pathway client intake system for Personal Injury and Immigration law.

## 2. Core Technology Stack

The proposed technology stack is carefully selected to provide a modern, high-performance, and developer-friendly environment. This selection supports the objective of "vibe coding" with AI assistance, facilitating rapid development and iteration while ensuring the platform's long-term stability and security.

### 2.1 Frontend (Web & Mobile)

The frontend will be built using a combination of leading web and mobile technologies to deliver responsive, intuitive, and performant user interfaces across all platforms:

*   **Web Platform**: **Next.js** (React.js framework) will be used for the public-facing website and the main RMV web application. It provides server-side rendering (SSR) for improved SEO and initial page load times, efficient routing, and API routes.
*   **Mobile Platform**: **Expo** (React Native framework) will be used for the mobile application, ensuring a native-like experience on iOS and Android from a single codebase.
*   **Styling**: **Tailwind CSS** will be employed for its utility-first approach to styling, enabling rapid UI development and ensuring design consistency across both web and mobile applications. This approach minimizes custom CSS and accelerates the styling process.
*   **Component Library**: To ensure accessibility and provide a rich set of customizable UI components, **Chakra UI** or **Radix UI** will be integrated for web, and a compatible React Native component library for mobile. These libraries offer pre-built, accessible components that can be easily themed to match RMV's brand and the Legora/Clio aesthetic.
*   **State Management**: For efficient data fetching and caching, **React Query** will be utilized. This reduces boilerplate code for data synchronization. For lightweight global state management, **Zustand** or **Jotai** will be preferred due to their simplicity and minimal overhead.

**Rationale**: This unified frontend stack offers a powerful combination for building modern web and mobile applications. Next.js and Expo enhance performance and developer experience, while Tailwind CSS and chosen component libraries accelerate UI creation. React Query and lightweight state management solutions ensure efficient data handling and a responsive user experience across all devices.

### 2.2 Backend (API Services)

The backend will be designed to be highly performant, scalable, and secure, leveraging Python's strengths in AI and data processing:

*   **Framework**: **Python** with **FastAPI** will form the core of the backend services. FastAPI is chosen for its high performance, automatic OpenAPI documentation generation, and excellent developer experience, making it ideal for building robust and well-documented API services.
*   **Asynchronous Tasks**: **Celery**, a distributed task queue, will be used to handle long-running or asynchronous operations, such as complex AI processing tasks. **Redis** will serve as the message broker for Celery, facilitating efficient task queuing and execution.
*   **Authentication/Authorization**: A dedicated **OAuth 2.0** provider (e.g., Auth0, Clerk) will manage user authentication. **JSON Web Tokens (JWT)** will be used for secure API authorization, and a comprehensive **Role-Based Access Control (RBAC)** system will enforce fine-grained permissions, crucial for a multi-tenant legal application.
*   **Agent Orchestration**: Internal services, also built with FastAPI, will be responsible for managing and coordinating the various AI agents (Extraction, Mapping, Research, Drafting, Manager) that constitute the core intelligence of RMV.

**Rationale**: FastAPI's performance and Python's rich ecosystem for AI/ML are perfectly suited for RMV's agentic architecture. Celery and Redis ensure that the system can handle intensive background tasks without impacting real-time user interactions. Robust authentication and authorization mechanisms are paramount for securing sensitive legal data in a multi-tenant environment.

### 2.3 Database

The database layer is critical for storing and managing sensitive legal data, as well as the unique "Firm Skills" developed by each tenant:

*   **Primary Database**: **PostgreSQL** is selected as the primary relational database. It is renowned for its reliability, data integrity, extensibility, and strong support for advanced features like JSONB data types, which can be beneficial for flexible schema requirements. PostgreSQL's robust security features make it suitable for handling confidential legal information.
*   **Vector Database**: A specialized **Vector Database**, such as **Pinecone** or **Weaviate**, will be integrated. This is essential for efficiently storing and querying embeddings used in Retrieval-Augmented Generation (RAG) processes and for managing the proprietary "Firm Skills" and knowledge bases specific to each tenant.
*   **Caching**: **Redis** will be utilized for high-performance caching of frequently accessed data, significantly reducing database load and improving response times. It also serves as the message broker for Celery.

**Rationale**: PostgreSQL offers a powerful and reliable solution for structured legal data, supporting various multi-tenancy strategies. A vector database is indispensable for the AI's learning and knowledge retrieval capabilities, while Redis enhances overall system performance through efficient caching.

### 2.4 APIs and Integrations

RMV will rely on a comprehensive set of APIs and integrations to connect its internal components and interact with external legal technology ecosystems:

*   **Internal APIs**: RESTful APIs, developed using FastAPI, will facilitate secure and efficient communication between the frontend, backend services, and the various AI agents. This modular approach allows for independent development and scaling of different system components.
*   **External Integrations**:
    *   **Google Drive API**: Essential for seamless document upload, secure storage, and efficient retrieval of case files.
    *   **E-immigration API/Webhooks**: For integration with the specialized E-immigration case management system. Direct API integration is preferred; however, if an official API is unavailable, secure web scraping with explicit user consent and robust error handling will be considered.
    *   **Legal Research APIs**: Integration with leading legal research platforms such as **Westlaw API** and **LexisNexis API** (or similar services) is crucial for implementing the "closed-loop research" feature, ensuring citation verification and preventing AI hallucinations.
    *   **LLM Providers**: APIs from leading Large Language Model providers, such as **OpenAI API (GPT-4o)** or **Anthropic API (Claude 3.5 Sonnet)**, will power the core AI capabilities for reasoning, natural language understanding, and generation.
    *   **Calendar APIs (Google Calendar, Outlook Calendar)**: For advanced scheduling and availability management.
    *   **Email Service Providers (SendGrid, Postmark)**: For automated outreach and transparent communication logging.
    *   **Retell AI / Zapier**: For the AI Receptionist and lead intake automation.

**Rationale**: A well-defined API strategy ensures system modularity and interoperability. External integrations are vital for RMV to function within the existing legal tech landscape, leveraging specialized services and data sources while maintaining security and reliability.

### 2.5 Additional Third-Party Services

To ensure a robust, scalable, and manageable SaaS platform, several third-party services will be integrated:

*   **Cloud Provider**: A major cloud provider such as **Google Cloud Platform (GCP)** or **Amazon Web Services (AWS)** will host the infrastructure. These platforms offer managed database services, serverless functions, and container orchestration, significantly reducing operational overhead.
*   **Containerization**: **Docker** will be used for packaging applications, ensuring consistent environments across development, testing, and production. **Kubernetes** (or managed services like Google Kubernetes Engine/AWS EKS) will provide robust container orchestration for deployment, scaling, and management of containerized applications.
*   **Monitoring & Logging**: **Prometheus** and **Grafana** (for self-hosted solutions) or cloud-native alternatives (e.g., Google Cloud Monitoring, AWS CloudWatch) will be implemented for comprehensive system health monitoring, performance tracking, and centralized logging.
*   **CI/CD**: **GitHub Actions** or **GitLab CI/CD** will automate the Continuous Integration and Continuous Deployment pipeline, ensuring efficient and reliable code delivery from development to production.
*   **Email Service**: A reliable email service provider like **SendGrid** or **Postmark** will handle transactional emails, including user notifications, password resets, and system alerts.
*   **Payment Gateway**: **Stripe** will be integrated for secure subscription management, billing, and payment processing, essential for the multi-tenant SaaS business model.

**Rationale**: Leveraging managed cloud services and specialized third-party tools streamlines infrastructure management, enhances scalability, and ensures the operational stability and security required for a production-grade SaaS platform. Automation through CI/CD and robust monitoring are critical for maintaining high availability and rapid iteration.

## 3. Multi-Tenancy Strategy

Implementing multi-tenancy requires careful architectural decisions to guarantee data isolation, security, and consistent performance for each tenant (e.g., individual law firms or non-profit organizations).

### 3.1 Data Isolation

Several approaches exist for data isolation in a multi-tenant environment. For RMV, the following options were considered:

*   **Shared Database, Shared Schema with Tenant ID**: In this approach, all tenants share the same database and tables, with each table including a `tenant_id` column. All application queries must filter by `tenant_id` to ensure data isolation. While cost-effective, it requires strict application-level enforcement and carries a higher risk of data leakage if not meticulously implemented.
*   **Schema-per-Tenant**: Each tenant is assigned its own dedicated schema within a shared PostgreSQL database. This provides stronger logical isolation compared to a shared schema with `tenant_id`, as data separation is enforced at the database level. Queries are often simpler as `tenant_id` filtering can be handled implicitly by the database context.
*   **Database-per-Tenant**: Each tenant operates on its own dedicated database instance. This offers the highest level of data isolation and can be beneficial for very large tenants or those with stringent compliance requirements. However, it is the most expensive and complex approach to manage due to the overhead of maintaining numerous database instances.

**Recommendation**: For RMV, a **Schema-per-Tenant** approach within PostgreSQL is recommended. This strategy strikes an optimal balance between strong data isolation and manageable operational overhead. It provides a clear separation of tenant data at the database level, significantly reducing the risk of cross-tenant data access and simplifying backup/restore operations per tenant. For the vector database, a similar logical separation (e.g., separate namespaces or indexes per tenant) would be implemented to maintain consistency in data isolation.

### 3.2 Tenant Provisioning and Management

Efficient tenant lifecycle management is crucial for a scalable SaaS platform:

*   **Automated Provisioning**: A dedicated provisioning service will automate the creation of new tenant schemas, user accounts, and initial configurations upon a new subscription. This ensures a streamlined onboarding process.
*   **Tenant Context**: The backend API will be designed to identify the current tenant from every incoming request (e.g., via JWT claims or a custom HTTP header). All subsequent database and service operations will be automatically scoped to that specific tenant, preventing accidental cross-tenant data access.
*   **Resource Allocation**: Mechanisms will be implemented to monitor and, if necessary, limit resource usage per tenant. This prevents "noisy neighbor" issues, where one tenant's heavy usage negatively impacts the performance experienced by other tenants.

### 3.3 Security Considerations for Multi-Tenancy

Security is paramount in a multi-tenant legal application:

*   **Strict Access Control**: Role-Based Access Control (RBAC) will be rigorously enforced at the application level, ensuring that users can only access data and functionalities within their assigned tenant context.
*   **Data Encryption**: All sensitive data will be encrypted at rest (database, file storage) and in transit (TLS/SSL for all communications).
*   **Regular Security Audits**: Periodic security audits, penetration testing, and vulnerability assessments will be conducted to identify and mitigate potential risks.
*   **Compliance**: Adherence to relevant legal and data privacy regulations (e.g., ABA data security standards, GDPR, CCPA) will be a core design principle.

## 4. Data Feed to Cursor (Development Workflow)

To facilitate rapid and AI-assisted development with Cursor, all architectural documents, design specifications, and code snippets will be maintained in a structured format (primarily Markdown and code files). Cursor will be provided with a comprehensive context of the entire RMV system, enabling it to generate, refactor, and debug code effectively. This includes:

*   **PRD, SRD, Architecture Documents**: For high-level understanding and requirements.
*   **UI/UX Design Specifications**: For frontend implementation details.
*   **Agent Team Manifest & Backend Architecture**: For AI agent logic and backend services.
*   **Database Schemas & API Specifications**: For data modeling and integration.

## 5. High-Level Data Flow (Multi-Tenant)

```mermaid
graph TD
    A[Client (Web/Mobile)] --> B[Frontend (Next.js/Expo)]
    B --> C[RMV Backend API (FastAPI)]
    C --> D[Authentication Service]
    C --> E[RMV Core Services (FastAPI Microservices)]
    E --> F[PostgreSQL (Schema-per-Tenant)]
    E --> G[Vector Database (Tenant-Isolated)]
    E --> H[Redis (Cache/Broker)]
    E --> I[AI Agent Orchestration]
    I --> J[External LLM Providers]
    I --> K[Legal Research APIs]
    I --> L[Google Drive API]
    I --> M[E-immigration API/Webhooks]
    C --> N[External Integrations (Calendar, Email, Retell AI)]
    N --> O[Google Calendar API]
    N --> P[Outlook Calendar API]
    N --> Q[SendGrid/Postmark (Email)]
    N --> R[Retell AI / Zapier]

    style A fill:#bbf,stroke:#333,stroke-width:2px
    style B fill:#eee,stroke:#333,stroke-width:2px
    style C fill:#f9f,stroke:#333,stroke-width:2px
    style D fill:#ccf,stroke:#333,stroke-width:2px
    style E fill:#f9f,stroke:#333,stroke-width:2px
    style F fill:#ffc,stroke:#333,stroke-width:2px
    style G fill:#ffc,stroke:#333,stroke-width:2px
    style H fill:#ffc,stroke:#333,stroke-width:2px
    style I fill:#f9f,stroke:#333,stroke-width:2px
    style J fill:#ccf,stroke:#333,stroke-width:2px
    style K fill:#ccf,stroke:#333,stroke-width:2px
    style L fill:#ccf,stroke:#333,stroke-width:2px
    style M fill:#ccf,stroke:#333,stroke-width:2px
    style N fill:#f9f,stroke:#333,stroke-width:2px
    style O fill:#ccf,stroke:#333,stroke-width:2px
    style P fill:#ccf,stroke:#333,stroke-width:2px
    style Q fill:#ccf,stroke:#333,stroke-width:2px
    style R fill:#ccf,stroke:#333,stroke-width:2px
```

## 6. Cursor-Optimized Development Guide

### 6.1. Introduction to Cursor-Driven Development

Cursor will be the primary IDE for developing RMV. Its AI-native capabilities will be leveraged for code generation, refactoring, debugging, and understanding complex architectural patterns. The goal is to maximize developer velocity and maintain code quality through continuous AI assistance.

### 6.2. Setting Up Your Cursor Environment

*   **Project Context**: Ensure Cursor has access to all RMV documentation (PRD, SRD, Architecture, UI/UX Reports, Agent Manifests, Design Documents) by placing them in the project root or a designated `docs` folder.
*   **Tooling Integration**: Configure Cursor to integrate with Docker, Kubernetes, and Git for seamless development and deployment workflows.
*   **Language Servers**: Ensure Python (FastAPI) and JavaScript/TypeScript (Next.js/React/Expo) language servers are correctly configured for optimal code intelligence.

### 6.3. Leveraging AI Agent Teams with Cursor

Cursor will be instrumental in developing and interacting with the RMV AI Agent teams. Prompts will be structured to guide Cursor in:

*   **Agent Service Generation**: Creating FastAPI microservices for each agent (Manager, Intake, Fact Extraction, etc.) based on their defined roles and responsibilities.
*   **Orchestration Logic**: Implementing the communication protocols and workflow orchestration within the `AI Agent Orchestration` service.
*   **Testing & Debugging**: Assisting in writing unit and integration tests for agent interactions and debugging complex AI logic.

### 6.4. Multi-Tenancy Development Considerations

Cursor will be prompted to adhere to multi-tenancy best practices, including:

*   **Tenant Context Propagation**: Ensuring `tenant_id` is correctly passed and utilized across all layers (frontend, backend, database queries).
*   **Schema-per-Tenant Management**: Assisting in generating database migrations and schema management scripts for tenant provisioning.
*   **Security Best Practices**: Guiding secure coding practices for data isolation and access control.

### 6.5. Best Practices for Cursor-Assisted Development

*   **Clear, Concise Prompts**: Provide Cursor with explicit instructions, referencing specific sections of the RMV documentation.
*   **Iterative Development**: Break down complex tasks into smaller, manageable steps for Cursor.
*   **Code Review**: Always review and validate AI-generated code for correctness, efficiency, and security.
*   **Context Feeding**: Continuously update Cursor's context with new design documents, code changes, and test results.

## 7. Website Rebuild & SEO Integration

### 7.1. Platform Decision: Custom Next.js/FastAPI

**Recommendation**: The RMV public-facing website will be rebuilt using the custom Next.js/FastAPI stack. This decision is driven by the need for deep integration with RMV's AI agents, advanced customization, multi-tenancy support, and granular SEO control, which are not feasible with a platform like Squarespace.

### 7.2. Dual-Pathway Client Intake Integration

The new website will feature a prominent dual-pathway client intake system for Personal Injury and Immigration. This involves:

*   **Dedicated Landing Pages**: Optimized landing pages for each practice area, serving as clear entry points.
*   **AI-Driven Qualification**: Integration with the RMV AI Receptionist to guide users through initial qualification questions tailored to their chosen pathway.
*   **Dynamic Intake Forms**: Custom, dynamic forms that adapt based on user input, collecting specific information required for PI or Immigration cases.
*   **Seamless Scheduling**: Direct integration with the Advanced Intake & Scheduling Module to book consultations with the appropriate legal professional.

### 7.3. SEO Optimization Strategy

The rebuilt website will implement a comprehensive SEO strategy to maximize organic visibility for both Personal Injury and Immigration keywords:

*   **Targeted Keyword Strategy**: Extensive keyword research for both practice areas, including long-tail keywords and local SEO terms.
*   **Optimized Content Structure**: Creation of dedicated service pages, blog posts, FAQs, and case studies for each practice area, with clear internal linking.
*   **Technical SEO**: Implementation of schema markup (LocalBusiness, Attorney, LegalService), optimized page speed (Core Web Vitals), mobile-first design, and clean URL structures.
*   **Content Marketing**: A continuous content creation plan to establish authority and attract organic traffic.
*   **Backlink Building**: Strategic outreach to acquire high-quality backlinks from authoritative legal and local sources.

## 8. References

*   [RMV Product Requirements Document (PRD) v2](/home/ubuntu/RMV_PRD_Final_v2.md)
*   [RMV Systems Requirements Document (SRD) v2](/home/ubuntu/RMV_SRD_Final_v2.md)
*   [RMV UI/UX Alignment & Optimization Report v2](/home/ubuntu/RMV_UI_UX_Alignment_Report_v2.md)
*   [RMV Agent Team Manifest](/home/ubuntu/RMV_Agent_Team_Manifest.md)
*   [RMV Backend Functional Architecture](/home/ubuntu/RMV_Backend_Architecture.md)
*   [RMV AI Receptionist Design](/home/ubuntu/RMV_AI_Receptionist_Design.md)
*   [RMV Obsidian Legal Brain Design](/home/ubuntu/RMV_Obsidian_Legal_Brain_Design.md)
*   [RMV Mass Case Auditor Design](/home/ubuntu/RMV_Mass_Case_Auditor_Design.md)
*   [RMV Unified Database & Backend Integration](/home/ubuntu/RMV_Unified_Database_Backend_Integration.md)
*   [RMV Advanced Intake & Scheduling Design](/home/ubuntu/RMV_Advanced_Intake_Scheduling_Design.md)
*   [RMV Automated Outreach Design](/home/ubuntu/RMV_Automated_Outreach_Design.md)
*   [RMV SEO Audit & Site Analysis](/home/ubuntu/RMV_SEO_Site_Analysis.md)
*   [RMV Dual-Pathway Client Intake Design](/home/ubuntu/RMV_Dual_Pathway_Intake_Design.md)
*   [RMV Content Strategy for Dual-Pathway Intake](/home/ubuntu/RMV_Content_Strategy.md)
