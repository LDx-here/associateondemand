# Smart Templates — user guide

Quick reference for attorneys using **Smart Templates** and **Firm Memory** on `/templates`.

## How templates work (eImmigration / TXDocs model)

1. Upload your firm’s **master DOCX/PDF** per SKU (**Replace template**) — that is the template.
2. System detects structure (CREAC / headings) and **merge fields** like `{{qualifying_relative}}`, `{{hardship_facts}}`.
3. Matter facts + **Settings → Firm profile** (letterhead, certificate of service) fill those fields → draft in your format.

Until you upload a firm file, you see a clearly labeled **default system outline** — not presented as your firm template.

## Smart Templates (interactive)

1. Open **Templates** — browse by practice area (Cards or List), then **Open preview** (lands on **Structure mapping**).
2. Architecture / TXDocs explainers live on **Help → How this works** (`/help#templates`), not on the Templates page.
3. Optional: **Smart field maps** section → **Configure & preview** for interactive merge-field assembly.
4. **Fill violet merge fields** — client-specific data; letterhead/certificate come from Firm profile.
5. Expand **structure sections** to see built-in outline vs firm-editable blocks (with why labels).
6. **View default system blank** only when no firm file is on file (never mistaken for your DOCX).
7. Click **Generate** → review assembled draft → **Copy** or **Download DOCX**.

On a matter: **Overview** tab → **Smart templates** panel (same flow, prefilled from matter data).

## Firm profile (letterhead & certificate)

| Field | Where |
|-------|--------|
| Firm name, address, phone, email, bar number | **Settings → Firm profile** |
| Certificate of service text (`{{date}}`, `{{method}}`, `{{parties_served}}`) | Same page — editable firm template |

Empty letterhead shows a placeholder pointing to Settings — **never invented fake addresses**.

## Firm Memory

| Step | What to upload | When |
|------|----------------|------|
| 1 — Firm document samples | Brief, motion, letter, form, or other prior work | Always recommended — teaches tone + unlocks sample discount |
| 2 — Case assessment template | Blank XLSX assessment workbook only | Optional — if separate from your motion/brief samples |
| 3 — Style preferences | Tone, citation format, memo header | Saves to Strategy Patterns — **applied to all agent drafting** |

Upload your firm’s **actual telephonic request PDF/DOCX** via **Replace template** on the hearing-packet card to replace the built-in HTML placeholder.

## Deliverable structure

Each catalog card shows **Includes:** required sections. Structure sections are labeled:

- **Built-in structure** — default outline; replace via firm DOCX
- **Firm profile** — letterhead / certificate; edit in Settings
- **Preserve** — Rule/Explanation / statutory wording from firm template or SKILL

## Export format

Research memos and generated template previews export with a **MEMORANDUM** header (TO/FROM/DATE/RE) when missing from the body. Firm Memory header preferences inject into export when saved in Step 3.
