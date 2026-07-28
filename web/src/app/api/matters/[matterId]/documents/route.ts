import { NextResponse } from "next/server";

import { createDocumentForMatter, listDocumentsForMatter } from "@/lib/data-store";

type Ctx = { params: Promise<{ matterId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { matterId } = await ctx.params;
  return NextResponse.json({ documents: await listDocumentsForMatter(matterId) });
}

/** Register document metadata after Fly OCR (or metadata-only uploads) so Sheets mode lists the row. */
export async function POST(req: Request, ctx: Ctx) {
  const { matterId } = await ctx.params;
  let body: {
    title?: string;
    category?: string;
    documentId?: string;
    uploadedBy?: string;
    ocrStatus?: string;
    piiTier?: string;
    fileType?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const title = (body.title ?? "").trim();
  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  try {
    const document = await createDocumentForMatter(matterId, {
      title,
      category: (body.category ?? "uncategorized").trim() || "uncategorized",
      documentId: body.documentId?.trim() || undefined,
      uploadedBy: body.uploadedBy?.trim() || "Attorney",
      ocrStatus: body.ocrStatus,
      piiTier: body.piiTier,
      fileType: body.fileType,
    });
    return NextResponse.json({ ok: true, document });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Registration failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
