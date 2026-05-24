## AssociateOnDemand powered by RMV - Intelligent Document Ingestion (OCR) & Fact Extraction Layer Design

**Author:** Manus AI
**Date:** April 28, 2026
**Project:** AssociateOnDemand powered by RMV / Lightship

### 1. Introduction

This document outlines the design for the Intelligent Document Ingestion (IDI) and Fact Extraction Layer within AssociateOnDemand. The primary goal of this layer is to enable the system to process various document types, including scanned and photocopied PDFs, extract relevant information using Optical Character Recognition (OCR), and then identify and structure key facts for further legal analysis and mapping to legal elements. This layer is crucial for automating the initial stages of case assessment and populating the Obsidian 'Legal Brain' with actionable data.

### 2. Core Principles

*   **Robustness**: Handle a wide variety of document qualities, including low-resolution scans and photocopies.
*   **Accuracy**: Maximize OCR accuracy for text extraction, especially for legal terminology and dates.
*   **Scalability**: Process large volumes of documents efficiently.
*   **Integration**: Seamlessly integrate with existing AssociateOnDemand components, particularly the Mass Case Auditor and Obsidian 'Legal Brain'.
*   **Extensibility**: Allow for easy integration of new document types and fact extraction rules.

### 3. Architecture Overview

The IDI and Fact Extraction Layer will be implemented as a microservice within the AssociateOnDemand backend, leveraging cloud-based OCR services for optimal performance and accuracy. The workflow will involve document upload, OCR processing, text extraction, and initial fact identification.

```mermaid
graph TD
    A[User Uploads Document] --> B(Document Storage Service)
    B --> C{Document Type & Quality Check}
    C -->|Scanned/Image PDF| D[OCR Service (e.g., AWS Textract)]
    C -->|Text-based PDF/DOCX| E[Text Extraction Service]
    D --> F(Raw Text Output)
    E --> F
    F --> G[Fact Extraction Agent]
    G --> H{Structured Facts}
    H --> I[Database (PostgreSQL)]
    H --> J[Obsidian Sync Engine]
    J --> K[Obsidian Vault]
```

### 4. Components and Functionality

#### 4.1 Document Upload Service

*   **Functionality**: Handles secure upload of various document formats (PDF, DOCX, JPG, PNG) from the AssociateOnDemand web and mobile interfaces.
*   **API Endpoint**: `POST /api/v1/documents/upload`
*   **Input**: `multipart/form-data` containing the document file.
*   **Output**: Document ID, storage path, and initial metadata.

#### 4.2 Document Storage Service

*   **Functionality**: Stores uploaded documents securely in an S3-compatible object storage solution.
*   **Security**: Implements encryption at rest and in transit, access control, and versioning.

#### 4.3 Document Type & Quality Check

*   **Functionality**: Determines if a PDF is text-based or image-based (scanned). Assesses image quality for OCR optimization.
*   **Technology**: Libraries like `PyPDF2` or `pdfminer.six` for PDF analysis.

#### 4.4 OCR Service

*   **Functionality**: Converts image-based documents (scanned PDFs, JPEGs, PNGs) into machine-readable text.
*   **Technology**: AWS Textract (preferred for its high accuracy in document processing, form extraction, and table detection), or Tesseract OCR for on-premise/open-source alternative.
*   **Output**: Raw text content, bounding box information for text, and potentially extracted form data/tables.

#### 4.5 Text Extraction Service

*   **Functionality**: Extracts text directly from text-based PDFs and other editable document formats (e.g., DOCX).
*   **Technology**: Libraries like `PyPDF2`, `python-docx`.

#### 4.6 Fact Extraction Agent

*   **Functionality**: Processes the raw text output from OCR/Text Extraction to identify and structure key facts relevant to legal cases.
*   **Technology**: Leverages Natural Language Processing (NLP) models (e.g., spaCy, custom fine-tuned LLMs) to identify entities (persons, organizations, dates, locations), legal terms, and specific case details (e.g., date of incident, injuries, parties involved).
*   **Output**: A structured JSON object containing extracted facts, confidence scores, and references to the original document location.

### 5. Integration with Existing Modules

*   **Mass Case Auditor**: Structured facts will feed into the Mass Case Auditor for automated assessment against the `Case_Assessment_Template.md` and `Exit_Audit_Tracker-ExitAuditTracker.csv`.
*   **Obsidian Sync Engine**: Extracted facts and the original document will be pushed to the Obsidian Sync Engine for categorization and storage in the 'Legal Brain'.
*   **FastAPI Mutation Layer**: New API endpoints will be exposed to store the extracted facts and link them to specific cases.

### 6. Cursor Implementation Prompt

> "Read `AssociateOnDemand_Intelligent_Document_Ingestion_Design.md`. Implement the Intelligent Document Ingestion (IDI) and Fact Extraction Layer. Create a FastAPI microservice that handles document uploads, performs OCR on scanned PDFs (using a placeholder for AWS Textract integration), extracts text from other document types, and processes the text through a Fact Extraction Agent to identify structured legal facts. Ensure the extracted facts can be stored in the PostgreSQL database and are ready for integration with the Obsidian Sync Engine and Mass Case Auditor. Develop a basic UI component in the Next.js web application for document upload and display of extracted facts, adhering to the professional enterprise theme."
