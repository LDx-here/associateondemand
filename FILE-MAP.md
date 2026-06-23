# Where does this file go? (AssociateOnDemand map)

This repo is intentionally **layered** so you always know the “home” for anything you touch.

```
AssociateOnDemand/
│
├─ README.md                 Quick start (web + API + docker-compose)
├─ FILE-MAP.md               You are here — mental model of folders
├─ LEGAL_BOUNDARIES.md       What we will / will not integrate without permission
├─ activity_log.md           Append-only agent + human activity log (ROE §4)
├─ docker-compose.yml        Postgres + Redis + Qdrant + API + Presidio stub
├─ .env.example              Copy to `.env` for API defaults
│
├─ docs/
│  ├─ constitution/         **Binding context** — blueprint, backend memo, research SKILL, refs
│  ├─ design/                Historical Manus/spec markdown (reference only while building UI)
│  ├─ pivot/                 Airtable schema roadmap from prior pivot memo
│  ├─ attorney-onboarding/    Phase milestone checklists as we author them (Phase 1+)
│  └─ runbooks/              Operational checklists ("how to export CSV from eImmigration")
│
├─ brain/                    Obsidian-friendly markdown vault (**your daily narrative layer** until automation ingests PDFs)
│  ├─ 00_Templates/
│  ├─ 01_Cases/<matter>/     Mirrors individual client files ("Needles-lite" prose view)
│  ├─ 02_Research/
│  └─ 03_Firm_Knowledge/
│
├─ web/                      Next.js 16 UI (runs on http://localhost:3000 )
│  └─ src/app/ …             App-router pages (dashboard/login/etc.)
│
├─ services/api/             FastAPI engine (runs on http://localhost:8000 )
│  └─ app/main.py …          Starts with `/health` only (later: agents/OCR/import)
│
├─ services/presidio/        Stub + README — real Presidio stack lands in Phase 3
├─ agents/                   Markdown prompts per specialist agent (Phase 4+)
├─ .incoming/                Drop attorney-provided constitution/SKILL files here first
└─ .cursor/rules/project.mdc Cursor-wide guardrails for assistants
```

## How this maps to “Needles / eImmigration” mental models

| Legacy mental model | New home (today) | New home (Phase 1–2) |
|--------------------|------------------|----------------------|
| Matter header / parties | `brain/01_Cases/.../00_Overview.md` | Airtable **Matters** + overview tab in web |
| Task / tickler | Markdown checklist in overview | Airtable **Tasks** (+ timeline on web) |
| Notes chronology | Dated headings in Markdown | **Notes** table + unified timeline page |
| Document repository | External Drive + links in notes | **Documents** table + Phase 3 uploads |
| Mass import from vendor | Manual `.csv` into `docs/runbooks/` instructions | `/import/eimmigration` (Phase 6) |

## When you feel “extra steps”

You are not behind — you are **front-loading the filing structure** so agents have something to read later. Phase 1 gives you a **Needles-like grid** (Airtable + read-only web) so you stop bouncing between random folders.
