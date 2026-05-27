import { NextResponse } from "next/server";

import { listLegalElements, listMatters } from "@/lib/data-store";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function slugify(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "") || "unknown";
}

async function graphFromMatters() {
  const matters = await listMatters();
  const nodes: Array<{ id: string; group: string; label: string; matterId?: string }> = [];
  const links: Array<{ source: string; target: string; weight: number }> = [];
  const reliefSeen = new Set<string>();

  for (const m of matters) {
    nodes.push({ id: m.matterId, group: "matter", label: m.matterId, matterId: m.matterId });
    const caseType = m.caseType || "Unknown";
    const slug = slugify(caseType);
    if (!reliefSeen.has(slug)) {
      reliefSeen.add(slug);
      nodes.push({ id: slug, group: "relief", label: caseType });
    }
    links.push({ source: m.matterId, target: slug, weight: 1 });

    if (m.country) {
      const countrySlug = `country_${slugify(m.country)}`;
      if (!reliefSeen.has(countrySlug)) {
        reliefSeen.add(countrySlug);
        nodes.push({ id: countrySlug, group: "jurisdiction", label: m.country });
      }
      links.push({ source: m.matterId, target: countrySlug, weight: 0.8 });
    }

    try {
      const elements = await listLegalElements(m.matterId);
      for (const el of elements.slice(0, 3)) {
        const elSlug = `el_${slugify(el.element)}`;
        if (!reliefSeen.has(elSlug)) {
          reliefSeen.add(elSlug);
          nodes.push({ id: elSlug, group: "relief", label: el.element.slice(0, 40) });
        }
        links.push({ source: m.matterId, target: elSlug, weight: 0.5 });
      }
    } catch {
      // skip element edges when offline
    }
  }

  return { nodes, links, source: "airtable" as const };
}

export async function GET() {
  try {
    const local = await graphFromMatters();
    if (local.nodes.length > 0) {
      return NextResponse.json(local);
    }
  } catch {
    // fall through to API graph
  }

  try {
    const resp = await fetch(`${API}/agents/knowledge-map/graph`, { next: { revalidate: 30 } });
    if (!resp.ok) throw new Error(String(resp.status));
    return NextResponse.json(await resp.json());
  } catch {
    return NextResponse.json({
      nodes: [
        { id: "AOD-1001", group: "matter", label: "AOD-1001", matterId: "AOD-1001" },
        { id: "asylum", group: "relief", label: "Asylum" },
      ],
      links: [{ source: "AOD-1001", target: "asylum", weight: 1 }],
      fallback: true,
      insufficient: true,
    });
  }
}
