# BUILD_SPEC Part 2: Screen Specifications, Agent Contracts, Phase Execution

# This is a continuation of BUILD_SPEC.md. Read Part 1 first.

---

## 7. SCREEN SPECIFICATIONS (what each page does, exactly)

### 7.1 Global Dashboard (page.tsx at app root)

Layout: Full-width content area. No tabs.

Sections (top to bottom):

1. Greeting bar: "Good morning, La'Dajia" with today's date
2. KPI row (4 cards side by side):
  - Active Matters (count from Matters where status = Active)
  - Overdue Tasks (count from Tasks where due_date < today AND status != Complete)
  - Upcoming Deadlines (count from Tasks where is_filing_deadline = true AND due_date within 14 days)
  - PM Inbox Unread (count from PM Inbox where status = Unread)
3. Upcoming Deadlines table (next 30 days):
  - Columns: Matter ID, Description, Due Date, Days Until Due, Priority, Assigned To
  - Sorted by due_date ascending
  - Rows where is_filing_deadline = true are visually distinct (bold, left border)
  - Clicking a row navigates to the matter detail
4. Overdue Tasks table:
  - Same columns as deadlines table but filtered to due_date < today AND status != Complete
  - Sorted by due_date ascending (most overdue first)
5. Recent Activity feed (last 7 days):
  - Interleaves: new notes, completed tasks, new documents, agent actions, corrections
  - Each entry shows: timestamp, matter ID, author, action summary
  - Clicking any entry navigates to the relevant matter

Data source: All data from Airtable via Next.js API routes (server-side fetches).

### 7.2 Matter List (matters/page.tsx)

Layout: Full-width data table with filters above.

Filter bar:

- Status dropdown (All, Active, Pending, On Hold, Closed)
- Case Type dropdown (All, Asylum/Withholding/CAT, Cancellation, etc.)
- Country text input (free text filter)
- Search input (searches matter_id, title, summary)

Table (TanStack Table, sortable columns):

- Matter ID (clickable, navigates to detail)
- Title
- Case Type
- Country
- Posture
- Status (rendered as badge with color)
- Next Deadline (date, highlighted if within 7 days)
- Assigned To

Pagination: 25 rows per page.

"New Matter" button: top right. Opens a modal with fields for all required Matter fields. On save, creates the Airtable record and redirects to the new matter detail page.

### 7.3 Matter Detail (matters/[id]/page.tsx)

Layout: Header + tabbed content area.

Header (always visible):

- Matter ID (large, left-aligned)
- Country | Case Type | Posture | Status (inline, separated by pipes)
- Assigned To
- Next Hearing date (if set)
- Edit button (opens modal to edit header fields)

Tabs (horizontal, below header):

1. Assessment (default tab)
2. Timeline
3. Notes
4. Tasks
5. Documents
6. Legal Elements
7. Events

### 7.3.1 Assessment Tab

This is the FIRST TAB the attorney sees when opening a matter. It shows the case assessment table.

Table structure:


| Element / Pathway | Assessment | Key Gap | Next Action |
| ----------------- | ---------- | ------- | ----------- |


Rows are populated from the Legal Elements table filtered by this matter.

Assessment column: rendered as a badge (Strong = green-tinted, Moderate = amber-tinted, Weak = red-tinted, At Risk = red bold, Unknown = gray). No emojis.

Next Action column: each action is a BUTTON. Clicking it:

1. Opens a confirmation modal: "Dispatch this action? [action text]"
2. On confirm, POSTs to /api/command with { matter_id, action_text }
3. The PM Orchestrator receives the action and dispatches to the appropriate agent
4. A note is created on the matter: "Action dispatched: [action text]"
5. The button changes to "Dispatched" (disabled) until the agent returns a result

Below the table: a text input to add a new element/pathway manually.

### 7.3.2 Timeline Tab

Unified chronological view that interleaves ALL matter activity:

- Notes (type: Manual, Agent, System, Correction)
- Tasks (created and completed, with completion details)
- Documents (uploaded, with category)
- Events (hearings, deadlines)
- Agent actions (dispatched and returned)

Each entry has:

- Timestamp (left margin)
- Icon indicating type (note icon, task icon, document icon, calendar icon, robot icon for agent)
- Author/source
- Content summary
- Expandable detail (click to see full content)

Sorted: newest at top by default. Toggle to oldest-first.

Filter: by type (show/hide notes, tasks, documents, events, agent actions).

### 7.3.3 Notes Tab

List of notes for this matter, newest first.

Each note shows: timestamp, author, type badge, content.

Correction notes are visually distinct (left border, labeled "Correction").

At bottom: NoteComposer component.

NoteComposer behavior:

1. Text input (multiline)
2. As user types, task-detection.ts scans for task-like language:
  - Keywords: "follow up", "file by", "need to", "schedule", "deadline", "prepare", "review", "send", "draft", "complete"
  - Date patterns: "by May 15", "next Friday", "within 7 days", "before the hearing"
3. If task language detected, a banner appears above the input:
  "Create a task? [detected description] Due: [detected date] [Create Task] [Dismiss]"
4. Clicking Create Task creates both the note AND a linked task
5. Clicking Dismiss saves the note only

### 7.3.4 Tasks Tab

Table of tasks for this matter.

Filters: Status (All, Open, In Progress, Complete), Priority (All, High, Medium, Low)

Table columns:

- Checkbox (toggle complete)
- Description
- Due Date (highlighted if overdue)
- Priority (badge)
- Status (badge)
- Assigned To
- Created Date

Toggling complete:

1. Opens TaskCompletionModal
2. Modal asks: "What documents were involved?" (optional text field) and "Completion note" (optional)
3. On save:
  a. Task status = Complete, completed_at = now, completed_by = current user
   b. A system note is auto-created: "Task completed: [description]. By: [user]. Date: [date]. Documents: [docs if provided]."
   c. The timeline tab updates immediately

"Add Task" button opens AddTaskForm: description, due date, priority, is_filing_deadline, assign to.

### 7.3.5 Documents Tab

Table of documents linked to this matter.

Columns: Title, Category (badge), File Type, Uploaded By, Date, PII Tier, OCR Status

Upload button: opens UploadForm (single file). File goes to Google Drive or local upload dir. Document record created in Airtable.

Batch upload button (Phase 3): opens BatchUploadForm. Drag a folder. Each file is processed through the Strong Reader pipeline.

Clicking a document title: opens the file (Google Drive link or download).

### 7.3.6 Legal Elements Tab

Table of all legal elements for this matter (same data as Assessment tab but in full detail view).

Each row expandable to show: supporting facts, supporting cases, notes, last updated by.

Editable inline: click any cell to edit. Changes save to Airtable on blur.

### 7.3.7 Events Tab

Calendar-style list of events for this matter.

Columns: Type (badge), Date, Time, Description, Location, Calendar Synced (checkbox)

"Add Event" button opens form with all event fields.

Events with is_filing_deadline on the linked task are visually distinct.

### 7.4 Global Task List (tasks/page.tsx)

All tasks across all matters.

Filters: Matter (dropdown), Status, Priority, Due Date Range, Assigned To, Filing Deadlines Only (checkbox)

Same table as matter-level tasks but with Matter ID column added.

### 7.5 PM Inbox (inbox/page.tsx)

Card-based layout. Each PM Inbox item renders as a card:

Card content:

- Agent name (who raised the item)
- Matter ID (linked)
- "What I tried" (text)
- "What I need from you" (text, prominent)
- Action buttons (rendered from the options field, e.g., "Approve", "Reject", "Modify", "Defer")
- Status badge (Unread, Read, Resolved)

Clicking an action button:

1. Opens a modal to add a resolution note
2. On save: status = Resolved, resolution = note text, resolved_at = now
3. If the action is "Approve", the PM Orchestrator proceeds with the pending job
4. If "Reject" or "Modify", a correction record may be created

Top bar shows unread count. Badge clears as items are resolved.

### 7.6 Associate Command Panel (CommandPanel.tsx)

Right-docked panel. Always visible on every page. Collapsible (toggle button).

Structure:

- Panel header: "Associate" (not "Harvey")
- Message history (scrollable)
- Text input at bottom
- Send button

Behavior:

- Phase 1-2: User types a message. It is sent to /api/command. The API route searches Airtable for relevant results and returns a text response. This is a STUB, not AI-powered yet.
- Phase 4+: The /api/command route forwards to the PM Orchestrator via FastAPI. The PM dispatches to the appropriate agent. The response streams back to the panel.

Example interactions the panel must support:

- "What's due this week?" -> queries Tasks where due_date between today and +7 days
- "Summarize matter AOD-1001" -> queries Matter detail + recent notes + legal elements
- "Draft a note on matter AOD-1001 about the client interview" -> creates a draft note
- "Research the PSG standard for this matter" -> dispatches to Research Agent (Phase 4+)

### 7.7 Knowledge Map (knowledge-map/page.tsx) -- Phase 5

Full-page D3 force-directed graph.

Data: GET /api/knowledge-graph returns JSON with nodes[] and edges[].

Node types and colors:

- Matter: blue
- Legal Standard: green
- Strategy Pattern: amber
- Document: gray
- Country: purple

Behavior:

- Zoomed out: nodes cluster by type. Labels show on hover.
- Zoomed in: individual nodes with edge lines. Labels always visible.
- Click node: side drawer opens with detail (summary, connected nodes, link to matter detail or Obsidian note)
- Search bar: filter by keyword, matter ID, country, practice area
- Filter toggles: show/hide by node type

### 7.8 Batch Upload (intake/batch/page.tsx) -- Phase 3

Drag-and-drop area for folders/files.

Optional: select target matter from dropdown.

On upload:

1. Files are sent to FastAPI POST /api/documents/upload
2. PII tier is checked (if AOD_PII_TIER < 1, only manually reviewed files are accepted)
3. Each file enters the Strong Reader pipeline:
  a. OCR (Tesseract or Textract)
   b. Categorizer (classifies page type)
   c. Fact Extractor (extracts structured facts)
   d. Obsidian Sync (writes markdown to brain/)
4. Progress bar shows per-file status
5. Results table shows: filename, category assigned, facts extracted count, confidence score

### 7.9 eImmigration Import (import/eimmigration/page.tsx) -- Phase 6

File upload for CSV/JSON exports from eImmigration.

Upload area + field mapping preview (shows source fields mapped to Airtable fields).

"Import" button processes the file through the eImmigration adapter.

Results: count of matters created/updated, tasks created, any errors.

---

## 8. AGENT CONTRACT (Five-Anchors Protocol)

Every agent in services/api/app/agents/ MUST return this Pydantic model:

```python
from pydantic import BaseModel
from typing import Optional
from enum import Enum

class ConfidenceLevel(str, Enum):
    HIGH = "high"       # > 0.85
    MEDIUM = "medium"   # 0.5 - 0.85
    LOW = "low"         # < 0.5

class Uncertainty(BaseModel):
    item: str
    confidence: float
    reason: str

class GapQuestion(BaseModel):
    question: str
    priority: int        # 1 = highest
    why_it_matters: str

class SourceRef(BaseModel):
    claim: str
    source: str
    url: Optional[str] = None
    date: Optional[str] = None

class FiveAnchors(BaseModel):
    facts: list[str]                    # What happened, who, when, where
    legal_context: list[str]            # Area of law, statutes, potential claims
    documents_evidence: list[str]       # What documents/evidence exist or are referenced
    procedural_posture: list[str]       # Where is this in the legal process
    uncertainty: list[str]              # What is unknown, missing, or unclear

class AgentResult(BaseModel):
    agent_name: str
    matter_id: Optional[str] = None
    identified: dict                    # Structured data the agent extracted
    uncertain: list[Uncertainty]        # Items with confidence < threshold
    gaps: list[GapQuestion]             # Questions needing answers to proceed
    sources: list[SourceRef]            # Where each identified item came from
    anchors: FiveAnchors               # The five anchors
    summary: str                        # 2-3 sentence plain-language summary
    next_steps: list[str]              # Recommended actions (promptable)

    def is_valid(self) -> bool:
        """PM Orchestrator calls this. Rejects results that claim
        certainty without disclosing gaps."""
        if not self.gaps and not self.uncertain:
            # Agent claims to know everything and have no questions.
            # This is almost never true. Flag for review.
            return False
        return True
```

The PM Orchestrator (pm_orchestrator.py) validates every AgentResult:

1. Calls result.is_valid()
2. If invalid (no gaps AND no uncertainties), creates a PM Inbox item:
  "Agent [name] returned a result claiming full certainty. This is unusual. Please review."
3. If valid, writes identified data to Airtable, creates notes for findings,
  creates tasks for gap questions, and updates the Case Assessment table.

---

## 9. RESEARCH AGENT MULTI-SOURCE PROTOCOL

The Research Agent (agents/research_agent.py) follows this exact source
hierarchy when executing legal research. This protocol is ported from
docs/constitution/research-memo-SKILL.md.

### For case law and legal standards:

1. Midpage MCP (if API key available): BIA precedent, Sixth Circuit, Supreme Court. Citator check on every case.
2. Fastcase (if API key available): backup case search. Cross-reference with Midpage results.
3. Web search (government): USCIS Policy Manual (uscis.gov), EOIR Practice Manual (justice.gov/eoir), AG opinions, Federal Register.
4. Web search (practice resources): AILA, CLINIC, ILRC, National Immigration Project.
5. Google Scholar: backup for very recent or unpublished decisions.
6. TRAC Immigration: judge/court grant rates (strategic intelligence).
7. MANUAL FLAG for attorney: Westlaw/Lexis Shepardizing (full citator), judge-specific research, sealed cases.

### For country conditions:

1. U.S. State Department: Country Reports on Human Rights (most recent + years respondent was present), Religious Freedom Reports, TIP Reports.
2. UNHCR / Refworld: eligibility guidelines, position papers.
3. CRS / USCIRF: Congressional Research Service, religious freedom designations.
4. NGOs: Amnesty International, Human Rights Watch, Freedom House, RSF, International Crisis Group.
5. UK Home Office CPINs, Canadian IRB, Australian DFAT (semi-auto, attorney verifies relevance).
6. News: Reuters, AP, BBC, Al Jazeera (corroborative only).
7. MANUAL FLAG: expert declarations, in-country local sources.

### Output:

Every research result includes a SOURCE DOCUMENTATION TABLE:
| # | Source | Searched | Finding | Date | Action Required |

This table goes into the memo AND the matter's notes.

---

## 10. TRAINING LOOP / CORRECTION PIPELINE

File: services/api/app/agents/correction_router.py

When an attorney makes a correction (edits a note, changes a classification,
rejects an agent recommendation, modifies a legal element assessment):

1. A Corrections record is created in Airtable with all fields.
2. Based on correction_type, the router acts:
  a. Convention (formatting, citation, document structure):
      -> Appends a YAML rule to brain/firm-rules.md
      -> Format: "- rule: [description]\n  source: correction_[id]\n  date: [date]\n"
      -> Every agent loads firm-rules.md at job start
   b. Analytical (wrong legal standard, missed issue, bad pattern match):
      -> Writes to Strategy Patterns table with correction_note
      -> Pattern Agent queries this to avoid repeating the error
   c. Classification (Strong Reader miscategorized a page):
      -> Appends to brain/categorizer-examples.jsonl
      -> Format: {"text": "[excerpt]", "correct_category": "[category]", "wrong_category": "[what agent said]"}
      -> Categorizer uses this as few-shot examples
   d. Factual / False Positive / False Negative:
      -> Creates a note on the matter with type = Correction
      -> Included in PM daily digest
3. Every correction writes an entry to activity_log.md per ROE.

---

## 11. DOCUMENT OUTPUT FORMAT (for agents that produce work product)

The Drafting Agent and Research Agent MUST follow these rules when
producing documents (.docx output):

1. MEMORANDUM header with horizontal rules above and below the TO/FROM block
2. TO: La'Dajia Ferguson, Esq. / FROM: Litigation Associate
3. DATE, RE (concise subject), Matter ID, Country, Posture
4. Page X of Y in footer
5. Section I: Purpose (what was the assignment)
6. Section II: Summary ("In short, ...") + Next Steps (promptable) + Awaiting directive on
7. Numbered outline: I. II. III. with 1. 2. 3. and a. b. c.
8. Proper Word footnotes (on the page where referenced, not endnotes)
9. Hyperlink every source in footnotes where possible
10. Source documentation table in every memo
11. Case assessment table as companion document
12. No em dashes. No emojis. Lists in list format.
13. Target length: 1.5 to 3 pages. Maximum 5.
14. Country conditions: always retrieve multiple years, not just the most recent

Full formatting specification is in docs/constitution/CLAUDE.md and
docs/constitution/research-memo-SKILL.md.

---

## 12. PHASE EXECUTION CHECKLIST

### Phase 0: True Foundation

- Create ~/Documents/AssociateOnDemand/ directory
- npx create-next-app@latest web --typescript --tailwind --app --src-dir
- Initialize FastAPI in services/api/ with pyproject.toml, main.py (/health endpoint)
- Create docker-compose.yml (postgres, redis, qdrant, fastapi, presidio)
- Create .env.example with all keys from Section 6
- Create brain/ Obsidian vault skeleton (01_Cases/, 02_Legal_Research/, 03_Firm_Knowledge/, 04_Templates/, 05_Admin/)
- Copy governance docs to root
- Create docs/constitution/ and place Master Blueprint, Backend Architecture, CLAUDE.md, SKILL.md, reference files
- Create LEGAL_BOUNDARIES.md
- Create activity_log.md with Entry 1
- Create .cursor/rules/project.mdc
- git init, git add, git commit -m "Phase 0: true foundation"
- VERIFY: docker-compose up returns healthy. localhost:3000 shows Next.js default page.

### Phase 1: Airtable Init + Read-Only Dashboard

- Create Airtable base with all 11 tables from Section 2
- Generate Airtable PAT, add to .env
- Build web/src/lib/airtable/ (client.ts, queries.ts, fields.ts, types.ts)
- Build API routes: matters (list, detail), tasks (list), notes (list), events (list)
- Build components: Sidebar, TopBar, MatterTable, MatterDetailTabs, MatterHeader
- Build pages: Dashboard (read-only KPIs), Matter List, Matter Detail (all tabs, read-only)
- Seed 3 real matters in Airtable
- Apply Professional Enterprise theme (dark sidebar, clean typography, Tailwind)
- VERIFY: localhost:3000 shows dashboard with real data from Airtable.

### Phase 2: Full CRUD + Case Assessment + Timeline + Command Panel

- Add create/update/delete to all API routes
- Build AddTaskForm, NoteComposer with task detection, TaskCompletionModal
- Build CaseAssessmentTable with clickable Next Action buttons (stub: creates a note)
- Build UnifiedTimeline interleaving all matter activity
- Build CommandPanel (right-docked, Airtable search only, no AI yet)
- Build InboxBadge in TopBar (reads PM Inbox unread count)
- Build InboxCard display page
- VERIFY: attorney can create a matter, add notes, create tasks, complete tasks, see timeline update, search via command panel.

### Phase 3: Strong Reader (Presidio-gated)

- Verify docker-compose presidio containers are healthy
- Build PII tier gate in FastAPI dependencies (rejects uploads if AOD_PII_TIER < 1)
- Build single-file upload endpoint + UI
- Build OCR pipeline (Tesseract)
- Build Categorizer agent (classifies page type, uses categorizer-examples.jsonl)
- Build Fact Extraction agent (returns AgentResult with five anchors)
- Build Obsidian Sync agent (writes markdown to brain/)
- Build BatchUploadForm for folder drag-and-drop
- VERIFY: upload a PDF, see it categorized, facts extracted, Obsidian note created.

### Phase 4: PM Orchestrator + Training Loop + Research Agent

- Build PM Orchestrator (dispatches jobs, validates AgentResult, manages inbox)
- Build Correction Pipeline (correction_router.py)
- Wire Command Panel to PM Orchestrator via FastAPI
- Build Research Agent with full multi-source protocol
- Wire Case Assessment Next Action buttons to PM Orchestrator
- Build daily digest (PM posts summary note at configured time)
- VERIFY: type a research request in Command Panel, see PM dispatch to Research Agent, see result appear as a note with source documentation table.

### Phase 5: Pattern Recognition + Strategy + Knowledge Map

- Build Pattern Recognition Agent (queries Qdrant + Strategy Patterns + Obsidian)
- Build Strategy Agent (develops strategy memo from selected approach)
- Build Knowledge Map page with D3 force-directed graph
- Build GET /api/knowledge-graph endpoint
- Wire pattern matches to Case Assessment tab annotations
- VERIFY: after 10+ matters with data, pattern agent surfaces a match. Knowledge map renders with clickable nodes.

### Phase 6: eImmigration Integration

- Build /import/eimmigration page with CSV upload
- Build field mapping preview
- Wire to existing eimmigration adapter
- Document weekly export ritual in docs/runbooks/
- VERIFY: upload an eImmigration CSV export, see matters and data created in Airtable.

### Phase 7: Production Hardening

- Add Clerk or Supabase Auth
- Deploy Next.js to Vercel
- Deploy FastAPI to Railway/Fly.io
- Migrate Postgres to Neon/Supabase managed
- Migrate Redis to Upstash
- Add Google Calendar sync for deadlines
- Add email alerts for overdue filing deadlines (Resend)
- Add Sentry error tracking
- Set up nightly backup of Airtable + Obsidian vault
- VERIFY: the system runs in production. Attorney can access from any device.

---

## 13. WHAT NOT TO DO

1. Do NOT copy code from RMV_Prototype. Build from scratch. Reference design docs only.
2. Do NOT integrate with Harvey, Wordsmith, or any product not listed in LEGAL_BOUNDARIES.md.
3. Do NOT stub a Clio adapter. Build it only when a subscription exists.
4. Do NOT store client PII in Airtable, Postgres, or any AI memory when AOD_PII_TIER = 0.
5. Do NOT let any agent conclude without surfacing gaps. Validate every AgentResult.
6. Do NOT use em dashes, emojis, or endnotes in any document output.
7. Do NOT build the Knowledge Map before Phase 5. The system needs data first.
8. Do NOT skip the attorney onboarding milestone at the end of each phase.

