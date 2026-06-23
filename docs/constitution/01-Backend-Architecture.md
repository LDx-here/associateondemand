**MEMORANDUM**

TO:          La'Dajia Ferguson, Esq.

FROM:     Litigation Associate

DATE:      April 27, 2026

RE:          Backend Architecture and Build Path

**I.  PURPOSE**

This memorandum was prepared to define the backend architecture for the RMV litigation associate system. The scope includes: the data model, the case management features described (notes, tasks, reminders, alerts, completion tracking, dashboard), the technology options for building it, and the prioritized build sequence. This is the technical companion to the Master Blueprint.

**II.  SUMMARY AND NEXT STEPS**

In short, the backend is a database connected to a web interface. The database stores matters, documents, notes, tasks, and events. The web interface is the dashboard where you see each client's status, pending tasks, and case timeline. The AI associate connects to this backend through an API, reading case data and writing notes and task completions back.

**Next Steps:**

1\.  Choose the technology stack (recommendation below).

2\.  Build the data model (schema provided below).

3\.  Build the minimum viable dashboard: matter list, matter detail, notes, tasks.

4\.  Connect Google Calendar for deadline sync.

5\.  Connect Claude Code to read/write through the API.

**Awaiting directive on:**

a.  Whether to build with Cursor/Manus (recommended) or hire a developer.

b.  Whether to start with a hosted solution (Vercel/Railway) or local only.

c.  Priority between the dashboard and the knowledge map visual.

**III.  WHAT THE BACKEND DOES**

The backend is five connected functions:

**1\.  Matter Management**

Each client matter has a record: matter ID, case type, country, procedural posture, assigned attorney, status, key dates. This is the master record that everything else connects to.

**2\.  Case Notes**

Notes are logged against a matter. Each note has a timestamp, author, and content. When a note contains a task (recognized by keywords like "follow up," "file by," "need to," "schedule"), the system creates a task automatically. When a task is toggled complete, a note is auto-generated: "\[Task\] completed by \[person\] on \[date\]. Documents: \[list\]."

**3\.  Task Management**

Tasks are created from notes or manually. Each task has: description, due date, assigned person, status (open/in progress/complete), priority, and linked matter. Open tasks appear on the dashboard. Overdue tasks trigger alerts.

**4\.  Reminders and Alerts**

Tasks with due dates sync to Google Calendar. Approaching deadlines (configurable: 7 days, 3 days, 1 day) trigger email alerts through Gmail or dashboard notifications. Filing deadlines (statutory, non-negotiable) are flagged differently from internal deadlines.

**5\.  Dashboard**

The dashboard shows: (a) all active matters with status, (b) pending tasks sorted by urgency, (c) upcoming deadlines, (d) recent activity (notes, task completions). Each matter has its own detail view showing the full timeline: notes, tasks, documents filed, hearing dates.

**IV.  DATA MODEL**

Six tables. This is the minimum schema that supports everything described above.

**Table 1: Matters**

| Field | Type | Description |
| :---- | :---- | :---- |
| id | string | Matter ID (IMM-2026-001) |
| case\_type | string | Asylum, Cancellation, Adjustment, Employment, etc. |
| country | string | Country of origin |
| posture | string | Removal defense, affirmative, appeal, petition for review |
| status | string | Active, pending, closed, on hold |
| assigned\_to | string | Attorney or caseworker responsible |
| opened\_date | date | When the matter was opened |
| next\_hearing | date | Next hearing or deadline (nullable) |
| court | string | Immigration court, BIA, Sixth Circuit, USCIS office |
| judge | string | Assigned IJ (if known) |
| summary | text | Brief case summary (no PII in production; PII only in encrypted local DB) |

**Table 2: Notes**

| Field | Type | Description |
| :---- | :---- | :---- |
| id | string | Unique note ID |
| matter\_id | string | Links to Matters table |
| author | string | Who wrote the note (attorney, associate, system) |
| content | text | Note content |
| created\_at | datetime | Timestamp |
| type | string | Manual, system-generated (task completion), AI-generated |

**Table 3: Tasks**

| Field | Type | Description |
| :---- | :---- | :---- |
| id | string | Unique task ID |
| matter\_id | string | Links to Matters table |
| description | text | What needs to be done |
| due\_date | date | When it is due (nullable for non-deadline tasks) |
| assigned\_to | string | Who is responsible |
| status | string | Open, in progress, complete |
| priority | string | High, medium, low |
| is\_filing\_deadline | boolean | True if this is a statutory/court deadline (not movable) |
| created\_from\_note | string | ID of the note that created this task (nullable) |
| completed\_at | datetime | When toggled complete (nullable) |
| completed\_by | string | Who completed it (nullable) |
| completion\_docs | text | Documents associated with completion (nullable) |

**Table 4: Documents**

| Field | Type | Description |
| :---- | :---- | :---- |
| id | string | Unique document ID |
| matter\_id | string | Links to Matters (nullable for firm-wide docs) |
| title | string | Document name |
| category | string | From taxonomy: Case File, Legal Research, Template, etc. |
| practice\_area | string | Asylum, Cancellation, Adjustment, etc. |
| file\_path | string | Google Drive path |
| tags | string\[\] | Keyword tags for search |
| uploaded\_at | datetime | When added to system |
| uploaded\_by | string | Who added it |

**Table 5: Events (Calendar)**

| Field | Type | Description |
| :---- | :---- | :---- |
| id | string | Unique event ID |
| matter\_id | string | Links to Matters |
| type | string | Hearing, filing deadline, internal deadline, reminder |
| date | datetime | When |
| description | text | What |
| calendar\_id | string | Google Calendar event ID for sync |

**Table 6: People**

| Field | Type | Description |
| :---- | :---- | :---- |
| id | string | Unique person ID |
| name | string | Display name |
| role | string | Attorney, caseworker, paralegal, associate (AI) |
| email | string | For notifications and calendar sync |

**V.  TECHNOLOGY RECOMMENDATION**

Given that you are using Cursor and Manus to prototype, the recommended stack is:

**Option A: Lightweight (Recommended for Prototype)**

Frontend: Next.js (React) with Tailwind CSS. This is what Cursor works best with.

Database: Supabase (hosted PostgreSQL with built-in auth, API, and real-time features). Free tier is sufficient for prototype. No server to manage.

Hosting: Vercel (free tier). Deploys directly from Cursor.

Calendar sync: Google Calendar API (you already have this MCP connected).

Email alerts: Gmail API or Resend (simple email service).

AI connection: Claude Code reads/writes through Supabase API.

**Why this stack:**

a.  Cursor generates Next.js and Tailwind fluently. You will get a working prototype faster.

b.  Supabase gives you a database, authentication, and an auto-generated API with zero backend code. You define the tables, Supabase creates the REST endpoints.

c.  Vercel deploys Next.js apps with one command. You push code, it is live.

d.  This stack scales. If the firm grows, Supabase and Vercel handle it without re-architecting.

**Option B: Local Only (if you want nothing in the cloud)**

Frontend: Same Next.js/React.

Database: SQLite (single file, runs locally, no server).

Hosting: localhost only. Runs on your machine.

Tradeoff: simpler to set up, but not accessible from other devices or team members.

**VI.  BUILD SEQUENCE (BACKEND ONLY)**

This is the contained build path. Each step produces something usable.

**Step 1: Set up Supabase project and create the six tables.**

Time: 1-2 hours with Cursor. Define the schema from Section IV. Supabase auto-generates the API.

**Step 2: Build the matter list page.**

A table showing all active matters: ID, case type, country, posture, status, next deadline. Clickable rows open the matter detail.

**Step 3: Build the matter detail page.**

Shows: case summary, case assessment table, notes timeline, open tasks, upcoming events, linked documents. This is the per-client dashboard.

**Step 4: Build the notes input with task detection.**

A text field where you type a note. If the note contains task-like language, the system suggests creating a task with a due date. You confirm or dismiss.

**Step 5: Build the task list with toggle completion.**

Open tasks sorted by due date. Toggle to complete. On completion: prompt for completion documents, auto-generate a case note recording what was done, by whom, and when.

**Step 6: Connect Google Calendar for deadlines.**

Tasks with due dates sync to Google Calendar. Calendar events with matter IDs appear on the matter detail page.

**Step 7: Build the global dashboard.**

Shows: all matters (filterable), all overdue tasks, upcoming deadlines (next 7/14/30 days), recent activity across all matters.

**Step 8: Connect Claude Code.**

The AI associate reads matter data from Supabase through the API. When it produces a research memo, it writes a note to the matter record. When it identifies a task, it creates one. This closes the loop between the AI layer and the case management layer.

**VII.  WHAT TO TELL CURSOR**

When you open Cursor to start building, give it this prompt:

"I am building a case management dashboard for an immigration law firm. The stack is Next.js, Tailwind CSS, and Supabase. I need the following pages: (1) a matter list page showing all active matters in a table with columns for Matter ID, Case Type, Country, Status, and Next Deadline, with each row clickable to a detail page; (2) a matter detail page showing case summary, a notes timeline, open tasks, and upcoming events; (3) a notes input that detects task-like language and suggests creating a task; (4) a task list with toggle completion that auto-generates a case note on completion. Start with the Supabase schema using these six tables: matters, notes, tasks, documents, events, people. Here are the field definitions: \[paste the schemas from Section IV\]."

That prompt, combined with the schema in this document, gives Cursor enough to build the first working version.

**VIII.  HOW THIS CONNECTS TO THE MASTER BLUEPRINT**

| Blueprint Layer | Backend Component | Connection |
| :---- | :---- | :---- |
| Layer 1: Shared Drive | Documents table \+ Google Drive paths | Documents table indexes what is in Drive. File paths link to the actual files. |
| Layer 2: Table of Contents | Knowledge graph (future) \+ matter structure | The matter detail page is the beginning of the per-case table of contents. The knowledge map visual connects later. |
| Layer 3: AI Associate | API read/write to Supabase | Claude Code reads case data, writes notes and tasks. The associate becomes a user of the system, not separate from it. |
| Trust Infrastructure | Authentication \+ role-based access | Supabase auth controls who sees what. The AI associate gets its own role with defined permissions. |
| Five Anchors | Document Intake skill writes to Notes \+ Tasks | When the associate extracts anchors from a dump, it writes findings as notes and gaps as tasks. |
| Training Loop | Notes timeline tracks corrections | Attorney corrections are logged as notes. Over time, the notes timeline shows the associate's learning curve. |

**END OF DOCUMENT**