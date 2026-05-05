# Agent Activity Log Design for AssociateOnDemand Project

**Author:** Manus AI
**Date:** May 2, 2026
**Project:** AssociateOnDemand powered by RMV

## 1. Introduction

This document details the design and requirements for the `activity_log.md` file, a crucial component of the Agent Rules of Engagement (ROE). The activity log ensures transparency by documenting all significant actions performed by an AI agent within the AssociateOnDemand project, providing the user with a clear record of agent operations.

## 2. Log File Location and Naming Convention

*   **Location:** The `activity_log.md` file **MUST** be located at the root of the designated project directory. If the project root is `/home/ubuntu/AssociateOnDemand`, the log file path will be `/home/ubuntu/AssociateOnDemand/activity_log.md`.
*   **Naming:** The file will be named `activity_log.md` to ensure it is easily readable and viewable as a Markdown document.

## 3. Log Entry Structure and Content

Each entry in the `activity_log.md` file will follow a consistent Markdown-based structure, making it human-readable and easy to parse. Each entry will be appended to the file.

### 3.1. Required Fields for Each Log Entry:

*   **Timestamp:** The exact date and time (including timezone) when the action occurred. Format: `YYYY-MM-DD HH:MM:SS [TZ]`.
*   **Action Type:** A brief classification of the action (e.g., `FILE_WRITE`, `SHELL_EXEC`, `BROWSER_NAVIGATE`, `PERMISSION_REQUEST`).
*   **Description:** A concise, human-readable summary of the action performed.
*   **Details (Optional but Recommended):** Additional context, such as the command executed, files affected, or URLs visited.

### 3.2. Markdown Structure for a Log Entry:

Each log entry will be formatted as a Markdown heading (level 3) followed by a list of details:

```markdown
### [YYYY-MM-DD HH:MM:SS TZ] [Action Type]: [Description]

*   **Details:** [Detailed explanation of the action, e.g., command, file paths, URLs]
*   **Files Affected:** [List of file paths, if applicable]
*   **Command Executed:** [Full command string, if applicable]
*   **Reason/Context:** [Brief explanation of why the action was taken]
```

## 4. Example Log Entries

```markdown
### [2026-05-02 14:35:01 EDT] FILE_WRITE: Created AssociateOnDemand_Project_DNA.md

*   **Details:** Initial creation of the project DNA document.
*   **Files Affected:** `/home/ubuntu/AssociateOnDemand_Project_DNA.md`
*   **Command Executed:** `default_api.file(action='write', path='/home/ubuntu/AssociateOnDemand_Project_DNA.md', ...)`
*   **Reason/Context:** To establish foundational project context for future agent collaboration.

### [2026-05-02 14:40:15 EDT] SHELL_EXEC: Installed npm dependencies for web/aod-next

*   **Details:** Executed `npm install` in the `web/aod-next` directory.
*   **Files Affected:** `web/aod-next/package-lock.json`, `web/aod-next/node_modules/` (created/modified)
*   **Command Executed:** `cd web/aod-next && npm install`
*   **Reason/Context:** To prepare the Next.js application for development.

### [2026-05-02 14:45:30 EDT] PERMISSION_REQUEST: Attempted to install global package

*   **Details:** Agent attempted to run `sudo npm install -g some-global-tool`.
*   **Files Affected:** N/A (permission denied)
*   **Command Executed:** `sudo npm install -g some-global-tool`
*   **Reason/Context:** Agent identified a missing global dependency for a sub-task. Awaiting user permission.
```

## 5. Log Maintenance

*   **Append-Only:** New log entries will always be appended to the end of the `activity_log.md` file.
*   **No Deletion/Modification:** The agent is prohibited from deleting or modifying existing log entries to maintain an immutable record of activities.
*   **Frequency:** The log should be updated immediately after any action that falls under the logging requirements, or at minimum, every 5 minutes during continuous operation.

This activity log design ensures that the user has complete visibility into the agent's operations, fostering trust and control within the collaborative development environment.
