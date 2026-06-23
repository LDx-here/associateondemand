# Recover My Value (RMV) - Data Normalization Adapter Design (E-immigration/Clio)

**Author:** Manus AI
**Date:** April 28, 2026
**Project:** Recover My Value (RMV) / Lightship

## 1. Introduction

This document outlines the design for a data normalization adapter within Recover My Value (RMV), specifically tailored to ingest and transform data from E-immigration and Clio. The goal is to enable users to quickly populate their RMV dashboard with existing case data by importing CSV or JSON exports from these platforms. This adapter is crucial for providing a functional, data-driven prototype and facilitating a smooth transition for users from their legacy systems.

## 2. Core Objectives

*   **Data Ingestion**: Allow seamless import of case data from E-immigration and Clio via CSV or JSON files.
*   **Data Transformation**: Convert external data formats into RMV's standardized internal data model.
*   **Data Validation**: Ensure the integrity and consistency of imported data.
*   **User Feedback**: Provide clear feedback on import status, success, and any errors.
*   **Extensibility**: Design a modular adapter that can be easily extended to support other legal practice management systems in the future.

## 3. RMV Internal Data Model (Simplified)

For the purpose of this adapter, we will focus on mapping key entities from E-immigration/Clio into a simplified RMV internal data model. This model will align with the core concepts of 
