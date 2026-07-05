> **SUPERSEDED (July 2026):** Duplicate export archived. Canonical copy: [`docs/strategy/AssociateOnDemand_B2B_Service_Analysis.md`](../../strategy/AssociateOnDemand_B2B_Service_Analysis.md).

# AssociateOnDemand: B2B Legal Overflow Service Analysis

**Author:** Manus AI
**Date:** July 5, 2026
**Project:** AssociateOnDemand powered by RMV

## 1. Introduction

This document analyzes the proposed business model for AssociateOnDemand as a B2B legal overflow service, targeting solo attorneys and small law firms. It maps the platform's existing and planned capabilities to the outlined service offerings, focusing on how AssociateOnDemand can facilitate legal drafting and overflow support, initially for immigration briefs.

## 2. The B2B Legal Overflow Service Model

The core of this model is to provide specialized legal work product to attorneys, positioning AssociateOnDemand as a legal services brand under an existing law firm (e.g., Recover My Value, LLC d/b/a Associate on Demand). This approach addresses regulatory concerns regarding the unauthorized practice of law and fee-sharing with non-lawyers [1, 2]. The immediate goal is to generate revenue through attorney overflow work, with a focus on specific, high-value tasks.

**Key Service Offerings & Pricing:**

*   **Motion / Short Filing:** $250–$450
*   **Research Memo:** $500–$900
*   **Immigration Brief / Discretionary Memo:** $750–$1,500
*   **Hearing Packet / Exhibit Organization:** $500–$1,250
*   **Rush Fee:** +30–50%
*   **Sample/Template Discount:** 15–25% reduction if a usable sample is provided.

This pricing strategy aims to offer relief to solo attorneys by providing cost-effective, high-quality legal support, emphasizing that AssociateOnDemand delivers 
lawyer-reviewed work product that attorneys can actually use, rather than just AI drafts [3].

## 3. AssociateOnDemand Platform Capabilities Mapping

The AssociateOnDemand platform, with its Airtable-backed architecture and AI-driven features, is well-suited to support this B2B service model. The core components will facilitate efficient intake, processing, and delivery of legal work product.

### 3.1. Onboarding Workflow and Platform Integration

The proposed onboarding process for attorneys is designed to be "painfully simple" and will be directly supported by the AssociateOnDemand platform:

1.  **Attorney Completes Intake Form:**
    *   **Platform Role:** The "Harvey-style" chat-centric UI will serve as the primary intake mechanism. Attorneys will interact with an AI agent to provide case details, select service types (e.g., Immigration Brief Support), and answer structured questions. This data will be directly captured and stored in the Airtable "Matters" and "Contacts" tables.
    *   **UI/UX Enhancement:** The chat interface will guide the attorney through the intake process, making it intuitive and efficient. Form fields will include autosave features and lead capture to ensure no data is lost [4].

2.  **Upload Sample/Template (if available):**
    *   **Platform Role:** The UI will provide a secure document upload feature. These documents (e.g., previous briefs, templates) will be ingested by the "Strong Reader" (OCR) module. The extracted text and data will be stored in the "Facts" table in Airtable, linked to the specific matter.
    *   **Value Proposition:** Providing a sample allows for a 15-25% discount, incentivizing attorneys to provide valuable context that streamlines the drafting process.

3.  **Conflict Check:**
    *   **Platform Role:** While the platform cannot perform legal conflict checks autonomously, it can facilitate the process. The "Contacts" table in Airtable will store client and opposing party information. An internal process (manual or semi-automated with AI flagging potential matches) will use this data to identify conflicts.
    *   **Future Enhancement:** Integration with external legal databases for automated conflict checking could be a future feature.

4.  **Send Limited-Scope Engagement:**
    *   **Platform Role:** The platform can generate a templated limited-scope engagement agreement based on the intake information. This document can be automatically populated with matter details from Airtable and presented to the attorney for review and e-signature.
    *   **Automation:** Zapier/Make can automate the generation and delivery of these agreements.

5.  **Pay Flat Fee or Deposit:**
    *   **Platform Role:** Integration with a secure payment gateway will allow attorneys to pay the flat fee or deposit directly through the platform. Payment status will be recorded in Airtable.
    *   **Monetization:** This step is crucial for revenue generation and will require robust e-commerce integration.

6.  **Drafting Process:**
    *   **Platform Role:** This is where the AI agents, powered by the "Strong Reader" and "Fact-to-Legal Mapping" logic, will perform the core work. The AI agent will analyze the extracted facts and legal elements from Airtable, along with any provided samples, to generate a draft legal document (e.g., an immigration brief).
    *   **Knowledge Management:** Integration with Obsidian for a "Legal Brain" will provide the AI agents with access to verified legal authorities and local practice nuances, enhancing the quality of the drafts.
    *   **Quality Control:** The platform will facilitate human review by the supervising attorney, ensuring attorney judgment, citation verification, and local practice sense are applied [3].

7.  **Deliver in Word + Short Cover Note:**
    *   **Platform Role:** The platform will generate the final work product in a client-ready Word document format. A short cover note, summarizing the work and key considerations, can also be automatically generated.
    *   **Delivery Mechanism:** Secure delivery through the attorney portal or via encrypted email, with delivery confirmation recorded in Airtable.

8.  **One Revision Round Included:**
    *   **Platform Role:** The platform will manage the revision process, allowing attorneys to submit feedback. The AI agent can then incorporate these revisions, followed by another round of human review.
    *   **Airtable Tracking:** Revision requests and completion will be tracked within the "Tasks" table in Airtable.

### 3.2. Standing Out from Generic AI (e.g., Claude)

AssociateOnDemand differentiates itself from generic AI drafting tools by providing a comprehensive, lawyer-centric service. The platform enables the delivery of:

*   **Attorney Judgment:** Human oversight and legal expertise integrated into the workflow.
*   **Citation Verification:** Automated and human-verified legal citations.
*   **Formatting & Local Practice Sense:** Work product tailored to specific court rules and local legal practices.
*   **Client-Ready Work Product:** Documents that are immediately usable by the attorney.
*   **Privilege-Aware Workflow:** Designed with legal ethics and privilege in mind.
*   **Quality Control:** Multi-stage review process ensuring high standards.
*   **"Usable by Tomorrow" Relief:** Delivering timely and reliable support to busy solo practitioners.

This positioning emphasizes that "AI can draft. We deliver lawyer-reviewed work product attorneys can actually use" [3].

## 4. Initial Product Focus: Immigration Brief Support

Starting with a narrow product, such as **Immigration Brief Support for Solo Attorneys**, allows for focused development and market validation. The platform will support this by:

*   **Specialized Intake:** Tailoring the chat-centric intake to gather specific facts relevant to immigration briefs.
*   **Targeted AI Agents:** Training AI agents with immigration law knowledge and relevant precedents.
*   **Obsidian Integration:** Leveraging Obsidian for immigration-specific legal research and knowledge base.

This initial offering is a strategic bridge to generate revenue, gain experience, build attorney relationships, and refine reusable systems before expanding to other practice areas.

## References

[1] MN Revisor's Office. (n.d.). *Minnesota Rules of Professional Conduct, Rule 5.4*. Retrieved from [https://www.revisor.mn.gov/court_rules/pr/subtype/cond/id/5.4/](https://www.revisor.mn.gov/court_rules/pr/subtype/cond/id/5.4/)
[2] Ohio Laws. (n.d.). *Ohio Revised Code, Section 4705.07*. Retrieved from [https://codes.ohio.gov/ohio-revised-code/section-4705.07](https://codes.ohio.gov/ohio-revised-code/section-4705.07)
[3] User Provided Content. (n.d.). *pasted_content_3.txt*. Retrieved from `/home/ubuntu/upload/pasted_content_3.txt`
