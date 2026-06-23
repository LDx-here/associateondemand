import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { updateSupabaseSession } from "@/lib/supabase/middleware";
import { shouldEnforceAuth } from "@/lib/supabase/env";

export async function middleware(req: NextRequest) {
  if (!shouldEnforceAuth()) {
    return NextResponse.next();
  }

  return updateSupabaseSession(req);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
