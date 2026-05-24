import { NextResponse } from "next/server";

import { listMatters, useDemoMode } from "@/lib/data-store";

export async function GET() {
  const matters = await listMatters();
  return NextResponse.json({ matters, demoMode: useDemoMode() });
}
