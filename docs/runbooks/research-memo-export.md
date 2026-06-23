# Research memo export (DOCX / TXT)

## Purpose

Attorneys can download a PM / Research memo from the Command Panel after a run returns `fullMemo`. The preferred format is `.docx` per BUILD_SPEC Section 11. When the FastAPI stack or `python-docx` is unavailable, the Next.js proxy returns plain TXT with the same content.

## Endpoints

- **FastAPI:** `POST /agents/research/memo-export`
  - JSON body: `{ "matter_id": "AOD-1001", "memo_text": "...", "format": "docx" | "txt" }`
  - Response: `application/vnd.openxmlformats-officedocument.wordprocessingml.document` or `text/plain`
- **Next.js (browser-safe):** `POST /api/research/memo-export`
  - JSON body: `{ "matterId": "AOD-1001", "memo": "...", "format": "docx" }`
  - Proxies to FastAPI using `NEXT_PUBLIC_API_URL`; falls back to TXT if the upstream call fails.

## Operations

1. Install API deps (`python-docx` is listed in `services/api/requirements.txt`).
2. Rebuild the API container: `docker compose up -d --build` from repo root.
3. Verify: save a memo from the UI (Download memo on an agent card with full memo).

## Roadmap

- Styled Word memo (MEMORANDUM header block, TOC, footnotes hyperlinks) stays out of scope until Drafting Agent work and a DOCX linter per BUILD_SPEC.
- MIDPAGE/FASTCASE live tiers do not affect export; citations remain attorney-review only until keys are configured.
