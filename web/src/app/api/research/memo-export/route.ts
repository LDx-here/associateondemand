import { NextResponse } from "next/server";

import { recordAssignmentExport } from "@/lib/record-assignment-export";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/** Proxy research memo export: prefers FastAPI .docx (BUILD_SPEC §11), surfaces linter 422. */
export async function POST(req: Request) {
  let body: { matterId?: string; memo?: string; format?: "docx" | "txt"; assignmentId?: string };
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
      await recordAssignmentExport(body.assignmentId, format === "txt" ? "research-memo-txt" : "research-memo-docx");
      return new NextResponse(buf, { status: 200, headers });
    }

    if (upstream.status === 422) {
      try {
        const err = (await upstream.json()) as { detail?: { message?: string; issues?: string[] } | string };
        const detail = typeof err.detail === "object" ? err.detail : { message: String(err.detail) };
        return NextResponse.json(
          {
            error: detail.message ?? "Document linter failed",
            issues: detail.issues ?? [],
          },
          { status: 422 },
        );
      } catch {
        return NextResponse.json({ error: "Document linter failed" }, { status: 422 });
      }
    }
  } catch {
    /* local fallback below */
  }

  const safe = matterId.replace(/[^a-zA-Z0-9-_]/g, "_") || "memo";
  const filename = `${safe}_research_memo.txt`;

  await recordAssignmentExport(body.assignmentId, "research-memo-txt-fallback");

  return new NextResponse(memo, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
