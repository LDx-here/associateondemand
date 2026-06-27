import { NextResponse } from "next/server";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/** Proxy citation verification package as a ZIP download. */
export async function POST(req: Request) {
  let body: { matterId?: string; memo?: string; matterLabel?: string };
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

  try {
    const upstream = await fetch(`${API}/agents/drafting/citation-package/download`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        matter_id: matterId,
        memo_text: memo,
        matter_label: body.matterLabel ?? matterId,
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

    let detail = "Citation package download failed";
    try {
      const err = (await upstream.json()) as { detail?: string | { message?: string } };
      if (typeof err.detail === "string") detail = err.detail;
      else if (err.detail && typeof err.detail === "object" && err.detail.message) {
        detail = err.detail.message;
      }
    } catch {
      detail = (await upstream.text()) || detail;
    }
    return NextResponse.json({ error: detail }, { status: upstream.status });
  } catch {
    return NextResponse.json({ error: "API unavailable" }, { status: 503 });
  }
}
