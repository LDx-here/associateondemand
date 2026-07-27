import { NextResponse } from "next/server";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function POST(req: Request) {
  let body: { summary?: string; forceHeuristic?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const summary = (body.summary ?? "").trim();
  if (!summary) {
    return NextResponse.json({ error: "summary is required" }, { status: 400 });
  }

  try {
    const resp = await fetch(`${API}/agents/aos/extract-facts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        summary,
        force_heuristic: body.forceHeuristic ?? false,
      }),
    });

    if (!resp.ok) {
      const { heuristicExtractAosFacts } = await import("@/lib/aos-fact-extract");
      const fallback = heuristicExtractAosFacts(summary);
      return NextResponse.json({
        ...fallback,
        llmFallback: true,
        error: "Fly API unavailable — used heuristic extract.",
      });
    }

    const data = (await resp.json()) as {
      fields?: Record<string, string>;
      paragraphSelections?: Record<string, string>;
      additionalNotes?: string;
      confidence?: string;
      extractionMode?: string;
      llmAvailable?: boolean;
      llmFallback?: boolean;
    };

    return NextResponse.json({
      fields: data.fields ?? {},
      paragraphSelections: data.paragraphSelections ?? {},
      additionalNotes: data.additionalNotes ?? "",
      confidence: data.confidence ?? "low",
      extractionMode: data.extractionMode ?? "heuristic",
      llmAvailable: Boolean(data.llmAvailable),
      llmFallback: Boolean(data.llmFallback),
    });
  } catch {
    const { heuristicExtractAosFacts } = await import("@/lib/aos-fact-extract");
    return NextResponse.json({
      ...heuristicExtractAosFacts(summary),
      llmFallback: true,
      error: "Network error — used heuristic extract.",
    });
  }
}
