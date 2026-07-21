import { NextResponse } from "next/server";

import { shouldEnforceAuth } from "@/lib/supabase/env";
import { getSupabaseSessionUser } from "@/lib/supabase/server";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type Ctx = { params: Promise<{ matterId: string; documentId: string }> };

/** Authenticated proxy — streams PDF/image from Fly intake storage. */
export async function GET(req: Request, ctx: Ctx) {
  if (shouldEnforceAuth()) {
    const user = await getSupabaseSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const { matterId } = await ctx.params;
  const url = new URL(req.url);
  const postgresId = url.searchParams.get("postgresId")?.trim();
  const title = url.searchParams.get("title")?.trim();

  let upstreamUrl: string | null = null;

  if (postgresId) {
    upstreamUrl = `${API}/intake/documents/${encodeURIComponent(postgresId)}/file?matter_id=${encodeURIComponent(matterId)}`;
  } else if (title) {
    try {
      const resolveResp = await fetch(
        `${API}/intake/documents/resolve?matter_id=${encodeURIComponent(matterId)}&title=${encodeURIComponent(title)}`,
      );
      if (!resolveResp.ok) {
        return NextResponse.json({ error: "Document not found" }, { status: 404 });
      }
      const resolved = (await resolveResp.json()) as {
        found?: boolean;
        file_available?: boolean;
        document_id?: string;
      };
      if (!resolved.found || !resolved.file_available || !resolved.document_id) {
        return NextResponse.json({ error: "File not available on server" }, { status: 404 });
      }
      upstreamUrl = `${API}/intake/documents/${encodeURIComponent(resolved.document_id)}/file?matter_id=${encodeURIComponent(matterId)}`;
    } catch {
      return NextResponse.json({ error: "Document service unavailable" }, { status: 503 });
    }
  } else {
    return NextResponse.json({ error: "title or postgresId is required" }, { status: 400 });
  }

  try {
    const upstream = await fetch(upstreamUrl);
    if (!upstream.ok) {
      return NextResponse.json({ error: "File not available" }, { status: upstream.status });
    }

    const buf = Buffer.from(await upstream.arrayBuffer());
    const headers = new Headers();
    const ct = upstream.headers.get("Content-Type");
    const cd = upstream.headers.get("Content-Disposition");
    if (ct) headers.set("Content-Type", ct);
    headers.set("Content-Disposition", cd ?? `inline; filename="${title ?? "document"}"`);
    headers.set("Cache-Control", "private, max-age=3600");
    return new NextResponse(buf, { status: 200, headers });
  } catch {
    return NextResponse.json({ error: "Document service unavailable" }, { status: 503 });
  }
}

export async function HEAD(req: Request, ctx: Ctx) {
  const getResp = await GET(req, ctx);
  return new NextResponse(null, {
    status: getResp.status,
    headers: getResp.headers,
  });
}
