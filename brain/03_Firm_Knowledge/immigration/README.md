# Immigration knowledge excerpts

Drop **short markdown checklists and chapter summaries** here (`.md` only). Agents load these into prompts (capped ~3.5–6k characters total, max ~8 files). Skips `README.md`, `00-index.md`, and `_source/`.

## Do

- Element checklists (e.g. I-485 discretionary factors)
- 1–3 page chapter summaries with controlling cites
- RMV house playbooks in plain text
- One legal element (or tight topic) per file

## Do not

- Whole-book PDFs (not ingested — put masters in `_source/`, gitignored)
- Scanned images without OCR text
- Client PII or sealed materials
- One giant narrative dump of the entire book

Prefer uploading **style samples + short snippets** to `/firm-memory` for live prod drafting voice. Keep the master book offline or in `_source/` for humans; extract structured excerpts here for agents.

---

## Book → MD conversion (for Cursor)

1. Place the book PDF under `_source/` (local only; not committed).
2. Ask a Cursor agent to convert **by element/chapter** into this folder (see paste prompt below).
3. Update `00-index.md` topic table.
4. Review key files yourself.
5. Redeploy the API so Fly picks up new `.md` files (`brain/03_Firm_Knowledge` is copied into the Docker image).
6. Verify: run a draft or legal-mapping on a matter and confirm element context appears.

### Per-file template

```markdown
# [Element or topic name]

**Cite:** [INA / CFR / USCIS-PM / case cite]
**Practice areas:** AOS | Asylum | Waiver | …

## What this element requires
- Bullet criteria (not prose chapters)

## Facts that prove it
- Fact type → why it helps
- Link to typical assessment fields if known

## Common pitfalls
- …

## Sample language pointers
- Short cues only (full voice samples → Firm Memory)

## Related files
- See `00-index.md`
```

### Paste this into Cursor

```
Convert the immigration book in brain/03_Firm_Knowledge/immigration/_source/ into curated structured Markdown legal-element files for AssociateOnDemand.

Rules:
- Output under brain/03_Firm_Knowledge/immigration/ (NOT one giant file)
- Follow the per-file template in that folder's README.md
- One element or tight chapter per .md file (e.g. aos-discretionary-factors.md, ina-212a-waiver.md, hardship-factors.md)
- Prefer checklists, cites, facts-that-prove-it, pitfalls — keep narrative short (agent prompts are char-capped ~4–6k total)
- Update 00-index.md with a topic → file map
- Do NOT commit the PDF or copyrighted full book
- Optionally propose additions to web/src/lib/legal-element-templates.ts from the same structure
```

---

## Where knowledge lives

| Purpose | Where |
|---------|--------|
| Voice / tone samples | `/firm-memory` (Firm Memory) |
| Legal element knowledge map | `brain/03_Firm_Knowledge/immigration/*.md` (this folder) |
| Case-specific facts | Matter Documents / assessment upload |
