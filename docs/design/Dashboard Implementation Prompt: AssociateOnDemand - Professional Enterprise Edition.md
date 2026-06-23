## Dashboard Implementation Prompt: AssociateOnDemand - Professional Enterprise Edition

**Objective:** Build a high-fidelity, professional legal dashboard using Next.js, Tailwind CSS, Lucide icons, and TanStack Table. This dashboard must replicate the core functional layout of E-immigration/Clio while adhering to the **AssociateOnDemand Professional Enterprise Aesthetic**.

**Instructions for Cursor:**

### 1. Core Layout & Navigation
*   **App Shell:** Implement a responsive sidebar navigation (using Lucide icons) and a clean top bar with a search field, firm branding, and user profile.
*   **Quick Links:** Add a "Quick Actions" widget on the home screen for one-click access to: `New Case`, `New Contact`, `Open Mailbox`, `Send Questionnaire`.
*   **Analytics Widgets:** Create a dashboard grid with:
    *   **Case Reminders Chart:** A bar chart showing upcoming deadlines (Deadlines per Month).
    *   **New Matters Metric:** A line graph for "New Cases per Month."
    *   **Activity Feeds:** Two scrollable lists for "Recently Updated Cases" and "Recently Updated Clients."

### 2. Case & Matter Management (The "Cases" Page)
*   **TanStack Table Implementation:** Build a robust, sortable, and filterable data table for `Matters`.
    *   **Columns:** `Matter ID`, `Client Name`, `Case Type`, `Status` (using pro-pills), `Next Deadline`, `Last Updated`.
    *   **Filters:** Implement a global search bar and dropdown filters for `Status` and `Attorney`.
*   **Case Detail View (E-immigration Style):**
    *   Implement a horizontal tab strip: `Case Information`, `General Info (Profile)`, `Legal Elements (Mapping)`, `Process Steps (Workflow)`, `Documents`, `Billing`.
    *   **General Info Tab:** Create a comprehensive form with sections for demographics, contact info, and identifiers (SSN, A-Number).
    *   **Process Steps Tab:** Build an interactive checklist. Each item should have a checkbox, a "Send Auto-Email" button, and a status indicator. Include a "Overall Progress" progress bar at the top.

### 3. Functional Components
*   **Date Picker:** Use a modern date picker (e.g., from shadcn/ui) for all deadline and incident date fields.
*   **Form Auto-Population Logic:** Create a mock function `populateForm(clientId, formId)` that demonstrates how data from the "General Info" tab would map to a legal form.
*   **Document Management:** Build a "Documents" tab with a file upload area and a list of "Required Documents" for the specific case type.

### 4. Styling & Aesthetic
*   **Professional Theme:** Strictly use the `pro-*` design tokens from `RMV_UI_Cloning_Code_Professional_Theme.md`.
*   **Visual Cues:** Use subtle borders, white/light-gray backgrounds, and primary blue accents. Use `zinc` for secondary text and borders.

**Implementation Strategy:**
1.  Initialize the Next.js project structure with Tailwind.
2.  Build the `AppShell` and `Sidebar`.
3.  Implement the `Dashboard` home page with charts and metric cards.
4.  Build the `Cases` list page with the `TanStack Table`.
5.  Create the `CaseDetail` page with the tabbed interface and the `Process Steps` workflow checklist.

**Final Goal:** Deliver a usable, clickable dashboard prototype that demonstrates the full "In-take to Case Management" lifecycle for AssociateOnDemand.
