# AssociateOnDemand: Airtable-as-Backend Schema Design

**Author:** Manus AI
**Date:** April 29, 2026
**Project:** AssociateOnDemand powered by RMV

## 1. Introduction

This document outlines the database schema for AssociateOnDemand, pivoting from a complex PostgreSQL/Supabase setup to an **Airtable-backed architecture**. This approach leverages Airtable's intuitive, relational table structure to manage complex legal data, providing immediate usability and flexibility while serving as the robust backend for the Next.js frontend and AI agent workflows.

## 2. Core Airtable Bases and Tables

The system will be organized into a primary "AssociateOnDemand Master Base," containing interconnected tables that represent the core entities of the legal practice.

### 2.1 Matters (Cases) Table

This is the central hub for all legal cases. Every other table links back to a specific Matter.

| Field Name | Field Type | Description |
| :--- | :--- | :--- |
| Matter ID | Auto Number | Unique identifier for the case (e.g., AOD-1001). |
| Client Name | Linked Record | Link to the Contacts table. |
| Case Type | Single Select | e.g., Personal Injury, General Asylum, Family-Based. |
| Status | Single Select | e.g., Intake, In Progress, Pending Filing, Closed. |
| Procedural Posture | Single Line Text | Current stage of the case (from Exit Audit Tracker). |
| Fidelity Score | Number | AI-calculated score representing case strength (0-100). |
| Next Deadline | Date | The most immediate upcoming critical date. |
| Vulnerability Flags | Multiple Select | e.g., Approaching SOL, Missing Evidence, Unresponsive Client. |
| Assigned Attorney | User | The attorney responsible for the matter. |

### 2.2 Contacts (Clients & Entities) Table

Manages all individuals and organizations associated with matters.

| Field Name | Field Type | Description |
| :--- | :--- | :--- |
| Contact ID | Auto Number | Unique identifier. |
| Full Name | Single Line Text | First and Last Name. |
| Role | Single Select | e.g., Client, Co-Counsel, Opposing Counsel, Judge. |
| Email | Email | Primary contact email. |
| Phone | Phone Number | Primary contact phone. |
| Linked Matters | Linked Record | Link to the Matters table. |

### 2.3 Tasks & Workflows Table

Tracks all actionable items, deadlines, and automated workflows.

| Field Name | Field Type | Description |
| :--- | :--- | :--- |
| Task ID | Auto Number | Unique identifier. |
| Task Name | Single Line Text | Short description of the action required. |
| Matter Link | Linked Record | Link to the associated Matter. |
| Status | Single Select | e.g., To Do, In Progress, Blocked, Done. |
| Due Date | Date | Deadline for the task. |
| Assigned To | User | Team member responsible. |
| AI Trigger | Checkbox | If checked, triggers a Zapier/Make automation (e.g., "Draft Email"). |

### 2.4 Notes & Timeline Table

A chronological log of all case developments, communications, and AI insights.

| Field Name | Field Type | Description |
| :--- | :--- | :--- |
| Note ID | Auto Number | Unique identifier. |
| Matter Link | Linked Record | Link to the associated Matter. |
| Date | Date/Time | When the note was created. |
| Content | Long Text | The body of the note or communication log. |
| Type | Single Select | e.g., Client Call, Court Update, AI Assessment, System Log. |
| Requires Action | Checkbox | If checked, prompts the AI to suggest a new Task. |

### 2.5 Legal Elements & Facts Table

The core of the "Decision Engine," mapping extracted facts to required legal elements.

| Field Name | Field Type | Description |
| :--- | :--- | :--- |
| Element ID | Auto Number | Unique identifier. |
| Matter Link | Linked Record | Link to the associated Matter. |
| Legal Element | Single Select | e.g., "One-Year Filing Deadline," "Persecution," "Damages." |
| Extracted Fact | Long Text | The specific fact supporting the element (populated by AI). |
| Source Document | Linked Record | Link to the Documents table where the fact was found. |
| Status | Single Select | e.g., Proven, Disputed, Missing. |

## 3. Integration Strategy

Airtable will serve as the single source of truth. 

1.  **Frontend (Next.js)**: The Next.js dashboard will use the Airtable API to read and display data in the professional Legora/Clio aesthetic.
2.  **AI Agents**: Zapier or Make.com will monitor Airtable for specific triggers (e.g., a new Note added with "Requires Action" checked) and route the data to the appropriate AI agent (via OpenAI API or similar) for processing, writing the result back to Airtable.
