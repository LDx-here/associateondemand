# Recover My Value (RMV) - Co-Counsel Referral & Retainer Automation Workflow Design

**Author:** Manus AI
**Date:** April 28, 2026
**Project:** Recover My Value (RMV) / Lightship

## 1. Introduction

This document details the design for automating the co-counsel referral and contingent retainer agreement process within Recover My Value (RMV). Building upon the "Single-Button Intake" module, this workflow aims to streamline the process of collaborating with external counsel and securing client agreements, minimizing manual intervention and ensuring transparent communication.

## 2. Core Objectives

*   **Expedite Referrals**: Quickly generate and propose contingent agreements to co-counsel based on intake data.
*   **Automate Communication**: Manage email correspondence with co-counsel and their legal assistants.
*   **Calendar Integration**: Facilitate scheduling of follow-ups and meetings with co-counsel and clients.
*   **Retainer Efficiency**: Automate the generation and delivery of contingent fee agreements to clients.
*   **Transparency**: Provide clear visibility into the status of referrals and retainer agreements.

## 3. Co-Counsel Referral Workflow

### 3.1. Triggering the Referral

The co-counsel referral workflow is initiated from the "Single-Button Intake" interface via the "Propose to Co-Counsel" button. This action signals the system to prepare a referral package based on the extracted intake data.

### 3.2. Co-Counsel Selection & Data Package Generation

1.  **Co-Counsel Database**: RMV will maintain a secure database of pre-approved co-counsel, including their contact information, practice areas, and preferred communication methods.
2.  **Automated Package Assembly**: The system will automatically compile a referral package, including:
    *   A summary of the case facts extracted during intake.
    *   Relevant client contact information.
    *   A proposed contingent fee split (configurable by the user).
    *   A draft contingent fee agreement for co-counsel review.

### 3.3. Proposal to Co-Counsel

1.  **Initial Inquiry Email**: An automated, concise email will be sent to the selected co-counsel. This email will include a secure link to the referral package within RMV, requiring co-counsel to log in to view sensitive details. The email will be designed to be "short and sweet," as requested, serving as an inquiry message.
2.  **Co-Counsel Review & Acceptance**: Co-counsel will review the proposal and can either accept, reject, or request modifications directly within the RMV platform. This interaction will be tracked and trigger subsequent actions.

### 3.4. Communication with Legal Assistant

Upon co-counsel acceptance or request for modification, the system will automatically send a notification email to their designated legal assistant. This email will include:
*   Confirmation of the co-counsel's decision.
*   Instructions for accessing the case details within RMV.
*   A prompt to schedule a follow-up meeting (if applicable) via a calendar integration link.

## 4. Retainer Agreement Automation

### 4.1. Contingent Agreement Generation

Once the co-counsel agreement is finalized (or if no co-counsel is involved), the system will generate a contingent fee agreement for the client. This agreement will be pre-populated with all relevant case and client details from the intake process.

### 4.2. Client Delivery & E-Signature

1.  **Secure Email Delivery**: The contingent agreement will be sent to the client via a secure email link, leveraging an integrated e-signature platform (e.g., DocuSign, HelloSign).
2.  **Status Tracking**: RMV will track the status of the agreement (sent, viewed, signed, pending) and provide real-time updates to the user.

## 5. Calendar Integration & Scheduling

RMV will integrate with Google Calendar and Outlook Calendar to streamline scheduling for both internal and external meetings.

### 5.1. Availability Management

*   **Configurable Availability**: Users (attorneys, paralegals) will be able to set specific days and time blocks when they are available for meetings related to referred cases or client onboarding.
*   **Automated Scheduling Links**: The system will generate unique scheduling links that reflect the user's availability. These links can be included in automated emails to co-counsel and clients.

### 5.2. Meeting Creation

When a recipient uses a scheduling link, a meeting will be automatically created in the user's Google or Outlook Calendar, with all relevant case details pre-filled.

## 6. Automated Outreach & Transparency

All automated emails (inquiry to co-counsel, notification to legal assistant, retainer to client) will be sent through RMV's Automated Outreach & Transparency Module. This ensures:

*   **Centralized Logging**: Every email sent on your behalf will be logged within the RMV platform, providing a complete communication history.
*   **User Visibility**: You will have a dashboard or dedicated section to view all outgoing emails, their content, and their delivery status.
*   **Customizable Templates**: All email templates will be customizable to maintain your firm's branding and tone.

## 7. Integration with RMV Architecture

This workflow will leverage the existing RMV backend services, particularly the Agent Orchestration layer for managing communication agents, and the Unified Database for storing co-counsel information, agreement templates, and communication logs. The UI elements will be integrated into the RMV web and mobile applications, adhering to the Legora/Clio aesthetic.
