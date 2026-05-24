> **AOD note:** This file was copied from the RMV prototype `CLAUDE.md` as a Phase 0 stand-in until you replace it with your **litigation-associate CLAUDE** (firm constitution). Drop your authoritative version into [.incoming/](.incoming/) and replace `docs/constitution/03-CLAUDE-Firm-Constitution.md`.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Recover My Value (RMV)** (also called "Lightship") is an enterprise-grade multi-tenant SaaS platform for high-volume legal practice. It acts as an "operating system" for legal workflows, converting raw intake documents and unstructured facts into structured legal frameworks via AI agents. Primary market: immigration law (solo practitioners, small firms, non-profits).

Planning documentation lives in `/Users/ladaj/Documents/PMV_Proto/` (not in this repo):
- `Architecture Outline_ Recover My Value (RMV).md`
- `Technical Architecture Document_ Recover My Value (RMV) Multi-Tenant SaaS.txt`
- `Product Requirements Document: Recover My Value (RMV).md`
- `Systems Requirements Document (SRD)_ Recover My Value (RMV).md`
- `RMV Cursor Execution Guide_ Project Initialization & Expo UI Prototype.md`

## Tech Stack

**Frontend:** Next.js + React, Tailwind CSS, Chakra UI or Radix UI, React Query, Zustand/Jotai  
**Backend:** Python + FastAPI, Celery (task queue), Redis (broker + cache)  
**Mobile:** Expo + React Native (TypeScript, NativeWind for Tailwind)  
**Auth:** OAuth 2.0 (Auth0/Clerk), JWT, RBAC  
**DBs:** PostgreSQL (schema-per-tenant), Pinecone or Weaviate (vector/RAG), Redis  
**AI:** OpenAI GPT-4o or Anthropic Claude 3.5 Sonnet  
**Infra:** Docker + Kubernetes on GCP or AWS, GitHub Actions CI/CD, Stripe, SendGrid

## Local Development Setup

```bash
# Spin up PostgreSQL + Redis
docker-compose up -d

# Frontend
cd frontend && npm install && npm run dev

# Backend
cd backend && pip install -r requirements.txt
uvicorn main:app --reload

# Celery worker
celery -A tasks worker --loglevel=info

# Mobile prototype (Expo)
cd RMV_Mobile_Prototype_V4 && npm install && npm start

# Local case API (matters / notes / tasks — JSON file store)
cd rmv-case-api && npm install && npm start
```

## Architecture

### Four-Layer System

1. **Interface Layer** — Next.js web dashboard + Expo mobile app. Includes a block-based editor (Lexical or Slate.js) for attorneys to review and refine AI-generated drafts.

2. **Orchestration Layer (Manager Agent)** — Central FastAPI service that tracks the full case lifecycle, applies "Judgment Rules" (derived from law, firm policy, precedent), delegates to specialized agents, and captures attorney feedback to update Firm Skills.

3. **Service Layer (Specialized Agents)** — Four independent FastAPI microservices:
   - **Extraction Agent**: LLM-based NER on documents from Google Drive — extracts facts, dates, names, events
   - **Mapping Agent**: Maps extracted facts → legal elements using a "Case Element Chart" (e.g., "arrested in Moscow" → "Persecution by Government")
   - **Research Agent**: Closed-loop Westlaw/LexisNexis queries to find verified supporting case law — zero hallucinations on citations
   - **Drafting Agent**: Synthesizes structured facts + mapped elements + research into legal briefs/motions

4. **Data Layer** — PostgreSQL (schema-per-tenant), Vector DB (Firm Skills per tenant namespace), Google Drive API, E-immigration integration (webhooks/scraping), Redis

### Multi-Tenancy: Schema-per-Tenant

Each tenant (law firm) gets its own PostgreSQL schema within a shared database. Tenant context is extracted from JWT claims on every request and scopes all DB queries automatically. The vector database uses separate namespaces per tenant. Never mix tenant data — always verify `tenant_id` propagation through all layers.

### Skill Learning Loop

1. Drafting Agent generates preliminary legal document
2. Attorney edits in structured editor
3. Manager Agent captures the delta (AI output vs. attorney edits)
4. Refined logic stored in Vector DB as a "Firm Skill"
5. Future similar cases automatically benefit from stored skills

### Security Requirements

- Isolated VPC in production
- AES-256 at rest, TLS 1.2+ in transit
- Optional PII scrubbing before sending data to external LLMs
- RBAC: paralegals can edit, only attorneys can validate/submit

## Mobile Prototype (Expo)

The first deliverable is a clickable Expo prototype with these screens:
1. Login/Authentication
2. Case-Building Dashboard (case list, "+ New Case" button, nav bar)
3. Case Detail (Facts / Legal Elements / Research / Drafts sections, "+ Add Fact", "Generate Draft")
4. Structured Editor (mock draft display, Accept/Reject AI Suggestion buttons)

Use `src/data/casesService.ts`: mock data when `EXPO_PUBLIC_API_URL` is unset; otherwise the **rmv-case-api** service (`rmv-case-api/README.md`). Navigation via React Navigation.

Reusable assistant prompts for backend vs mobile vs orchestration live in **`agents/`**. Cursor rules for this repo live in **`.cursor/rules/`**.
