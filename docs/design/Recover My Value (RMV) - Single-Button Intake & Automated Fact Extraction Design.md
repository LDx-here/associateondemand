# Recover My Value (RMV) - Single-Button Intake & Automated Fact Extraction Design

**Author:** Manus AI
**Date:** April 28, 2026
**Project:** Recover My Value (RMV) / Lightship

## 1. Introduction

This document outlines the design for RMV's 
"Single-Button Intake" system, designed to streamline the initial client interaction and automate the extraction of critical case information. This module is crucial for transforming raw intake calls into structured data, enabling rapid assessment and subsequent automated workflows for co-counsel referral and retainer agreements.

## 2. Core Objectives

*   **Efficiency**: Reduce manual data entry during and after intake calls.
*   **Accuracy**: Ensure consistent capture of essential client and case details.
*   **Automation Trigger**: Provide a clear starting point for subsequent automated legal workflows.
*   **Client Experience**: Maintain a professional and informative interaction with potential clients.

## 3. UI Design: The "Single-Button Intake" Interface

The 
initial interface for the "Single-Button Intake" will be designed for simplicity and speed, likely integrated into the RMV dashboard or a dedicated intake module. It will be optimized for use during a live phone call or immediately after.

### 3.1. Key UI Elements

*   **"Start Intake" Button**: A prominent, easily accessible button to initiate the intake process.
*   **Voice-to-Text / Manual Input Field**: A primary area where the user (attorney/paralegal) can either speak directly (leveraging a voice-to-text API) or quickly type notes from the conversation. This field will be the source for automated fact extraction.
*   **Pre-defined Prompts/Checklists**: A dynamic checklist or series of prompts that guide the user to ask specific questions during the intake call, ensuring all necessary information is gathered. These prompts will be based on the type of case (e.g., Personal Injury, Immigration).
    *   **Example Prompts**: "What's your first name and last name?", "When did this happen?", "What happened?", "Were you injured?", "Other driver's information?", "Potential client's information?", "Current status?", "What are you needing?"
*   **Quick-Tagging/Categorization**: Small, clickable tags or dropdowns to quickly categorize information as it's entered (e.g., `Client Name`, `Date of Incident`, `Injury Type`, `Opposing Party`). This aids the AI in structured extraction.
*   **Confirmation/Review Pane**: A real-time display of extracted facts, allowing the user to quickly review and correct any AI misinterpretations before finalizing the intake.
*   **"Propose to Co-Counsel" Button**: A button to trigger the co-counsel referral workflow.
*   **"Send Retainer" Button**: A button to initiate the contingent agreement process.

## 4. Automated Fact Extraction Logic

The core of the "Single-Button Intake" is its ability to automatically extract structured data from unstructured input (voice-to-text or typed notes). This will be powered by RMV's existing AI agent framework, specifically leveraging the **Fact Extraction Agent**.

### 4.1. Extraction Process

1.  **Input Capture**: The system captures the user's spoken or typed input from the intake call.
2.  **Natural Language Processing (NLP)**: The input is fed to the Fact Extraction Agent, which uses advanced NLP models (leveraging LLMs) to identify and categorize key entities and events.
    *   **Entity Recognition**: Identifies names (client, other parties), dates, locations, injury types, vehicle information, etc.
    *   **Event Extraction**: Identifies the core incident, actions taken, and current status.
    *   **Intent Recognition**: Determines the client's primary need (e.g., personal injury claim, immigration petition).
3.  **Schema Mapping**: Extracted entities and events are mapped to a predefined **Intake Schema** within RMV's database. This schema will include fields such as:
    *   `client_first_name`, `client_last_name`
    *   `incident_date`, `incident_description`
    *   `injury_details`
    *   `other_driver_info` (name, insurance, vehicle)
    *   `current_status` (e.g., 
