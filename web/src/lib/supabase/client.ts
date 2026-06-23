import { createBrowserClient } from "@supabase/ssr";

import { getSupabasePublicConfig } from "./env";

export function createSupabaseBrowserClient() {
  const config = getSupabasePublicConfig();
  if (!config) {
    throw new Error("Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }
  return createBrowserClient(config.url, config.anonKey);
}
