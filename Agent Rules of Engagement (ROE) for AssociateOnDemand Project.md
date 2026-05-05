# Agent Rules of Engagement (ROE) for AssociateOnDemand Project

**Author:** Manus AI
**Date:** May 2, 2026
**Project:** AssociateOnDemand powered by RMV

## 1. Introduction

This document outlines the **Rules of Engagement (ROE)** for any AI agent collaborating on the AssociateOnDemand project. Its purpose is to establish clear boundaries for agent access and actions on the user's local machine, ensuring security, transparency, and user control. These rules are designed to foster a collaborative environment where the agent can effectively contribute to the project while respecting the user's digital space.

## 2. Access Limits and Scope of Operation

AI agents are strictly confined to operating within the designated project directory and its subdirectories. Any actions outside this scope require explicit user permission.

*   **Designated Project Directory:** The agent's primary operational scope is limited to the `/home/ubuntu/AssociateOnDemand` directory (or the specific root directory where the user initiates the project).
*   **File System Access:** The agent is permitted to read, write, and modify files *only* within the designated project directory and its subdirectories.
*   **No System-Level Modifications:** The agent is strictly prohibited from modifying system-level files, configurations, or installing software globally without explicit user consent.

## 3. Permission Gates: Explicit User Consent Required

Certain actions, due to their potential impact on the user's system or data, require explicit, affirmative permission from the user before execution. The agent **MUST** pause and request permission for the following:

*   **Software Installation:** Any attempt to install new software packages, libraries, or dependencies that are not explicitly defined in the project's `package.json`, `requirements.txt`, or similar project-specific configuration files.
*   **Network Access for External Services:** Initiating connections to external services or APIs (other than those explicitly required for the project's core functionality, e.g., Airtable API calls) that involve data transfer from the user's machine.
*   **Running Executable Scripts:** Executing any script or program that is not part of the core project codebase or that could potentially alter the system state outside the project directory.
*   **Modifying `.env` or Configuration Files:** Changes to `.env` files, `.gitignore`, or other critical configuration files that are not directly related to project functionality or explicitly requested by the user.
*   **Deletion of Directories/Files:** Deleting entire directories or critical project files, even within the designated project directory, requires explicit confirmation.

## 4. Transparency and Activity Logging

To maintain full transparency, the agent is required to log all significant actions performed on the user's system.

*   **Activity Log File:** The agent **MUST** maintain an `activity_log.md` file within the root of the designated project directory (`/home/ubuntu/AssociateOnDemand/activity_log.md`).
*   **Log Content:** Each entry in the `activity_log.md` file **MUST** include:
    *   Timestamp of the action.
    *   Description of the action (e.g., "File created: `web/aod-next/src/components/ChatInterface.tsx`").
    *   Command executed (if applicable, e.g., `npm install`).
    *   Files touched or modified.
*   **Log Frequency:** The `activity_log.md` should be updated after every significant action or at regular intervals (e.g., every 5-10 minutes during active development).

## 5. Communication Protocol

*   **Clear Requests for Permission:** When explicit permission is required, the agent **MUST** clearly state the action it intends to perform and the reason for it, awaiting user confirmation.
*   **Status Updates:** The agent should provide regular, concise updates on its progress and any challenges encountered.

By adhering to these Rules of Engagement, the AI agent will function as a trusted and transparent partner in the development of AssociateOnDemand.
