import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getSupabasePublicConfig } from "./env";

export async function createSupabaseServerClient() {
  const config = getSupabasePublicConfig();
  if (!config) return null;

  const cookieStore = await cookies();

  return createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // setAll from Server Components can throw; middleware refreshes sessions.
        }
      },
    },
  });
}

export async function getSupabaseSessionUser(): Promise<{ email: string; name: string | null } | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const rawName = meta?.full_name ?? meta?.name;
  const name = typeof rawName === "string" && rawName.trim() ? rawName.trim() : null;
  return { email: user.email, name };
}
