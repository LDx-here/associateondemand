import { NextResponse } from "next/server";

import { isDemoMode } from "@/lib/data-store";

export async function GET() {
  return NextResponse.json({
    ok: true,
    demoMode: isDemoMode(),
    service: "aod-web",
  });
}
