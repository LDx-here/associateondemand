import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

/** OAuth and email-link callback: exchange code for session cookies. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return NextResponse.redirect(`${origin}${next.startsWith("/") ? next : `/${next}`}`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback`);
}
