# Day one — confirm the system is alive

1. Run `docker compose up -d` from the repo root; open http://localhost:8000/health (status `ok`).
2. Run `cd web && npm install && npm run dev`; open http://localhost:3000.
3. Open **Dashboard** — you should see matters (demo data until Airtable is configured).
4. Click a matter — tabs Overview, Timeline, Case Assessment, etc.
5. Park narrative notes in `brain/01_Cases/<your-matter>/` until batch ingest (Phase 3).

When ready for live data: create the Airtable base per `docs/pivot/AssociateOnDemand: Airtable-as-Backend Schema Design.md`, then set `AIRTABLE_PAT` and `AIRTABLE_BASE_ID` in `web/.env.local`.
