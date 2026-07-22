# Firm Memory + Firm Knowledge → legal elements

Short runbook for wiring practice reference material into AssociateOnDemand legal-element workflows.

## Firm Memory vs Firm Knowledge (read this first)

| | **Firm Memory** | **Firm Knowledge** |
|--|-----------------|--------------------|
| **What** | Tone, voice samples, style preferences | Book-extracted legal-element outlines (knowledge map) |
| **Where** | `/firm-memory` | `/knowledge-map#firm-knowledge` + `brain/03_Firm_Knowledge/immigration/*.md` |
| **On a matter** | Soft link from Legal elements (“voice / style”) | **Auto-loads core elements** on Legal Elements tab |
| **Agents** | Drafting voice / Strategy Patterns | Topic-aware MD excerpts in prompts (`firm_context.select_immigration_knowledge_files`) |

Both feed agents. **Knowledge drives Legal Elements** (what must be proved). **Memory drives voice** (how it reads).

## Where to put the immigration book

| Location | Best for | How AOD uses it |
|----------|----------|-----------------|
| **`brain/03_Firm_Knowledge/immigration/*.md`** | Curated chapter summaries & element checklists | **Wired** — agents (topic-aware) + UI Legal Elements load via knowledge-map JSON |
| **`/knowledge-map`** | Browse outlines (cites, facts that prove it) | Synced JSON from brain (`npm run sync:knowledge-map`) |
| **`/firm-memory`** | Style exemplars for **drafts** | Strategy Patterns → drafting voice |
| **`.aod-context/features/` or `.aod-context/technical/`** | Structured agent reference | Cursor agents + fallback templates |

### Upload recommendation (clear YES / NO)

| Material | Upload? | Where | Format |
|----------|---------|-------|--------|
| Firm brief/motion **style samples** (redacted) | **YES — priority 1** | `/firm-memory` | PDF/DOCX samples + tone prefs |
| Element checklists / 2–5 page chapter summaries | **YES — priority 2** | `brain/.../immigration/*.md` | Markdown (then sync knowledge map) |
| Full immigration treatise / book PDF | **NO (as a single upload)** | Keep master offline | Extract excerpts to `.md` instead |
| Client files | **NO** | Matter Documents only | Never Firm Memory / Knowledge vault |

## Matter-type → knowledge mapping (Pass 26)

`web/src/lib/firm-knowledge-for-matter.ts` maps case type → knowledge-map topics (aligned with API `firm_context`):

| Matter signals | Knowledge topics (examples) |
|----------------|----------------------------|
| Family / AOS / Adjustment / marriage | `family-based-immigration`, `marriage-based-aos`, `aos-*`, `affidavit-of-support` |
| Waiver / hardship / I-601 | `extreme-hardship-factors`, `ina-212a-waiver`, `unlawful-presence-bars` |
| Asylum | `asylum-elements`, `asylum-bars`, `withholding-cat` |
| Removal / cancellation | `procedural-posture-removal`, `cancellation-of-removal` |
| Criminal | `criminal-grounds-overview`, `aggravated-felony-overview` |

## Attorney workflow (matter)

1. Open a matter (e.g. family Adjustment / AOS) → **Legal elements** tab.
2. **Core elements auto-load** from Firm Knowledge for the case type (only when the list is empty — customized rows are never wiped).
3. Use **Add optional element…** for related topics (e.g. asylum / I-589 on a family AOS matter) without loading everything.
4. Expand an element → see **Information needed** (Present vs Needed vs assessment OCR).
5. Customize: edit gaps/actions, add custom elements; saves to Airtable Legal Elements.
6. If case type changes → prompt to **Add missing core** (merge only; keeps edits).
7. **Browse knowledge for this matter type** opens `/knowledge-map` filtered to relevant topics.
8. Firm Memory lives at `/firm-memory` (and Settings) for voice — separate from this tab.

## Future (not built)

- **USCIS form autofill** (e.g. I-589 / I-485 field fill from matter facts) — deferred; Legal Elements + Firm Knowledge mapping is the current path.

## How legal elements consume reference material

1. **Knowledge map** — `web/src/lib/knowledge-map/data.json` (from brain MD).
2. **Matter mapping** — `firm-knowledge-for-matter.ts` selects **core** (auto-seed) vs **optional** (dropdown) topics + “facts that prove it.”
3. **Legal Elements tab** — auto-seed / merge → Airtable rows; `supportingCases` stores `From firm knowledge: {topic-id}`.
4. **Agents** — same stems selected by `select_immigration_knowledge_files` in drafting prompts.
5. **Fallback** — practice-area templates in `legal-element-templates.ts` if no knowledge topics match (e.g. PI).

## Related code

- `web/src/lib/firm-knowledge-for-matter.ts`
- `web/src/lib/legal-element-templates.ts`
- `web/src/components/LegalElementsPanel.tsx`
- `services/api/app/agents/firm_context.py`
- `docs/constitution/07-Legal-Mapping-SKILL.md`

## Verify

```bash
cd web && npm run test:firm-knowledge
cd services/api && .venv/bin/python -m pytest tests/test_firm_knowledge.py -q
```

## Smart templates + Firm Memory (unchanged)

Smart templates separate **editable fields** from **locked boilerplate**. Firm Memory on `/firm-memory` is still the path for drafting voice — not for legal-element checklists.
