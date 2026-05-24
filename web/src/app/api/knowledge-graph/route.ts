import { NextResponse } from "next/server";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function GET() {
  try {
    const resp = await fetch(`${API}/agents/knowledge-map/graph`, { next: { revalidate: 30 } });
    if (!resp.ok) throw new Error(String(resp.status));
    return NextResponse.json(await resp.json());
  } catch {
    return NextResponse.json({
      nodes: [
        { id: "AOD-1001", group: "matter", label: "AOD-1001" },
        { id: "asylum", group: "relief", label: "Asylum" },
      ],
      links: [{ source: "AOD-1001", target: "asylum", weight: 1 }],
      fallback: true,
    });
  }
}
