# Evaluation memo extracted from AOD-Plan-Evaluation.docx

MEMORANDUM

TO:          La'Dajia Ferguson, Esq.

FROM:     Litigation Associate

DATE:      May 2, 2026

RE:          Evaluation of AssociateOnDemand Build Plan; Recommended Amendments

I.  PURPOSE

This memorandum evaluates the AssociateOnDemand multi-agent build plan currently in Cursor and identifies six gaps between the plan as written and the system as designed in the Master Blueprint. For each gap, a specific amendment is recommended. These amendments should be incorporated before the agents begin building.

II.  SUMMARY

In short, the plan is structurally sound. The phasing is correct, the architecture is viable, and the governance framework is strong. However, six components that are central to the system's value are either missing or underdeveloped. Without these amendments, the agents will build a case management dashboard with document processing, which is useful but is not the trainable litigation associate with pattern recognition, visual knowledge mapping, and structured reasoning that the Master Blueprint describes.

Recommendation: incorporate all six amendments into the plan before Phase 0 execution begins. The amendments do not change the phasing; they add specificity to Phases 2, 3, and 4.

III.  EVALUATION OF EXISTING PLAN

Component

Assessment

Notes

Phase 0: Consolidation

Strong

Clean workspace, governance docs at root, git initialization, legal boundaries document. No changes needed.

Phase 1: Airtable + UI

Strong

Correct starting point. Dashboard, matter CRUD, tasks, notes with task detection. Harvey-style chat shell is the right UI pattern.

Phase 2: PM Agent

Good, needs amendment

PM orchestrator pattern is correct. Agent contracts need the five-anchors protocol and the training loop. See Amendments 1 and 4.

Phase 3: Human Brain

Good, needs amendment

Document intake and OCR pipeline is solid. Missing the strategy/pattern recognition layer and the visual knowledge map. See Amendments 2 and 3.

Phase 4: eImmigration

Strong

Tiered approach (CSV, observe, gated automation) is exactly right. No changes needed.

Phase 5: Hardening

Appropriate

Correct to defer. Auth, deployment, backups are post-validation concerns.

Multi-Agent Org Chart

Needs amendment

Missing Pattern Recognition Agent and Strategy Agent. See Amendment 2.

Harvey/Clio references

Needs clarification

Harvey is a UI pattern reference, not an integration. Clio adapter should not be built or stubbed until needed. See Amendment 5.

IV.  RECOMMENDED AMENDMENTS

Amendment 1: Five-Anchors Protocol as Universal Agent Contract

Location in plan: Phase 2, agent contract definition

Current state: The plan defines each specialist agent with a contract of run(job) returning result or blocker. This is too loose. It does not enforce the core behavior: every agent must identify what it knows, what it does not know, and what questions it needs answered.

Amendment: Replace the agent contract with a structured response format that every agent must follow:

a.  identified: structured data the agent was able to extract or determine

b.  uncertain: items the agent found but is not confident about, with confidence scores

c.  gaps: specific questions the agent needs answered before it can proceed

d.  sources: where each piece of identified information came from

e.  anchors: the five anchors (facts, legal context, documents/evidence, procedural posture, uncertainty) mapped from whatever the agent processed

This contract must be enforced at the PM Orchestrator level. If an agent returns a result without a gaps section, the PM flags it as incomplete. An agent is never allowed to conclude without surfacing what it does not know.

Amendment 2: Add Pattern Recognition Agent and Strategy Layer

Location in plan: Phase 3, between Fact Extraction and Drafting in the org chart

Current state: The plan has agents that extract facts and map legal elements, and it mentions a strategy-patterns.md file in Obsidian. But there is no agent that reasons about patterns across cases. The strategy layer, the ability to say "these facts look like Case B where approach X worked," does not exist in the plan.

Amendment: Add two new agents to the org chart:

a.  Pattern Recognition Agent (agents/pattern_agent.py)

Receives extracted facts and legal elements from a matter. Queries the knowledge base (Airtable Legal Elements table + Obsidian strategy vault + prior case assessment tables) for similar fact patterns. Returns: list of matching prior matters with similarity scores, the strategies that were used, and the outcomes. Does not recommend; it surfaces patterns for the attorney to evaluate.

b.  Strategy Agent (agents/strategy_agent.py)

Runs after the attorney reviews the pattern matches. Takes the attorney's selected strategy and develops it: identifies the legal standards that apply, the evidence needed, the potential weaknesses, and the opposing arguments to anticipate. Outputs a structured strategy memo following the format from the Master Blueprint (strengths, weaknesses, attack plan, response plan).

The flow becomes: Facts Agent extracts facts. Legal Mapping Agent maps to elements. Pattern Agent searches for similar cases. Attorney reviews matches and selects approach. Strategy Agent develops the strategy. Drafting Agent produces the work product.

New Airtable table: Strategy Patterns, with fields: Pattern ID, Fact Pattern (text), Matching Matters (linked), Strategy Used (text), Outcome (text), Confidence (number), Created By (person), Date. This table grows over time as cases are resolved and the attorney logs what worked.

Amendment 3: Add Visual Knowledge Map to the UI

Location in plan: Phase 3, as a new component in the Next.js app

Current state: The plan describes Obsidian as the knowledge layer with Dataview queries. Obsidian is a markdown editor with links. It is not the zoomable, interactive, Prezi-style visual map that was designed in the Master Blueprint.

Amendment: Add a /knowledge-map page to the Next.js app that renders the firm's knowledge as an interactive D3.js force-directed graph. Data source: the knowledge graph JSON built from Airtable (Matters, Legal Elements, Strategy Patterns, Documents) and Obsidian vault structure.

Behavior:

a.  Zoomed out: clusters by category (active matters, legal standards, strategy patterns, templates). Color-coded.

b.  Zoomed in: individual nodes with edges showing relationships ("this matter cites this case," "this strategy pattern was used in these matters").

c.  Click a node: detail panel with summary, connected nodes, links to the full record in the matter detail page or Obsidian note.

d.  Search and filter: by matter ID, practice area, legal element, strategy pattern, country.

This is not a Phase 5 nice-to-have. It is core to the system's value. The visual map is how the attorney sees the big picture and identifies connections that would otherwise require manually cross-referencing dozens of case files.

Amendment 4: Formalize the Training Loop

Location in plan: Phase 2, as a system-level behavior, not a per-agent feature

Current state: The plan says corrections get logged as "Firm Skill" rows in Airtable and appended to strategy-patterns.md. This is logging, not learning.

Amendment: Build a Correction Pipeline:

a.  When the attorney corrects an agent's output (edits a note, changes a classification, rejects a strategy suggestion), the PM Agent captures: what the agent produced, what the attorney changed, and why (if the attorney provides a reason).

b.  Each correction is categorized: factual error, classification error, formatting/convention error, analytical error, false positive, false negative.

c.  Convention corrections (formatting, citation style, document structure) update a firm-rules.md file that every agent reads at the start of every job. These are the durable rules from the Master Blueprint.

d.  Analytical corrections (wrong legal standard applied, missed issue, incorrect pattern match) are logged in the Strategy Patterns table with the correction noted. The Pattern Recognition Agent queries this table to avoid repeating the same error.

e.  Classification corrections update the Categorizer agent's reference examples. Over time, the agent's classification improves because it has more labeled examples of what the attorney considers correct.

This is the mechanism by which session 50 is better than session 1. Without it, the agents produce the same quality output forever.

Amendment 5: Clarify Harvey and Clio References

Location in plan: Throughout

Current state: The plan references "Harvey-style chat shell" and "Clio Adapter Agent." These names suggest integrations with Harvey AI and Clio, which could create confusion about what is being built and what legal/ToS implications exist.

Amendment:

a.  Rename "Harvey-style chat shell" to "Command Panel" or "Associate Chat." It is a chat interface inspired by Harvey's UX pattern, not an integration with Harvey. The LEGAL_BOUNDARIES.md should state: "Harvey is a UX reference only. No integration, API connection, or data exchange with Harvey AI exists or is planned."

b.  Remove "Clio Adapter Agent" from the org chart and Phase references entirely. Do not build it, do not stub it, do not allocate a file for it. When and if a Clio subscription exists and a business need arises, add it then through the official Clio REST API. Building an empty adapter now creates technical debt and false expectations.

c.  Add to LEGAL_BOUNDARIES.md: "RMV/AssociateOnDemand mirrors UX patterns from commercial legal technology products. It does not integrate with, connect to, or exchange data with these products unless explicitly documented and authorized through their official APIs."

Amendment 6: Case Assessment Table as First-Class UI Component

Location in plan: Phase 1, Matter Detail page

Current state: The plan describes the Matter Detail page with facts timeline, legal elements, documents, and next steps tabs. The case assessment table (the at-a-glance view showing every element, its assessment, the key gap, and the promptable next action) is not mentioned.

Amendment: Add a Case Assessment tab to the Matter Detail page. This tab renders the assessment table format established in the Master Blueprint:

Element / Pathway

Assessment

Key Gap

Next Action (Promptable)

Past Persecution

Moderate

Detention details undeveloped

Run client intake interview: duration, conditions, threats

Well-Founded Fear

Strong

Country report not retrieved

Retrieve State Dept reports 2024 + prior years

The table is populated by the Legal Element Mapping Agent and updated by the Pattern Recognition Agent. Each "Next Action" is a clickable prompt that, when selected, dispatches the action to the appropriate agent through the PM Orchestrator. This closes the loop: the attorney sees the assessment, clicks a next action, the agent executes it, the results update the table.

V.  AMENDED AGENT ORG CHART

The following agents should be in the final org chart:

1.  PM Orchestrator (reports to attorney, dispatches to all agents)

2.  Intake Agent (receives new matters)

3.  Strong Reader Agent (OCR + page categorization)

4.  Fact Extraction Agent (structured fact extraction)

5.  Legal Element Mapping Agent (maps facts to legal elements)

6.  Pattern Recognition Agent [NEW] (searches for similar fact patterns across prior matters)

7.  Strategy Agent [NEW] (develops case strategy based on attorney-selected approach)

8.  Mass Case Auditor (batch review of multiple matters)

9.  Research Agent (legal research using Midpage, Fastcase, web sources)

10. Drafting Agent (produces memos, briefs, motions)

11. Obsidian Sync Agent (writes to/reads from the knowledge vault)

12. eImmigration Adapter Agent (CSV/JSON import from eImmigration)

Removed: Clio Adapter Agent (not needed until Clio subscription exists).

Renamed: "Harvey-style chat" becomes "Associate Command Panel."

VI.  IMMEDIATE ACTION

Incorporate these six amendments into the plan document before executing Phase 0. The amendments add specificity to the agent contracts, introduce two missing agents, add a visual component to the UI, formalize the learning mechanism, clean up naming, and ensure the case assessment table is a first-class UI element.

Phase 0 can proceed unchanged. The amendments primarily affect Phases 2 and 3.

END OF DOCUMENT
