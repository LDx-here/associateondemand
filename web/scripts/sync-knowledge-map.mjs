#!/usr/bin/env node
/**
 * Sync firm knowledge Markdown → committed JSON for the /knowledge-map page.
 *
 * Reads brain/03_Firm_Knowledge/{immigration,firm_ops}/*.md (skips indexes,
 * README, _source, proposals) and writes web/src/lib/knowledge-map/data.json.
 *
 * Usage (from web/ or repo root via npm):
 *   node scripts/sync-knowledge-map.mjs
 *   npm run sync:knowledge-map
 */

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = resolve(__dirname, "..");
const REPO_ROOT = resolve(WEB_ROOT, "..");
const BRAIN_ROOT = join(REPO_ROOT, "brain", "03_Firm_Knowledge");
const OUT_DIR = join(WEB_ROOT, "src", "lib", "knowledge-map");
const OUT_FILE = join(OUT_DIR, "data.json");

const SKIP_FILES = new Set([
  "00-index.md",
  "readme.md",
  "_proposal-legal-element-templates.md",
]);

/** @param {string} name */
function shouldSkip(name) {
  const lower = name.toLowerCase();
  if (!lower.endsWith(".md")) return true;
  if (lower.startsWith("_")) return true;
  if (SKIP_FILES.has(lower)) return true;
  return false;
}

/**
 * Parse index table rows: | Topic | File | Notes? |
 * @param {string} md
 * @returns {{ topic: string, file: string, notes: string }[]}
 */
function parseIndexTopics(md) {
  const topics = [];
  for (const line of md.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|")) continue;
    if (/^\|\s*-+/.test(trimmed)) continue;
    const cells = trimmed
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim());
    if (cells.length < 2) continue;
    const [topic, fileCell, notes = ""] = cells;
    if (/^topic/i.test(topic) || /^file$/i.test(fileCell)) continue;
    // Skip sibling folder pointers like ../firm_ops/
    if (fileCell.includes("/") && !fileCell.endsWith(".md")) continue;
    const fileMatch = fileCell.match(/`?([a-z0-9._-]+\.md)`?/i);
    if (!fileMatch) continue;
    topics.push({
      topic: topic.replace(/\*\*/g, "").trim(),
      file: fileMatch[1],
      notes: notes.replace(/`/g, "").trim(),
    });
  }
  return topics;
}

/**
 * @param {string} md
 * @param {string} file
 */
function parseKnowledgeFile(md, file) {
  const lines = md.split("\n");
  let title = file.replace(/\.md$/, "").replace(/-/g, " ");
  let cite = "";
  let practiceAreas = "";
  /** @type {{ heading: string, bullets: string[] }[]} */
  const sections = [];
  /** @type {string[]} */
  const related = [];

  let current = null;

  for (const raw of lines) {
    const line = raw.replace(/\r$/, "");
    if (line.startsWith("# ")) {
      title = line.slice(2).trim();
      continue;
    }
    const citeMatch = line.match(/^\*\*Cite:\*\*\s*(.+)$/i);
    if (citeMatch) {
      cite = citeMatch[1].trim();
      continue;
    }
    const paMatch = line.match(/^\*\*Practice areas:\*\*\s*(.+)$/i);
    if (paMatch) {
      practiceAreas = paMatch[1].trim();
      continue;
    }
    if (line.startsWith("## ")) {
      const heading = line.slice(3).trim();
      if (/^related files$/i.test(heading)) {
        current = { heading, bullets: [], _related: true };
      } else {
        current = { heading, bullets: [] };
        sections.push(current);
      }
      continue;
    }
    const bullet = line.match(/^[-*]\s+(.+)$/);
    if (bullet && current) {
      const text = bullet[1].replace(/\*\*/g, "").trim();
      if (current._related) {
        related.push(text);
      } else {
        current.bullets.push(text);
      }
    }
  }

  // Pull related file names from related bullets / backticks
  const relatedFiles = [];
  for (const r of related) {
    for (const m of r.matchAll(/`([a-z0-9._/-]+\.md)`/gi)) {
      relatedFiles.push(m[1].replace(/^.*\//, ""));
    }
  }

  return {
    id: file.replace(/\.md$/, ""),
    file,
    title,
    cite,
    practiceAreas,
    sections: sections.map(({ heading, bullets }) => ({ heading, bullets })),
    related: relatedFiles.length ? relatedFiles : related,
  };
}

/**
 * @param {{ id: string, title: string, dir: string }} cat
 */
function loadCategory(cat) {
  const dir = join(BRAIN_ROOT, cat.dir);
  const indexPath = join(dir, "00-index.md");
  let indexTopics = [];
  try {
    indexTopics = parseIndexTopics(readFileSync(indexPath, "utf8"));
  } catch {
    console.warn(`warn: missing index ${indexPath}`);
  }

  const byFile = new Map(indexTopics.map((t) => [t.file, t]));
  const files = readdirSync(dir).filter((f) => !shouldSkip(f)).sort();

  /** @type {object[]} */
  const topics = [];
  const seen = new Set();

  // Prefer index order
  for (const indexed of indexTopics) {
    const path = join(dir, indexed.file);
    try {
      const parsed = parseKnowledgeFile(readFileSync(path, "utf8"), indexed.file);
      topics.push({
        ...parsed,
        topic: indexed.topic,
        notes: indexed.notes,
      });
      seen.add(indexed.file);
    } catch {
      console.warn(`warn: indexed file missing ${path}`);
    }
  }

  // Orphan MD files not in index
  for (const file of files) {
    if (seen.has(file) || byFile.has(file)) continue;
    const parsed = parseKnowledgeFile(readFileSync(join(dir, file), "utf8"), file);
    topics.push({
      ...parsed,
      topic: parsed.title,
      notes: "",
    });
  }

  return {
    id: cat.id,
    title: cat.title,
    description: cat.description,
    topics,
  };
}

function main() {
  const categories = [
    loadCategory({
      id: "immigration",
      title: "Immigration",
      dir: "immigration",
      description: "Legal elements, relief paths, and inadmissibility checklists.",
    }),
    loadCategory({
      id: "firm_ops",
      title: "Firm operations",
      dir: "firm_ops",
      description: "Intake, files, trust/billing, and calendaring checklists.",
    }),
  ];

  const payload = {
    generatedAt: new Date().toISOString(),
    source: "brain/03_Firm_Knowledge",
    label: "Firm knowledge map (reference)",
    categories,
  };

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_FILE, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  const count = categories.reduce((n, c) => n + c.topics.length, 0);
  console.log(`Wrote ${count} topics → ${OUT_FILE}`);
}

main();
