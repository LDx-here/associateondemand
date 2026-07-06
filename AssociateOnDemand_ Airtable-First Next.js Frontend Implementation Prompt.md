# AssociateOnDemand: Airtable-First Next.js Frontend Implementation Prompt

**Objective:** Build the Next.js frontend for AssociateOnDemand, connecting directly to Airtable for all data operations, and applying the professional enterprise aesthetic (Legora/Clio/E-immigration style) as defined in `RMV_UI_Cloning_Code_Professional_Theme.md`.

**Instructions for Cursor:**

1.  **Context Ingestion**: Thoroughly read and internalize the following documents to understand the new architecture and design:
    *   `AssociateOnDemand_Airtable_Schema_Design.md` (Crucial for understanding data structure)
    *   `RMV_UI_Cloning_Code_Professional_Theme.md` (For aesthetic guidelines)
    *   `eimmigration_video_analysis.md` (For UI patterns and workflows)
    *   `AssociateOnDemand_Dashboard_Implementation_Prompt.md` (For specific dashboard component requirements)

2.  **Project Setup**: Initialize a new Next.js project (if not already done) within the `web/aod-next` directory. Configure Tailwind CSS, Lucide icons, and ensure the project is ready for Airtable API integration.

3.  **Airtable API Integration**: Implement the necessary API client code to connect to Airtable. Use environment variables for `AIRTABLE_API_KEY` and `AIRTABLE_BASE_ID`. All data fetching and mutations should interact directly with the Airtable API, adhering to the schema defined in `AssociateOnDemand_Airtable_Schema_Design.md`.

4.  **Implement Professional UI**: Apply the styling specifications detailed in `RMV_UI_Cloning_Code_Professional_Theme.md` to the entire frontend. Ensure `tailwind.config.js` is updated and all UI components adhere to the professional enterprise aesthetic.

5.  **Build Core Dashboard Components**: Develop the following pages and components, ensuring they fetch and display data from Airtable:

    *   **Dashboard (`/dashboard`)**: 
        *   Display key metrics (Total Cases, In Progress, Ready for Review) by querying Airtable.
        *   Implement a responsive sidebar navigation (Legora/Clio style).
    *   **Matter List Page (`/matters`)**: 
        *   Create a sortable, filterable data table using **TanStack Table** to display matters from the Airtable `Matters` table.
        *   Columns should include: Matter ID, Client Name, Case Type, Status, Next Deadline, Fidelity Score.
        *   Matter ID should be clickable to navigate to the Matter Detail Page.
    *   **Matter Detail Page (`/matters/[id]`)**: 
        *   Implement an E-immigration-style tab strip for navigation (e.g., "Case Information," "Notes & Timeline," "Tasks & Workflows," "Legal Elements").
        *   Display case information by fetching a single matter from Airtable.
        *   **Notes & Timeline Tab**: Display notes from the Airtable `Notes & Timeline` table, associated with the current matter.
        *   **Tasks & Workflows Tab**: Display tasks from the Airtable `Tasks & Workflows` table, associated with the current matter. Tasks should have a completion toggle.
        *   **Legal Elements Tab**: Display legal elements and extracted facts from the Airtable `Legal Elements & Facts` table, associated with the current matter.
    *   **Date Picker**: Implement a date picker component for deadlines (e.g., on task creation/editing or matter updates).
    *   **Status Badges**: Use SaaS-style pills (blue/amber/green) for status indicators, dynamically determined by Airtable data.

6.  **Data Interaction**: Ensure that user actions (e.g., marking a task complete, adding a note) trigger appropriate updates to the Airtable backend via API calls.

7.  **Error Handling & Loading States**: Implement basic error handling and loading states for Airtable API calls.

8.  **Confirm Readiness**: After completing the initial build, confirm that the core frontend components are functional, display real data from Airtable, and adhere to the professional theme. Provide a summary of the implemented features and any immediate next steps for testing or further development.

**Important Note:** If any part of this build encounters an issue or requires clarification, refer to `RMV_Code_Review_Fix_Workflow.md` and use that process to communicate with me for debugging and refinement. Your goal is to build a fully integrated and functional AssociateOnDemand frontend based on these specifications.
