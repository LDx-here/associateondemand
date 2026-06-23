import { NextResponse } from "next/server";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function POST(req: Request) {
  let body: { matterId?: string; memo?: string; clientName?: string; aNumber?: string; caseTheme?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const memo = (body.memo ?? "").trim();
  const matterId = (body.matterId ?? "").trim();
  if (!memo || !matterId) {
    return NextResponse.json({ error: "matterId and memo are required" }, { status: 400 });
  }

  try {
    const upstream = await fetch(`${API}/agents/drafting/aos-brief-export`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        matter_id: matterId,
        memo_text: memo,
        client_name: body.clientName ?? matterId,
        a_number: body.aNumber ?? "",
        case_theme: body.caseTheme ?? "",
      }),
    });

    if (upstream.ok) {
      const buf = Buffer.from(await upstream.arrayBuffer());
      const headers = new Headers();
      const ct = upstream.headers.get("Content-Type");
      const cd = upstream.headers.get("Content-Disposition");
      if (ct) headers.set("Content-Type", ct);
      if (cd) headers.set("Content-Disposition", cd);
      return new NextResponse(buf, { status: 200, headers });
    }
    const err = await upstream.text();
    return NextResponse.json({ error: err || "Export failed" }, { status: upstream.status });
  } catch {
    return NextResponse.json({ error: "API unavailable" }, { status: 503 });
  }
}
