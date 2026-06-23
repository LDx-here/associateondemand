import { NextResponse } from "next/server";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/** Proxy research memo export: prefers FastAPI .docx (BUILD_SPEC §11), else plain TXT. */
export async function POST(req: Request) {
  let body: { matterId?: string; memo?: string; format?: "docx" | "txt" };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const memo = (body.memo ?? "").trim();
  if (!memo) {
    return NextResponse.json({ error: "memo is required" }, { status: 400 });
  }

  const matterId = (body.matterId ?? "").trim();
  const format = body.format === "txt" ? "txt" : "docx";

  try {
    const upstream = await fetch(`${API}/agents/research/memo-export`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        matter_id: matterId,
        memo_text: memo,
        format,
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
  } catch {
    /* local fallback */
  }

  const safe = matterId.replace(/[^a-zA-Z0-9-_]/g, "_") || "memo";
  const filename = `${safe}_research_memo.txt`;

  return new NextResponse(memo, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
